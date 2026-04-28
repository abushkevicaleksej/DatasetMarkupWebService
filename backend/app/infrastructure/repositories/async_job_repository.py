from typing import Optional
import datetime
import uuid

from sqlalchemy.orm import Session

from backend.app.domain.entities.job_messages_model import AsyncJob, JobStatus

class AsyncJobRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_job(self, type: str, input_params: dict) -> AsyncJob:
        return AsyncJob(
            id=str(uuid.uuid4()),
            type=type,
            status=JobStatus.PENDING,
            input_params=json.dumps(input_params),
            result="",
            error_message="",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def update_job(self, job_id: str, **kwagrs):
        pass

    def get_job(self, job_id: str) -> Optional[AsyncJob]:
        pass