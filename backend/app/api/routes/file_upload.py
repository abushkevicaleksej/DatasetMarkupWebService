from pathlib import Path
from typing import Optional, Annotated

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from sqlalchemy import update

from app.domain.models import Task
from app.domain.models import File as FileModel

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
    if task_id:
        task = service.file_repository.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

    file_content = await file.read()

    try:
        result = await service.process_file(file_content, file.filename)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error_message)

        if task_id:
            file_ids = [str(file_info.id) for file_info in result.extracted_files]
            stmt = update(FileModel).where(FileModel.id.in_(file_ids)).values(task_id=task_id)
            service.file_repository.db.execute(stmt)
            service.file_repository.db.commit()

        response = {
            "success": True,
            "processing_time": result.processing_time,
            "extracted_files": [
                {
                    "id": str(file_info.id),
                    "original_filename": file_info.original_filename,
                    "media_type": file_info.media_type.value,
                    "file_size": file_info.file_size,
                    "width": file_info.width,
                    "height": file_info.height
                }
                for file_info in result.extracted_files
            ]
        }

        redirect = f"/workspace?taskId={task_id}" if task_id else "/workspace"
        return {**response, "redirect_url": redirect}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
