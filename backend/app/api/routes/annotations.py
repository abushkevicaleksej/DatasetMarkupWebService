from pydantic import BaseModel
from typing import List, Optional, Annotated

from fastapi import APIRouter, HTTPException, Depends
import httpx
from PIL import Image

from app.infrastructure.utils.dependencies import get_annotation_service, get_model_service

from app.application.services.annotation_service import AnnotationService
from app.application.services.model_service import ModelService

router = APIRouter()

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
async def create_annotation(
    annotation_data: AnnotationCreateRequest, 
    service: Annotated[AnnotationService, Depends(get_annotation_service)] 
):
    try:
        bboxes_dict = [bbox.dict() for bbox in annotation_data.bounding_boxes]
        
        annotation = service.create_annotation(
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
async def get_annotations_for_file(
    file_id: str, 
    service: Annotated[AnnotationService, Depends(get_annotation_service)]
):
    try:
        annotations = service.get_annotations_for_file(file_id)
        
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
async def update_bounding_box(
    bbox_id: str, 
    update_data: BoundingBoxUpdate, 
    service: Annotated[AnnotationService, Depends(get_annotation_service)]
):
    try:
        updates = update_data.dict(exclude_unset=True)
        
        if not updates:
            return {"message": "No data provided for update"}

        success = service.update_bounding_box(
            bbox_id=bbox_id, 
            update_data=updates
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Bounding box not found")
            
        return {"message": "Bounding box updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(
    annotation_id: str, 
    service: Annotated[AnnotationService, Depends(get_annotation_service)]
):
    try:
        success = service.delete_annotation(annotation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Annotation not found")
            
        return {"message": "Annotation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/annotations/{annotation_id}/bbox/{bbox_id}")
async def delete_bounding_box(
    annotation_id: str, 
    bbox_id: str, 
    service: Annotated[AnnotationService, Depends(get_annotation_service)]
):
    try:
        success = service.delete_bounding_box(bbox_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Bounding box not found")
            
        return {"message": "Bounding box deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.post("/annotations/smart-bbox")
async def create_smart_annotation(
    data: SmartBBoxRequest, 
    service: Annotated[ModelService, Depends(get_model_service)]
):
    file_info = service.file_repository.get_by_id(data.file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")

    with Image.open(file_info.file_path) as img:
        img_w, img_h = img.size

    SAM2_URL = "http://localhost:5000/annotate"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_info.file_path, "rb") as f:
                files = {"file": (file_info.original_filename, f, file_info.mime_type)}
                payload = {"x": data.x, "y": data.y}
                sam_response = await client.post(SAM2_URL, files=files, data=payload)
            
            if sam_response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"SAM2 error: {sam_response.text}")
            
            result = sam_response.json()
            
            if not result.get("bbox"):
                raise HTTPException(status_code=400, detail="Object not detected")

            x_min, y_min, x_max, y_max = result["bbox"]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Service error: {str(e)}")

    norm_x = x_min / img_w
    norm_y = y_min / img_h
    norm_w = (x_max - x_min) / img_w
    norm_h = (y_max - y_min) / img_h

    bbox_data = [{
        "x": norm_x,
        "y": norm_y,
        "width": norm_w,
        "height": norm_h,
        "label": "auto-detected",
        "confidence": result.get("score", 1.0)
    }]
    
    new_ann = service.annotation_repository.create_annotation(
        file_id=data.file_id,
        task_id=data.task_id,
        bounding_boxes=bbox_data
    )
    
    created_bbox = new_ann.bounding_boxes[0]
    return {
        "id": str(created_bbox.id),
        "x": norm_x,
        "y": norm_y,
        "width": norm_w,
        "height": norm_h,
        "label": "auto-detected",
        "color": "#3B82F6",
        "isSelected": False
    }