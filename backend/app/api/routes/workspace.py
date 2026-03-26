import os
from pathlib import Path
from sqlalchemy.orm import Session

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse, FileResponse

from app.infrastructure.database import get_db
from app.domain.ml_schemas import (
    PredictionResponse
)


BASE_DIR = Path(__file__).parent.parent.parent


router = APIRouter()


@router.get("/files")
async def get_all_files(db: Session = Depends(get_db)):
    from app.infrastructure.repositories.file_repository import FileRepository

    try:
        file_repository = FileRepository(db)
        files = file_repository.get_all()

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
    

@router.delete("/files/{file_id}")
async def delete_file(file_id: str, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.file_repository import FileRepository
    
    try:
        file_repository = FileRepository(db)
        success = file_repository.delete(file_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
            
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.put("/files/{file_id}")
async def update_files(file_id: str, update_data: PredictionResponse, db: Session = Depends(get_db)):
    from app.infrastructure.repositories.file_repository import FileRepository
    
    try:
        file_repository = FileRepository(db)
        
        updates = update_data.dict(exclude_unset=True)
        
        if not updates:
            return {"message": "No data provided for update"}

        success = file_repository.update_file(
            file_id=file_id, 
            update_data=updates
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
            
        return {"message": "File updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
