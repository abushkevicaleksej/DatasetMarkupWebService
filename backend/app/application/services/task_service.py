from typing import List, Optional

from app.infrastructure.repositories.task_repository import TaskRepository
from app.infrastructure.database import get_db

class TaskService:
    
    def create_task(self, name: str, description: str, file_ids: List[str] = None):
        db = next(get_db())
        task_repository = TaskRepository(db)
        
        return task_repository.create(name, description, file_ids)
    

    def get_task(self, task_id: str):
        db = next(get_db())
        task_repository = TaskRepository(db)
        
        return task_repository.get_by_id(task_id)
    

    def get_all_tasks(self):
        db = next(get_db())
        task_repository = TaskRepository(db)
        
        return task_repository.get_all()
    

    def update_task_status(self, task_id: str, status: str):
        db = next(get_db())
        task_repository = TaskRepository(db)
        
        return task_repository.update_status(task_id, status)
    

    def add_files_to_task(self, task_id: str, file_ids: List[str]):
        db = next(get_db())
        task_repository = TaskRepository(db)
        
        return task_repository.add_files_to_task(task_id, file_ids)
