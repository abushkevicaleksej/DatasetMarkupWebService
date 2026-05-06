from uuid import UUID
from typing import List, Optional

from sqlalchemy import update, func
from sqlalchemy.orm import Session

from app.domain.models import File
from app.domain.entities.file_info import FileInfo


class FileRepository:
    def __init__(self, db: Session):
        self.db = db

    def update_task_id_for_files(self, file_ids: List[str], task_id: str):
        stmt = update(File).where(File.id.in_(file_ids)).values(task_id=task_id)
        self.db.execute(stmt)
        self.db.commit()    

    def create(self, file_data: dict) -> File:
        file = File(**file_data)
        self.db.add(file)
        self.db.commit()
        self.db.refresh(file)
        return file
    

    def get_by_id(self, file_id: str, user_id: Optional[str] = None) -> Optional[File]:
        query = self.db.query(File).filter(File.id == file_id)
        if user_id is not None:
            query = query.filter(File.user_id == user_id)
        return query.first()
    

    def get_by_ids(self, file_ids: List[str]) -> List[File]:
        return self.db.query(File).filter(File.id.in_(file_ids)).all()
    

    def get_all(self, user_id: Optional[str] = None) -> List[File]:
        query = self.db.query(File)
        if user_id is not None:
            query = query.filter(File.user_id == user_id)
        return query.all()
    

    def delete(self, file_id: str, user_id: Optional[str] = None) -> bool:
        query = self.db.query(File).filter(File.id == file_id)
        if user_id is not None:
            query = query.filter(File.user_id == user_id)
        file = query.first()
        if file:
            self.db.delete(file)
            self.db.commit()
            return True
        return False
    

    def update_file(self, file_id: str, update_data: dict) -> bool:
        
        file = self.db.query(File).filter(File.id == file_id).first()
        if not file:
            return False
        
        for key, value in update_data.items():
            if hasattr(file, key):
                setattr(file, key, value)
                
        self.db.commit()
        self.db.refresh(file)
        return True
    

    def to_entity(self, db_file: File) -> FileInfo:
        from app.domain.entities.file_info import FileInfo, MediaType
        
        return FileInfo(
            id=UUID(db_file.id),
            original_filename=db_file.original_filename,
            file_path=db_file.file_path,
            media_type=MediaType(db_file.media_type),
            mime_type=db_file.mime_type,
            file_size=db_file.file_size,
            width=db_file.width,
            height=db_file.height,
            duration=db_file.duration,
            extracted_from=UUID(db_file.extracted_from) if db_file.extracted_from else None
        )

    def get_random_unannotated_files(self, task_id: str, limit: int = 100) -> List[File]:
        return self.db.query(File)\
            .filter(File.task_id == task_id, File.annotation_status == 'unannotated')\
            .order_by(func.random())\
            .limit(limit)\
            .all()

    def get_top_uncertain_files(self, task_id: str, limit: int = 10) -> List[File]:
        return self.db.query(File)\
            .filter(File.task_id == task_id, File.annotation_status == 'unannotated')\
            .order_by(File.uncertainty_score.desc())\
            .limit(limit)\
            .all()

    def update_annotation_status(self, file_id: str, status: str):
        file = self.get_by_id(file_id)
        if file:
            file.annotation_status = status
            self.db.commit()
