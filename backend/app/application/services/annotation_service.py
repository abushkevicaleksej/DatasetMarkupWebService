from typing import List, Dict
from app.infrastructure.repositories.annotation_repository import AnnotationRepository

class AnnotationService:
    def __init__(self, annotation_repository: AnnotationRepository):
        self.annotation_repository = annotation_repository

    def create_annotation(self, file_id: str, task_id: str, bounding_boxes: List[Dict]):
        return self.annotation_repository.create_annotation(file_id, task_id, bounding_boxes)
    
    def get_annotations_for_file(self, file_id: str):
        return self.annotation_repository.get_annotations_for_file(file_id)
    
    def get_annotations_for_task(self, task_id: str):
        return self.annotation_repository.get_annotations_for_task(task_id)
    
    def update_bounding_box(self, bbox_id: str, update_data: str):
        return self.annotation_repository.update_bounding_box(bbox_id, update_data)

    def delete_bounding_box(self, bbox_id: str):
        return self.annotation_repository.delete_bounding_box(bbox_id)
    
    def delete_annotation(self, annotation_id: str):
        return self.annotation_repository.delete_annotation(annotation_id)