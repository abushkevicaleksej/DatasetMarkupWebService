from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.domain.entities.annotation import BoundingBox
from app.application.services.task_service import TaskService

router = APIRouter()
task_service = TaskService()

BASE_DIR = Path(__file__).parent.parent.parent

@router.get("/tasks", response_class=HTMLResponse)
async def tasks_page():
    html_path = BASE_DIR / "static" / "templates" / "tasks.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()

@router.get("/api/tasks")
async def get_tasks():
    tasks = task_service.get_all_tasks()
    return {
        "tasks": [
            {
                "id": str(task.id),
                "name": task.name,
                "description": task.description,
                "status": task.status,
                "file_count": len(task.files),
                "annotation_count": len(task.annotations),
                "created_at": task.created_at.isoformat(),
                "updated_at": task.updated_at.isoformat()
            }
            for task in tasks
        ]
    }


@router.post("/api/tasks")
async def create_task(task_data: dict):
    try:
        # В реальной реализации files будут приходить как список ID
        # и загружаться из хранилища
        files = []

        task = task_service.create_task(
            name=task_data["name"],
            description=task_data["description"],
            files=files
        )

        return {
            "id": str(task.id),
            "name": task.name,
            "status": task.status
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/tasks/{task_id}/annotations")
async def add_annotation(task_id: str, annotation_data: dict):
    try:
        bounding_boxes = [
            BoundingBox(**bbox) for bbox in annotation_data["bounding_boxes"]
        ]

        annotation = task_service.add_annotation(
            UUID(task_id),
            UUID(annotation_data["file_id"]),
            bounding_boxes
        )

        return {
            "id": str(annotation.id),
            "file_id": str(annotation.file_id),
            "bounding_boxes_count": len(annotation.bounding_boxes)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/api/annotations/{annotation_id}")
async def delete_annotation(annotation_id: str):
    success = task_service.delete_annotation(UUID(annotation_id))
    if not success:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"message": "Annotation deleted"}