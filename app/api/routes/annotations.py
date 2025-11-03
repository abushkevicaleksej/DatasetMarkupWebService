from fastapi import APIRouter, HTTPException
from uuid import UUID
from app.application.services.annotation_service import annotation_service

router = APIRouter()


@router.post("/annotations")
async def create_annotation(annotation_data: dict):
    try:
        file_id = UUID(annotation_data["file_id"])
        bounding_boxes = annotation_data["bounding_boxes"]

        annotation = annotation_service.create_annotation(file_id, bounding_boxes)

        return {
            "id": str(annotation.id),
            "file_id": str(annotation.file_id),
            "bounding_boxes": [bbox.to_dict() for bbox in annotation.bounding_boxes]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/annotations/file/{file_id}")
async def get_annotations_for_file(file_id: str):
    try:
        file_uuid = UUID(file_id)
        annotations = annotation_service.get_annotations_for_file(file_uuid)

        return [annotation.to_dict() for annotation in annotations]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/annotations/{annotation_id}/bbox/{bbox_id}")
async def delete_bounding_box(annotation_id: str, bbox_id: str):
    try:
        bbox_uuid = UUID(bbox_id)
        success = annotation_service.delete_bounding_box(bbox_uuid)

        if not success:
            raise HTTPException(status_code=404, detail="Bounding box not found")

        return {"message": "Bounding box deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))