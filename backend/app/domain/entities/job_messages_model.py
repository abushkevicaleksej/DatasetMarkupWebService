from uuid import UUID
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from pydantic import BaseModel

class JobStatus(Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'

@dataclass
class AsyncJob:
    id: UUID | None
    type: str
    status: JobStatus
    input_params: str
    result: str
    error_message: str
    created_at: datetime
    updated_at: datetime

class SmartBBoxTaskMessage(BaseModel):
      job_id: UUID
      file_id: str
      task_id: str
      x: int
      y: int
      file_path: str