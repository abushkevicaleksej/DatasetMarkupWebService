from typing import List

from app.infrastructure.repositories.task_repository import TaskRepository

class TaskService:
    def __init__(self, task_repository: TaskRepository):
        self.task_repository = task_repository

    def create_task(self, name: str, description: str, file_ids: List[str] = None):
        return self.task_repository.create(name, description, file_ids)
    
    def get_task(self, task_id: str):
        return self.task_repository.get_by_id(task_id)

    def get_all_tasks(self):
        return self.task_repository.get_all()

    def update_task_status(self, task_id: str, status: str):
        return self.task_repository.update_status(task_id, status)

    def add_files_to_task(self, task_id: str, file_ids: List[str]):        
        return self.task_repository.add_files_to_task(task_id, file_ids)
