import os

from fastapi.responses import HTMLResponse, FileResponse
from fastapi import APIRouter, HTTPException

from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent

router = APIRouter()

file_storage = {}

@router.get("/workspace", response_class=HTMLResponse)
async def workspace_page():
    html_path = BASE_DIR / "static" / "templates" / "workspace.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()

@router.get("/files/{file_id}")
async def get_file(file_id: str):
    file_info = file_storage.get(file_id)
    if not file_info or not os.path.exists(file_info.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_info.file_path,
        filename=file_info.original_filename,
        media_type=file_info.mime_type
    )