import os

from sqlalchemy.orm import Session


from fastapi.responses import FileResponse
from fastapi import APIRouter, HTTPException, Depends

from app.infrastructure.database import get_db


router = APIRouter()

@router.get("/files/{file_id}")
async def get_file(file_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.file_repository import FileRepository
    
    try:
        file_repository = FileRepository(db)
        file_info = file_repository.get_by_id(file_id)

        return FileResponse(
            path=file_info.file_path,
            filename=file_info.original_filename,
            media_type=file_info.mime_type
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))