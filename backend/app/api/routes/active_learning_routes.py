from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException

from app.infrastructure.utils.dependencies import get_active_learning_service, get_current_user
from app.application.services.active_learning_service import ActiveLearningService

router = APIRouter(dependencies=[Depends(get_current_user)]) 

@router.get("/api/tasks/{task_id}/active-learning/next")
async def get_next_al_batch(
    task_id: str,
    model_id: str,
    service: Annotated[ActiveLearningService, Depends(get_active_learning_service)],
    batch_size: int = 10,
):
    try:
        files = await service.get_next_batch(task_id, model_id, batch_size)
        return files
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
