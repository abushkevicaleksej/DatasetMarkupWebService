from fastapi import APIRouter
from .routes import file_upload

def create_api_router() -> APIRouter:
    api_router = APIRouter()
    api_router.include_router(file_upload.router, prefix="/api/routes", tags=["upload"])
    return api_router