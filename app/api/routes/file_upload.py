from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse

from app.application.services.file_processing_service import FileProcessingService

from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent

router = APIRouter()

@router.get("/upload", response_class=HTMLResponse)
async def load_dataset_page():
    html_path = BASE_DIR / "static" / "templates" / "loadDataset.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_content = await file.read()

    processing_service = FileProcessingService()

    try:
        result = await processing_service.process_file(file_content, file.filename)
        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=f"File processing failed: {result.error_message}"
            )

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

        return {
            **response,
            "redirect_url": f"/api/routes/workspace"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")