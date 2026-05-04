from pathlib import Path
from typing import Optional, Annotated

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends

from app.domain.models import User

from app.infrastructure.utils.dependencies import get_file_processing_service, get_current_user
from app.application.services.file_processing_service import FileProcessingService

BASE_DIR = Path(__file__).parent.parent.parent

router = APIRouter(dependencies=[Depends(get_current_user)]) 

@router.post("/upload")
async def upload_file(
    service: Annotated[FileProcessingService, Depends(get_file_processing_service)],
    file: UploadFile = File(...),
    task_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    file_content = await file.read()
    try:
        result = await service.upload_and_process(
            file_content, 
            file.filename, 
            str(current_user.id), 
            str(task.id)
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
