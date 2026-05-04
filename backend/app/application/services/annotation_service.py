from PIL import Image
import httpx

from app.domain.models import User
from app.infrastructure.repositories.annotation_repository import AnnotationRepository
from app.infrastructure.repositories.file_repository import FileRepository
from app.domain.entities.annotation import Annotation, AnnotationCreateRequest

from app.core.config import settings

class AnnotationService:
    def __init__(
            self, 
            annotation_repository: AnnotationRepository, 
            file_repository: FileRepository, 
            current_user: User
        ):
        self.annotation_repository = annotation_repository
        self.file_repository = file_repository
        self.current_user = current_user

    def _check_file_ownership(self, file_id: str):
        file = self.file_repository.get_by_id(file_id)
        if not file:
            raise ValueError("File not found")
        if self.current_user.role != "admin" and file.user_id != self.current_user.id:
            raise ValueError("Access denied to this file")
        return file

    def create_annotation(self, request: AnnotationCreateRequest) -> Annotation:
        self._check_file_ownership(request.file_id)
        bboxes_dicts = [
            {
                "id": None,
                "x": b.x,
                "y": b.y,
                "width": b.width,
                "height": b.height,
                "label": b.label,
                "confidence": b.confidence
            }
            for b in request.bounding_boxes
        ]

        annotation = self.annotation_repository.create_annotation(
            file_id=request.file_id,
            task_id=request.task_id,
            bounding_boxes=bboxes_dicts
        )

        if not annotation.bounding_boxes:
            raise ValueError("Annotation must contain at least one bounding box")

        return annotation

    async def create_smart_annotation(self, file_id: str, task_id: str, x: float, y: float) -> dict:
        self._check_file_ownership(file_id)
        file_info = self.file_repository.get_by_id(file_id)
        if not file_info:
            raise ValueError("File not found")

        with Image.open(file_info.file_path) as img:
            img_w, img_h = img.size

        bbox_pixels, score = await self._call_sam2_service(file_info, x, y)

        norm_x = bbox_pixels[0] / img_w
        norm_y = bbox_pixels[1] / img_h
        norm_w = (bbox_pixels[2] - bbox_pixels[0]) / img_w
        norm_h = (bbox_pixels[3] - bbox_pixels[1]) / img_h

        bbox_data = [{
            "x": norm_x,
            "y": norm_y,
            "width": norm_w,
            "height": norm_h,
            "label": "auto-detected",
            "confidence": score
        }]

        new_ann = self.annotation_repository.create_annotation(
            file_id=file_id,
            task_id=task_id,
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
    
    async def _call_sam2_service(self, file_info, x: float, y: float):
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_info.file_path, "rb") as f:
                files = {"file": (file_info.original_filename, f, file_info.mime_type)}
                payload = {"x": x, "y": y}
                response = await client.post(settings.SAM2_URL, files=files, data=payload)
            if response.status_code != 200:
                raise RuntimeError(f"SAM2 error: {response.text}")
            result = response.json()
            if not result.get("bbox"):
                raise ValueError("Object not detected")
            return result["bbox"], result.get("score", 1.0)

    def get_annotations_for_file(self, file_id: str):
        self._check_file_ownership(file_id)
        return self.annotation_repository.get_annotations_for_file(file_id)
    
    def get_annotations_for_task(self, task_id: str):
        return self.annotation_repository.get_annotations_for_task(task_id)
    
    def update_bounding_box(self, bbox_id: str, update_data: str):
        return self.annotation_repository.update_bounding_box(bbox_id, update_data)

    def delete_bounding_box(self, bbox_id: str):
        return self.annotation_repository.delete_bounding_box(bbox_id)
    
    def delete_annotation(self, annotation_id: str):
        return self.annotation_repository.delete_annotation(annotation_id)