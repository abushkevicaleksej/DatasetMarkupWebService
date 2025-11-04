from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker, relationship, declarative_base, joinedload

from app.domain.models import Annotation, BoundingBox
from typing import List, Dict

class AnnotationRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create_annotation(self, file_id: str, task_id: str, bounding_boxes: List[Dict]) -> Annotation:
        db_annotation = Annotation(
            file_id=file_id,
            task_id=task_id
        )
        
        self.db.add(db_annotation)
        self.db.flush()
        
        for bbox_data in bounding_boxes:
            db_bbox = BoundingBox(
                annotation_id=db_annotation.id,
                x=bbox_data['x'],
                y=bbox_data['y'],
                width=bbox_data['width'],
                height=bbox_data['height'],
                label=bbox_data.get('label', 'object'),
                confidence=bbox_data.get('confidence', 1.0)
            )
            self.db.add(db_bbox)
        
        self.db.commit()
        self.db.refresh(db_annotation)
        return db_annotation
    
    def get_annotations_for_file(self, file_id: str) -> List[Annotation]:
        return self.db.query(Annotation)\
            .filter(Annotation.file_id == file_id)\
            .options(
                joinedload(Annotation.bounding_boxes)
            )\
            .all()
    
    def get_annotations_for_task(self, task_id: str) -> List[Annotation]:
        return self.db.query(Annotation)\
            .filter(Annotation.task_id == task_id)\
            .options(
                joinedload(Annotation.bounding_boxes),
                joinedload(Annotation.file)
            )\
            .all()
    
    def delete_bounding_box(self, bbox_id: str) -> bool:
        bbox = self.db.query(BoundingBox).filter(BoundingBox.id == bbox_id).first()
        if bbox:
            self.db.delete(bbox)
            
            annotation = self.db.query(Annotation).filter(Annotation.id == bbox.annotation_id).first()
            if annotation and not annotation.bounding_boxes:
                self.db.delete(annotation)
            
            self.db.commit()
            return True
        return False
    
    def delete_annotation(self, annotation_id: str) -> bool:
        annotation = self.db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if annotation:
            self.db.delete(annotation)
            self.db.commit()
            return True
        return False