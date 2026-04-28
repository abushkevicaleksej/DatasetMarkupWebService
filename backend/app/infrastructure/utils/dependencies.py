from fastapi import Depends

from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.infrastructure.repositories.annotation_repository import AnnotationRepository

from app.application.services.annotation_service import AnnotationService

def get_annotation_service(db: Session = Depends(get_db)) -> AnnotationService:
    repo = AnnotationRepository(db)
    return AnnotationService(repo)