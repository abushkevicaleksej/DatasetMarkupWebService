from typing import List

from app.infrastructure.repositories.task_repository import TaskRepository
from app.domain.models import User

class TaskService:
    def __init__(self, task_repository: TaskRepository, current_user: User):
        self.task_repository = task_repository
        self.current_user = current_user

    def _get_target_user_id(self):
        return None if str(self.current_user.role) == "admin" else self.current_user.id

    def create_task(self, name: str, description: str, file_ids: List[str] = None):
        return self.task_repository.create(name, description, str(self.current_user.id), file_ids)
    
    def get_task(self, task_id: str):
        task = self.task_repository.get_by_id(task_id, str(self._get_target_user_id()))
        if not task:
            raise ValueError("Task not found or access denied")
        return task

    def get_all_tasks(self):
        return self.task_repository.get_all(str(self._get_target_user_id()))

    def update_task_status(self, task_id: str, status: str):
        self.get_task(task_id) 
        return self.task_repository.update_status(task_id, status)

    def delete_task(self, task_id: str):
        self.get_task(task_id)
        return self.task_repository.delete(task_id)