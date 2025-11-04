from typing import List
from pathlib import Path

from spacy.cli.download import download_model
from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from app.domain.ml_schemas import (
    MLModelCreate, MLModelResponse, PredictionRequest,
    PredictionResponse, OnlineLearningRequest, TrainingSessionResponse
)
from app.infrastructure.database import get_db
from app.application.services.yolo_service import yolo_service
from app.infrastructure.repositories.ml_model_repository import MLModelRepository, PredictionRepository, TrainingSessionRepository
from app.infrastructure.repositories.file_repository import FileRepository

router = APIRouter()

@router.get("/models", response_model=List[MLModelResponse])
async def get_models(db: Session = Depends(get_db)):
    model_repo = MLModelRepository(db)
    models = model_repo.get_active_models()
    return models


@router.get("/models/{model_id}", response_model=MLModelResponse)
async def get_model(model_id: str, db: Session = Depends(get_db)):
    model_repo = MLModelRepository(db)
    model = model_repo.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.post("/models", response_model=MLModelResponse)
async def create_model(model_data: MLModelCreate, db: Session = Depends(get_db)):
    model_repo = MLModelRepository(db)

    try:
        model_path = Path(model_data.model_path)
        if not model_path.exists():
            # raise HTTPException(status_code=400, detail="Model file not found")
            model = model_repo.create_model(model_data.dict(), download_model=True)
        else:
            model = model_repo.create_model(model_data.dict())
        return model
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/predict", response_model=List[PredictionResponse])
async def predict(prediction_request: PredictionRequest, db: Session = Depends(get_db)):
    model_repo = MLModelRepository(db)
    file_repo = FileRepository(db)
    prediction_repo = PredictionRepository(db)

    try:
        file_ids = prediction_request.file_ids[:prediction_request.max_predictions]

        files = file_repo.get_by_ids(file_ids)
        if not files:
            raise HTTPException(status_code=404, detail="No files found")

        results = []

        for file_info in files:
            try:
                predictions, processing_time = await yolo_service.predict_single_image(
                    prediction_request.model_id,
                    Path(file_info.file_path),
                    prediction_request.confidence_threshold
                )

                db_prediction = prediction_repo.create_prediction({
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

                prediction_repo.create_bounding_boxes(db_prediction.id, bboxes_data)

                results.append(PredictionResponse(
                    file_id=file_info.id,
                    predictions=predictions,
                    processing_time=processing_time,
                    total_predictions=len(predictions)
                ))

            except Exception as e:
                print(f"Error processing file {file_info.id}: {e}")
                continue

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/online-learning")
async def start_online_learning(
        learning_request: OnlineLearningRequest,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db)
):
    try:
        session_id = await yolo_service.online_learning(
            learning_request.model_id,
            learning_request.task_id,
            learning_request.epochs,
            learning_request.batch_size,
            learning_request.learning_rate
        )

        return {"session_id": session_id, "status": "started"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Online learning failed: {str(e)}")


@router.get("/training-sessions/{session_id}", response_model=TrainingSessionResponse)
async def get_training_session(session_id: str, db: Session = Depends(get_db)):
    training_repo = TrainingSessionRepository(db)
    session = training_repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    return session


@router.post("/models/{model_id}/activate")
async def activate_model(model_id: str, db: Session = Depends(get_db)):
    model_repo = MLModelRepository(db)
    model = model_repo.update_model(model_id, {'is_active': True})
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"message": "Model activated"}


@router.post("/models/{model_id}/deactivate")
async def deactivate_model(model_id: str, db: Session = Depends(get_db)):
    model_repo = MLModelRepository(db)
    model = model_repo.update_model(model_id, {'is_active': False})
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"message": "Model deactivated"}