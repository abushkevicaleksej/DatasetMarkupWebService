from sqlalchemy.orm import Session
from app.domain.models import File
from app.domain.entities.file_info import FileInfo
from typing import List, Optional
from uuid import UUID

class FileRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, file_info: FileInfo) -> File:
        db_file = File(
            id=str(file_info.id),
            original_filename=file_info.original_filename,
            file_path=str(file_info.file_path),
            media_type=file_info.media_type.value,
            mime_type=file_info.mime_type,
            file_size=file_info.file_size,
            width=file_info.width,
            height=file_info.height,
            duration=file_info.duration,
            extracted_from=str(file_info.extracted_from) if file_info.extracted_from else None
        )
        
        self.db.add(db_file)
        self.db.commit()
        self.db.refresh(db_file)
        return db_file
    
    def get_by_id(self, file_id: str) -> Optional[File]:
        return self.db.query(File).filter(File.id == file_id).first()
    
    def get_by_ids(self, file_ids: List[str]) -> List[File]:
        return self.db.query(File).filter(File.id.in_(file_ids)).all()
    
    def get_all(self) -> List[File]:
        return self.db.query(File).all()
    
    def delete(self, file_id: str) -> bool:
        file = self.get_by_id(file_id)
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