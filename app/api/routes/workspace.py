import os

from pathlib import Path

from sqlalchemy.orm import Session

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse, FileResponse

from app.infrastructure.database import get_db

BASE_DIR = Path(__file__).parent.parent.parent

router = APIRouter()

file_storage = {}

@router.get("/workspace", response_class=HTMLResponse)
async def workspace_page():
    html_path = BASE_DIR / "static" / "templates" / "workspace.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()


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