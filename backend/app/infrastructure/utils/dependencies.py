from fastapi import Depends

from sqlalchemy.orm import Session

from app.infrastructure.database import get_db

from app.infrastructure.repositories.annotation_repository import AnnotationRepository
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.repositories.task_repository import TaskRepository
from app.infrastructure.repositories.ml_model_repository import MLModelRepository, TrainingSessionRepository, PredictionRepository

from app.application.services.file_processing_service import FileProcessingService
from app.application.services.annotation_service import AnnotationService
from app.application.services.export_service import ExportService
from app.application.services.model_service import ModelService
from app.application.services.task_service import TaskService

def get_annotation_service(db: Session = Depends(get_db)) -> AnnotationService:
    annotation_repo = AnnotationRepository(db)
    file_repo = FileRepository(db)
    
    return AnnotationService(annotation_repo, file_repo)

def get_export_service(db: Session = Depends(get_db)) -> ExportService:
    task_repo = TaskRepository(db)
    file_repo = FileRepository(db)
    
    return ExportService(task_repo, file_repo)

def get_model_service(db: Session = Depends(get_db)) -> ModelService:
    model_repo = MLModelRepository(db)
    training_repo = TrainingSessionRepository(db)
    anno_repo = AnnotationRepository(db)
    file_repo = FileRepository(db)
    prediction_repo = PredictionRepository(db)

    return ModelService(model_repo, training_repo, anno_repo, file_repo, prediction_repo)

def get_task_service(db: Session = Depends(get_db)) -> TaskService:
    task_repo = TaskRepository(db)

    return TaskService(task_repo)

def get_file_processing_service(db: Session = Depends(get_db)) -> FileProcessingService:
    file_repo =FileRepository(db)
    
    return FileProcessingService(file_repo)