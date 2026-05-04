from enum import Enum
from uuid import UUID
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.domain.entities.annotation import Annotation
from app.domain.entities.file_info import FileInfo

class TaskStatus(Enum):
    IN_PROGRESS = 'in progress'
    COMPLETED = 'completed'
    REJECTED = 'rejected'

@dataclass
class Task:
    id: UUID
    name: str
    description: str
    files: List[FileInfo]
    annotations: List[Annotation]
    status: str
    user_id: UUID
    created_at: datetime = None
    updated_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()

class TaskCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    file_ids: Optional[List[str]] = None
    user_id: UUID

class TaskResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    file_count: int
    annotation_count: int
    created_at: str
    updated_at: str
    user_id: UUID
