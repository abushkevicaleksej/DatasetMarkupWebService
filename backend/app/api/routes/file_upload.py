from pathlib import Path
from typing import Optional, Annotated

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends

from app.infrastructure.utils.dependencies import get_file_processing_service
from app.application.services.file_processing_service import FileProcessingService

BASE_DIR = Path(__file__).parent.parent.parent

router = APIRouter()

@router.post("/upload")
async def upload_file(
    service: Annotated[FileProcessingService, Depends(get_file_processing_service)],
    file: UploadFile = File(...),
    task_id: Optional[str] = Form(None),
):
    file_content = await file.read()
    try:
        result = await service.upload_and_process(file_content, file.filename, task_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
