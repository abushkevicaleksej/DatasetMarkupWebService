from typing import List, Annotated
from pathlib import Path
import logging

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from app.domain.ml_schemas import (
    MLModelCreate, 
    MLModelValidate, 
    MLModelResponse, 
    PredictionRequest,
    PredictionResponse, 
    OnlineLearningRequest, 
    TrainingSessionResponse
)

from app.infrastructure.utils.dependencies import get_model_service, get_export_service, get_current_user

from app.application.services.export_service import ExportService
from app.application.services.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_current_user)]) 

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
    service: Annotated[ModelService, Depends(get_model_service)]
):
    response = await service.validate_model(model_data)

    if response.status_code == 422:
        raise HTTPException(status_code=400, detail=response.json())

    return response.json()

@router.post("/predict", response_model=List[PredictionResponse])
async def predict(
    prediction_request: PredictionRequest,
    service: Annotated[ModelService, Depends(get_model_service)]
):
    try:
        return await service.predict_and_save(prediction_request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/online-learning")
async def start_online_learning(
    learning_request: OnlineLearningRequest,
    background_tasks: BackgroundTasks,
    export_service: Annotated[ExportService, Depends(get_export_service)],
    model_service: Annotated[ModelService, Depends(get_model_service)]
):
    try:
        session_id = await model_service.start_online_learning_background(
            request=learning_request,
            export_service=export_service,
            background_tasks=background_tasks
        )
        return {"session_id": session_id, "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start online learning: {str(e)}")

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
