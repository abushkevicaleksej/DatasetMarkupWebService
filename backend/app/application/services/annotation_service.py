from typing import List, Dict
from app.infrastructure.repositories.annotation_repository import AnnotationRepository
from app.infrastructure.database import get_db

class AnnotationService:
    
    def create_annotation(self, file_id: str, task_id: str, bounding_boxes: List[Dict]):
        db = next(get_db())
        annotation_repository = AnnotationRepository(db)
        
        return annotation_repository.create_annotation(file_id, task_id, bounding_boxes)
    
    def get_annotations_for_file(self, file_id: str):
        db = next(get_db())
        annotation_repository = AnnotationRepository(db)
        
        return annotation_repository.get_annotations_for_file(file_id)
    
    def get_annotations_for_task(self, task_id: str):
        db = next(get_db())
        annotation_repository = AnnotationRepository(db)
        
        return annotation_repository.get_annotations_for_task(task_id)
    
    def update_bounding_box_label(self, bbox_id: str, new_label: str):
        db = next(get_db())
        annotation_repository = AnnotationRepository(db)

        return annotation_repository.update_bounding_box_label(bbox_id, new_label)

    def delete_bounding_box(self, bbox_id: str):
        db = next(get_db())
        annotation_repository = AnnotationRepository(db)
        
        return annotation_repository.delete_bounding_box(bbox_id)
    
    def delete_annotation(self, annotation_id: str):
        db = next(get_db())
        annotation_repository = AnnotationRepository(db)
        
        return annotation_repository.delete_annotation(annotation_id)