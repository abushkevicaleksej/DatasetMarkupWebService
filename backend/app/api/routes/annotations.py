from uuid import UUID
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, Depends

from app.application.services.annotation_service import AnnotationService
from app.infrastructure.database import get_db

router = APIRouter()
annotation_service = AnnotationService()

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