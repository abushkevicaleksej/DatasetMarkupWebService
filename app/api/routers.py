from fastapi import APIRouter
from .routes import file_upload

def create_api_router() -> APIRouter:
    api_router = APIRouter()
    api_router.include_router(file_upload.router)
    return api_router