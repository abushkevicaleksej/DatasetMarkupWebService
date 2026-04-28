from pathlib import Path
from typing import Optional

from faststream.rabbit.fastapi import RabbitRouter
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from sqlalchemy import update

from app.infrastructure.database import get_db
from app.domain.models import Task
from app.domain.models import File as FileModel
from app.application.services.file_processing_service import FileProcessingService

BASE_DIR = Path(__file__).parent.parent.parent

router = RabbitRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    task_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if task_id:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

    file_content = await file.read()
    processing_service = FileProcessingService()

    try:
        result = await processing_service.process_file(file_content, file.filename)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error_message)

        if task_id:
            file_ids = [str(file_info.id) for file_info in result.extracted_files]
            stmt = update(FileModel).where(FileModel.id.in_(file_ids)).values(task_id=task_id)
            db.execute(stmt)
            db.commit()

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
