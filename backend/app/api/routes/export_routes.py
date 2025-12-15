import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.application.services.export_service import ExportService


router = APIRouter()


@router.get("/api/tasks/{task_id}/export/yolo")
async def export_task_dataset(task_id: str, db: Session = Depends(get_db)):
    try:
        service = ExportService(db)
        zip_path = service.export_task_yolo(task_id)
        
        filename = os.path.basename(zip_path)
        
        return FileResponse(
            path=zip_path,
            filename=filename,
            media_type='application/zip'
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
