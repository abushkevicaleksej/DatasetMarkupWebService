from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import os
from pathlib import Path
from app.infrastructure.database import get_db
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/files/{file_id}")
async def get_file(file_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.file_repository import FileRepository
    
    try:
        file_repository = FileRepository(db)
        file_info = file_repository.get_by_id(file_id)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = Path(file_info.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        return FileResponse(
            path=file_path,
            filename=file_info.original_filename,
            media_type=file_info.mime_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")