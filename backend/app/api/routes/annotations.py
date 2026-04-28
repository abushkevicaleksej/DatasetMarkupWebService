import json

from uuid import UUID
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, Depends
import httpx
from faststream.rabbit import RabbitBroker
from PIL import Image

from app.application.services.annotation_service import AnnotationService

from app.domain.entities.job_messages_model import SmartBBoxTaskMessage

from app.infrastructure.database import get_db
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.repositories.annotation_repository import AnnotationRepository
from app.infrastructure.repositories.async_job_repository import AsyncJobRepository

router = APIRouter()
broker = None
annotation_service = AnnotationService()

def get_broker() -> RabbitBroker:
    return broker

class BoundingBoxCreate(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str = "object"
    confidence: float = 1.0

class BoundingBoxUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    label: Optional[str] = None

class AnnotationCreateRequest(BaseModel):
    file_id: str
    task_id: str
    bounding_boxes: List[BoundingBoxCreate]

class SmartBBoxRequest(BaseModel):
    file_id: str
    task_id: str
    x: int
    y: int

@router.post("/annotations")
async def create_annotation(annotation_data: AnnotationCreateRequest, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.annotation_repository import AnnotationRepository
    
    try:
        annotation_repository = AnnotationRepository(db)
        
        bboxes_dict = [bbox.dict() for bbox in annotation_data.bounding_boxes]
        
        annotation = annotation_repository.create_annotation(
            file_id=annotation_data.file_id,
            task_id=annotation_data.task_id,
            bounding_boxes=bboxes_dict
        )
        
        return {
            "id": annotation.id,
            "file_id": annotation.file_id,
            "task_id": annotation.task_id,
            "bounding_boxes": [
                {
                    "id": bbox.id,
                    "x": bbox.x,
                    "y": bbox.y,
                    "width": bbox.width,
                    "height": bbox.height,
                    "label": bbox.label,
                    "confidence": bbox.confidence
                }
                for bbox in annotation.bounding_boxes
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/annotations/file/{file_id}")
async def get_annotations_for_file(file_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.annotation_repository import AnnotationRepository
    
    try:
        annotation_repository = AnnotationRepository(db)
        annotations = annotation_repository.get_annotations_for_file(file_id)
        
        response = []
        for annotation in annotations:
            response.append({
                "id": annotation.id,
                "file_id": annotation.file_id,
                "task_id": annotation.task_id,
                "bounding_boxes": [
                    {
                        "id": bbox.id,
                        "x": bbox.x,
                        "y": bbox.y,
                        "width": bbox.width,
                        "height": bbox.height,
                        "label": bbox.label,
                        "confidence": bbox.confidence
                    }
                    for bbox in annotation.bounding_boxes
                ],
                "created_at": annotation.created_at.isoformat()
            })
        
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/annotations/bbox/{bbox_id}")
async def update_bounding_box(bbox_id: str, update_data: BoundingBoxUpdate, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.annotation_repository import AnnotationRepository
    
    try:
        annotation_repository = AnnotationRepository(db)
        
        updates = update_data.dict(exclude_unset=True)
        
        if not updates:
            return {"message": "No data provided for update"}

        success = annotation_repository.update_bounding_box(
            bbox_id=bbox_id, 
            update_data=updates
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Bounding box not found")
            
        return {"message": "Bounding box updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(annotation_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.annotation_repository import AnnotationRepository
    
    try:
        annotation_repository = AnnotationRepository(db)
        success = annotation_repository.delete_annotation(annotation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Annotation not found")
            
        return {"message": "Annotation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/annotations/{annotation_id}/bbox/{bbox_id}")
async def delete_bounding_box(annotation_id: str, bbox_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.annotation_repository import AnnotationRepository
    
    try:
        annotation_repository = AnnotationRepository(db)
        success = annotation_repository.delete_bounding_box(bbox_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Bounding box not found")
            
        return {"message": "Bounding box deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.post("/annotations/smart-bbox")
async def create_smart_annotation(
    data: SmartBBoxRequest, 
    db: Session = Depends(get_db),
    broker: RabbitBroker = Depends(get_broker)
):
    
    from app.infrastructure.repositories.file_repository import FileRepository
    from app.infrastructure.repositories.annotation_repository import AnnotationRepository
    
    file_repo = FileRepository(db)
    file_info = file_repo.get_by_id(data.file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")

    job_repo = AsyncJobRepository(db)
    input_params = {
        "file_id": data.file_id,
        "task_id": data.task_id,
        "x": data.x,
        "y": data.y,
        "file_path": str(file_info.file_path)
    }
    job = job_repo.create_job(type="smart_bbox", input_params=input_params)

    msg = SmartBBoxTaskMessage(
        job_id=job.id,
        file_id=data.file_id,
        task_id=data.task_id,
        x=data.x,
        y=data.y,
        file_path=str(file_info.file_path)
    )
    await broker.publish(msg, queue="smart_bbox")

    return {
        "job_id": job.id,
        "status": job.status.value,
        "message": "Smart bbox request accepted"
    }

@router.get("/annotations/smart-bbox/{job_id}/status")
async def get_smart_bbox_status(job_id: str, db: Session = Depends(get_db)):
    job_repo = AsyncJobRepository(db)
    job = job_repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job.id,
        "status": job.status.value,
        "result": json.loads(job.result) if job.result else None,
        "error": job.error_message
    }
