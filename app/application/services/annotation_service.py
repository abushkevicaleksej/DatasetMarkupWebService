from typing import List, Dict, Optional
from uuid import UUID, uuid4

from app.domain.entities.annotation import Annotation, BoundingBox

class AnnotationService:
    def __init__(self):
        self._annotations: Dict[UUID, Annotation] = {}
        self._file_annotations: Dict[UUID, List[UUID]] = {}

    def create_annotation(self, file_id: UUID, bounding_boxes: List[Dict]) -> Annotation:
        annotation_id = uuid4()
        bboxes = [
            BoundingBox(
                id=uuid4(),
                x=bbox["x"],
                y=bbox["y"],
                width=bbox["width"],
                height=bbox["height"],
                label=bbox.get("label", "object"),
                confidence=bbox.get("confidence", 1.0)
            ) for bbox in bounding_boxes
        ]

        annotation = Annotation(
            id=annotation_id,
            file_id=file_id,
            bounding_boxes=bboxes
        )

        self._annotations[annotation_id] = annotation

        if file_id not in self._file_annotations:
            self._file_annotations[file_id] = []
        self._file_annotations[file_id].append(annotation_id)

        return annotation

    def get_annotations_for_file(self, file_id: UUID) -> List[Annotation]:
        annotation_ids = self._file_annotations.get(file_id, [])
        return [self._annotations[ann_id] for ann_id in annotation_ids]

    def delete_annotation(self, annotation_id: UUID) -> bool:
        if annotation_id in self._annotations:
            annotation = self._annotations[annotation_id]
            if annotation.file_id in self._file_annotations:
                self._file_annotations[annotation.file_id] = [
                    ann_id for ann_id in self._file_annotations[annotation.file_id]
                    if ann_id != annotation_id
                ]
            del self._annotations[annotation_id]
            return True
        return False

    def delete_bounding_box(self, bbox_id: UUID) -> bool:
        for annotation in self._annotations.values():
            original_count = len(annotation.bounding_boxes)
            annotation.bounding_boxes = [
                bbox for bbox in annotation.bounding_boxes
                if bbox.id != bbox_id
            ]
            if len(annotation.bounding_boxes) != original_count:
                if not annotation.bounding_boxes:
                    self.delete_annotation(annotation.id)
                return True
        return False

annotation_service = AnnotationService()