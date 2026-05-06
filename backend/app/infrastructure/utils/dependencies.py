from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from sqlalchemy.orm import Session

from app.infrastructure.database import get_db

from app.core.config import settings
from app.domain.models import User

from app.infrastructure.repositories.annotation_repository import AnnotationRepository
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.repositories.task_repository import TaskRepository
from app.infrastructure.repositories.ml_model_repository import MLModelRepository, TrainingSessionRepository, PredictionRepository
from app.infrastructure.repositories.user_repository import UserRepository
from app.infrastructure.repositories.token_repository import TokenBlacklistRepository

from app.application.services.file_processing_service import FileProcessingService
from app.application.services.active_learning_service import ActiveLearningService
from app.application.services.annotation_service import AnnotationService
from app.application.services.export_service import ExportService
from app.application.services.model_service import ModelService
from app.application.services.task_service import TaskService
from app.application.services.auth_service import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/routes/login")

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    user_repo = UserRepository(db)
    token_repo = TokenBlacklistRepository(db)

    return AuthService(user_repo, token_repo)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action"
            )
        return current_user

require_admin = RoleChecker(["admin"])
require_user = RoleChecker(["user", "admin"])

def get_annotation_service(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> AnnotationService:
    annotation_repo = AnnotationRepository(db)
    file_repo = FileRepository(db)
    
    return AnnotationService(annotation_repo, file_repo, current_user)

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

def get_task_service(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> TaskService:
    task_repo = TaskRepository(db)

    return TaskService(task_repo, current_user)

def get_file_processing_service(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> FileProcessingService:
    file_repo = FileRepository(db)
    task_repo = TaskRepository(db)

    return FileProcessingService(file_repo, task_repo, current_user)

def get_active_learning_service(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model_service = get_model_service(db)
    
    return ActiveLearningService(FileRepository(db), model_service, current_user)
