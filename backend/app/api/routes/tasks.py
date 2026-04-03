from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

from app.domain.entities.annotation import BoundingBox
from app.application.services.task_service import TaskService
from app.infrastructure.database import get_db


router = APIRouter()
task_service = TaskService()


BASE_DIR = Path(__file__).parent.parent.parent


class TaskCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    file_ids: Optional[List[str]] = None


class TaskResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    file_count: int
    annotation_count: int
    created_at: str
    updated_at: str


@router.get("/api/tasks", response_class=JSONResponse)
async def get_tasks(db: Session = Depends(get_db)):
    from app.infrastructure.repositories.task_repository import TaskRepository

    task_repository = TaskRepository(db)
    tasks = task_repository.get_all()

    response = []
    for task in tasks:
        response.append(
            TaskResponse(
                id=str(task.id),
                name=str(task.name),
                description=str(task.description),
                status=str(task.status),
                file_count=len(task.files),
                annotation_count=len(task.annotations),
                created_at=task.created_at.isoformat(),
                updated_at=task.updated_at.isoformat()
            )
        )
    return response


@router.post("/api/tasks", response_model=TaskResponse)
async def create_task(task_data: TaskCreateRequest, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.task_repository import TaskRepository

    try:
        task_repository = TaskRepository(db)
        task = task_repository.create(
            name=task_data.name,
            description=task_data.description,
            file_ids=task_data.file_ids or []
        )

        return TaskResponse(
            id=task.id,
            name=task.name,
            description=task.description,
            status=task.status,
            file_count=len(task.files),
            annotation_count=0,
            created_at=task.created_at.isoformat(),
            updated_at=task.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/tasks/{task_id}/files")
async def get_task_files(task_id: str, db: Session = Depends(get_db)):
    from app.domain.models import File, Task
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    files = db.query(File).filter(File.task_id == task_id).all()
    
    return [
        {
            "id": file.id,
            "original_filename": file.original_filename,
            "file_size": file.file_size,
            "file_path": file.file_path,
            "mime_type": file.mime_type
        }
        for file in files
    ]


@router.get("/api/tasks/{task_id}/annotations")
async def get_task_annotations(task_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.task_repository import TaskRepository

    try:
        task_repository = TaskRepository(db)
        task = task_repository.get_by_id(task_id)
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        annotations = task.annotations
        
        return [
            {
                "id": str(annotation.id),
                "label": annotation.label,
                "type": annotation.annotation_type,
                "visible": True,
                "color": annotation.color or "#3b82f6"
            }
            for annotation in annotations
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.task_repository import TaskRepository
    
    try:
        task_repository = TaskRepository(db)
        success = task_repository.delete(task_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
            
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
