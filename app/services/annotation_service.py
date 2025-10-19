from app.models.schemas import AnnotationCreate, BoundingBox
from typing import List, Dict, Any


class AnnotationService:
    def __init__(self):
        self.annotations: Dict[str, List[BoundingBox]] = {}

    async def create_annotation(self, annotation: AnnotationCreate) -> BoundingBox:
        image_id = annotation.image_id

        if image_id not in self.annotations:
            self.annotations[image_id] = []

        self.annotations[image_id].append(annotation.bbox)

        print(f"New annotation for image {image_id}:")
        print(f"  BBox: x={annotation.bbox.x}, y={annotation.bbox.y}, "
              f"width={annotation.bbox.width}, height={annotation.bbox.height}")

        return annotation.bbox

    async def get_annotations(self, image_id: str) -> List[BoundingBox]:
        return self.annotations.get(image_id, [])