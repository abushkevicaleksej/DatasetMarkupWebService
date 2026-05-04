from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends

from app.domain.entities.annotation import AnnotationCreateRequest, SmartBBoxRequest, BoundingBoxUpdate

from app.infrastructure.utils.dependencies import get_annotation_service

from app.application.services.annotation_service import AnnotationService

router = APIRouter()

@router.post("/annotations")
async def create_annotation(
    annotation_data: AnnotationCreateRequest,
    service: Annotated[AnnotationService, Depends(get_annotation_service)]
):
    try:
        annotation = service.create_annotation(annotation_data)
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


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
    service: Annotated[AnnotationService, Depends(get_annotation_service)]
):
    try:
        result = await service.create_smart_annotation(
            file_id=data.file_id,
            task_id=data.task_id,
            x=data.x,
            y=data.y
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
