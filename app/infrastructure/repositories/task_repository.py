from sqlalchemy.orm import Session
from app.domain.models import Task, File
from typing import List, Optional

class TaskRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, name: str, description: str, file_ids: List[str] = None) -> Task:
        db_task = Task(
            name=name,
            description=description,
            status='draft'
        )
        
        if file_ids:
            files = self.db.query(File).filter(File.id.in_(file_ids)).all()
            db_task.files.extend(files)
        
        self.db.add(db_task)
        self.db.commit()
        self.db.refresh(db_task)
        return db_task
    
    def get_by_id(self, task_id: str) -> Optional[Task]:
        return self.db.query(Task).filter(Task.id == task_id).first()
    
    def get_all(self) -> List[Task]:
        return self.db.query(Task).all()
    
    def update_status(self, task_id: str, status: str) -> Optional[Task]:
        task = self.get_by_id(task_id)
        if task:
            task.status = status
            self.db.commit()
            self.db.refresh(task)
        return task
    
    def add_files_to_task(self, task_id: str, file_ids: List[str]) -> Optional[Task]:
        task = self.get_by_id(task_id)
        if task:
            files = self.db.query(File).filter(File.id.in_(file_ids)).all()
            task.files.extend(files)
            self.db.commit()
            self.db.refresh(task)
        return task
    
    def delete(self, task_id: str) -> bool:
        task = self.get_by_id(task_id)
        print(task)
        if task:
            self.db.delete(task)
            self.db.commit()
            return True
        return False