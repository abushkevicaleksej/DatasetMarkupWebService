from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

router = APIRouter()

file_storage = {}

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