from typing import Annotated
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse

from app.application.services.file_processing_service import FileProcessingService
from app.infrastructure.utils.dependencies import get_file_processing_service, get_current_user

from app.domain.ml_schemas import (
    PredictionResponse
)

BASE_DIR = Path(__file__).parent.parent.parent

router = APIRouter(dependencies=[Depends(get_current_user)]) 

@router.get("/files")
async def get_all_files(service: Annotated[FileProcessingService, Depends(get_file_processing_service)]):
    try:
        files = service.get_all_files()

        return [
            {
                "id": file.id,
                "original_filename": file.original_filename,
                "file_size": file.file_size,
                "file_path": file.file_path,
                "mime_type": file.mime_type
            }
            for file in files
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/files/{file_id}")
async def get_file(
    file_id: str, 
    service: Annotated[FileProcessingService, Depends(get_file_processing_service)]
):
    try:
        file_info = service.get_file(file_id)
        
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

@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str, 
    service: Annotated[FileProcessingService, Depends(get_file_processing_service)]
):
    try:
        success = service.delete_file(file_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
            
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.put("/files/{file_id}")
async def update_files(
    file_id: str, 
    update_data: PredictionResponse, 
    service: Annotated[FileProcessingService, Depends(get_file_processing_service)]
):
    try:
        updates = update_data.dict(exclude_unset=True)
        
        if not updates:
            return {"message": "No data provided for update"}

        success = service.file_repository.update_file(
            file_id=file_id, 
            update_data=updates
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
            
        return {"message": "File updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
