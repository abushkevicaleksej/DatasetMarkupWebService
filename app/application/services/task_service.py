from typing import List, Dict, Optional
from uuid import uuid4, UUID
import datetime

from app.domain.entities.file_info import FileInfo
from app.domain.entities.annotation import Annotation, BoundingBox
from app.domain.entities.annotation_task import Task, TaskStatus

class TaskService:
    def __init__(self) -> None:
        self._tasks: Dict[uuid4, Task] = {}
        self._annotations: Dict[uuid4, Annotation] = {}

    def create_task(self, name: str, description: str, files: List[FileInfo]) -> Task:
        task_id = uuid4()
        task = Task(
            id=task_id,
            name=name,
            description=description,
            files=files,
            annotations=[],
            status=TaskStatus.IN_PROGRESS,
        )
        self._tasks[task_id] = task
        return task

    def get_task(self, task_id: UUID) -> Optional[Task]:
        return self._tasks.get(task_id)

    def get_all_tasks(self) -> List[Task]:
        return list(self._tasks.values())

    def add_annotation(self, task_id: UUID, file_id: UUID, bounding_boxes: List[BoundingBox]) -> Annotation:
        annotation_id = uuid4()
        annotation = Annotation(
            id=annotation_id,
            file_id=file_id,
            bounding_boxes=bounding_boxes
        )

        if task_id in self._tasks:
            self._tasks[task_id].annotations.append(annotation)
            self._tasks[task_id].updated_at = datetime.now()

        self._annotations[annotation_id] = annotation
        return annotation

    def delete_annotation(self, annotation_id: UUID) -> bool:
        if annotation_id in self._annotations:
            for task in self._tasks.values():
                task.annotations = [ann for ann in task.annotations if ann.id != annotation_id]
                task.updated_at = datetime.now()

            del self._annotations[annotation_id]
            return True
        return False

    def update_task_status(self, task_id: UUID, status: str) -> Optional[Task]:
        if task_id in self._tasks:
            self._tasks[task_id].status = status
            self._tasks[task_id].updated_at = datetime.now()
            return self._tasks[task_id]
        return None
