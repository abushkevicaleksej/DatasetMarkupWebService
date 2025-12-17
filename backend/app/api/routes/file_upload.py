from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.application.services.file_processing_service import FileProcessingService

BASE_DIR = Path(__file__).parent.parent.parent

router = APIRouter()


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
            "redirect_url": f"/workspace"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
