from fastapi import APIRouter
from .routes import (
    file_upload,
    workspace,
    tasks,
    file_export,
    annotations,
    ml_routes
)

def create_api_router() -> APIRouter:
    api_router = APIRouter()
    api_router.include_router(file_upload.router, prefix="/api/routes", tags=["upload"])
    api_router.include_router(workspace.router, prefix="/api/routes", tags=["workspace"])
    api_router.include_router(tasks.router, prefix="/api/routes", tags=["tasks"])
    api_router.include_router(file_export.router, prefix="/api/routes", tags=["files"])
    api_router.include_router(annotations.router, prefix="/api/routes", tags=["annotations"])
    api_router.include_router(ml_routes.router, prefix="/api/routes", tags=["ml-models"])
    return api_router