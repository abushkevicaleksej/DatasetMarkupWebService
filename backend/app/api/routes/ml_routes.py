from typing import List, Annotated
from pathlib import Path
import logging
import uuid
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
import httpx

from app.domain.ml_schemas import (
    MLModelCreate, MLModelValidate, MLModelResponse, PredictionRequest,
    PredictionResponse, OnlineLearningRequest, TrainingSessionResponse
)

from app.infrastructure.utils.dependencies import get_model_service, get_export_service

from app.application.services.export_service import ExportService
from app.application.services.model_service import ModelService

from app.infrastructure.repositories.ml_model_repository import (
    MLModelRepository, PredictionRepository, TrainingSessionRepository
    )
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.repositories.annotation_repository import AnnotationRepository

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/models", response_model=List[MLModelResponse])
async def get_models(service: Annotated[ModelService, Depends(get_model_service)]):
    models = service.model_repository.get_models()
    return models

@router.get("/models/{model_id}", response_model=MLModelResponse)
async def get_model(
    model_id: str, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    model = service.model_repository.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model

@router.delete("/models/{model_id}")
async def delete_model(
    model_id: str, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    try:
        success = service.model_repository.delete_model(model_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Model not found")
            
        return {"message": "Model deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/models", response_model=MLModelResponse)
async def create_model(
    model_data: MLModelCreate, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    try:
        model_path = Path(model_data.model_path)
        if not model_path.exists():
            raise HTTPException(status_code=400, detail="Model file not found")
        
        model = service.model_repository.create_model(model_data.dict())
        return model
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/models/validate")
async def validate_model(
    model_data: MLModelValidate, 
):
    model_path = Path(model_data.model_path)
    if not model_path.exists():
        raise HTTPException(status_code=400, detail="Model file not found")
    
    validation_url = "http://localhost:3033/validate"

    async with httpx.AsyncClient() as client:
        with open(model_path, "rb") as f:
            files = {"model_file": f}
            data = {"model_type": model_data.framework.value}
            response = await client.post(validation_url, files=files, data=data)
    
        if response.status_code == 422:
            raise HTTPException(status_code=400, detail=response.json())
    
        return response.json()

@router.post("/predict", response_model=List[PredictionResponse])
async def predict(
    prediction_request: PredictionRequest, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    try:
        file_ids = prediction_request.file_ids[:prediction_request.max_predictions]

        files = service.file_repository.get_by_ids(file_ids)
        if not files:
            raise HTTPException(status_code=404, detail="No files found")

        results = []

        for file_info in files:
            try:
                predictions, processing_time = await service.model_repository.predict_single_image(
                    prediction_request.model_id,
                    Path(file_info.file_path),
                    prediction_request.confidence_threshold
                )

                db_prediction = service.prediction_repository.create_prediction({
                    'model_id': prediction_request.model_id,
                    'file_id': file_info.id,
                    'confidence_threshold': prediction_request.confidence_threshold,
                    'total_predictions': len(predictions),
                    'processing_time': processing_time
                })

                bboxes_data = []
                for pred in predictions:
                    bboxes_data.append({
                        'x': pred.x,
                        'y': pred.y,
                        'width': pred.width,
                        'height': pred.height,
                        'label': pred.label,
                        'confidence': pred.confidence
                    })

                service.prediction_repository.create_bounding_boxes(db_prediction.id, bboxes_data)

                if prediction_request.task_id:
                    service.annotation_repository.create_annotation(
                        file_id=file_info.id,
                        task_id=prediction_request.task_id,
                        bounding_boxes=bboxes_data
                    )

                results.append(PredictionResponse(
                    file_id=file_info.id,
                    predictions=predictions,
                    processing_time=processing_time,
                    total_predictions=len(predictions)
                ))

            except Exception as e:
                continue

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/online-learning")
async def start_online_learning(
    learning_request: OnlineLearningRequest,
    background_tasks: BackgroundTasks,
    export_service: Annotated[ExportService, Depends(get_export_service)],
    model_service: Annotated[ModelService, Depends(get_model_service)]
):
    session_id = str(uuid.uuid4())

    try:
        base_train_dir = Path("training_data") / session_id
        yaml_path = export_service.prepare_dataset_for_training(
            learning_request.task_id,
            str(base_train_dir)
        )
    except Exception as e:
        logger.error("Failed to prepare dataset for session %s: %s", session_id, str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to prepare dataset: {str(e)}")

    logger.info(
        "Starting online learning: model=%s, task=%s, epochs=%d, batch=%d, lr=%f, session=%s",
        learning_request.model_id, learning_request.task_id,
        learning_request.epochs, learning_request.batch_size,
        learning_request.learning_rate, session_id
    )

    async def _run_training_with_error_handling():
        try:
            await model_service.online_learning(
                model_id=learning_request.model_id,
                task_id=learning_request.task_id,
                session_id=session_id,
                epochs=learning_request.epochs,
                batch_size=learning_request.batch_size,
                learning_rate=learning_request.learning_rate,
                dataset_config=yaml_path,
            )
        except Exception as e:
            logger.error(
                "Background training failed for session %s: %s",
                session_id, str(e), exc_info=True
            )
            try:
                model_service.training_session_repository.update_session(session_id, {
                    'status': 'failed',
                    'end_time': datetime.now(),
                    'error_message': str(e)
                })
            except Exception:
                pass

    background_tasks.add_task(_run_training_with_error_handling)

    return {"session_id": session_id, "status": "started"}

@router.get("/training-sessions/{session_id}", response_model=TrainingSessionResponse)
async def get_training_session(
    session_id: str, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    session = service.training_session_repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    return session

@router.post("/models/{model_id}/activate")
async def activate_model(
    model_id: str, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    model = service.model_repository.update_model(model_id, {'is_active': True})
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"message": "Model activated"}

@router.post("/models/{model_id}/deactivate")
async def deactivate_model(
    model_id: str, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    model = service.model_repository.update_model(model_id, {'is_active': False})
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"message": "Model deactivated"}
