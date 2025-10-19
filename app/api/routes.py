from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
from app.models.schemas import AnnotationCreate, ImageInfo
from app.services.annotation_service import AnnotationService
from app.storage.local_storage import LocalStorage

router = APIRouter()
annotation_service = AnnotationService()
storage = LocalStorage()


@router.post("/upload", response_model=ImageInfo)
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        image_data = await storage.save_image(file)

        return ImageInfo(
            id=image_data["id"],
            filename=image_data["filename"],
            width=image_data["width"],
            height=image_data["height"],
            url=storage.get_image_url(image_data["filename"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")


@router.post("/annotations")
async def create_annotation(annotation: AnnotationCreate):
    return await annotation_service.create_annotation(annotation)


@router.get("/annotations/{image_id}")
async def get_annotations(image_id: str):
    return await annotation_service.get_annotations(image_id)


# Serve uploaded images
# app/api/routes.py (дополнение к существующему коду)
@router.get("/uploads/{filename}")
async def get_uploaded_image(filename: str):
    file_path = os.path.join("uploads", filename)
    if os.path.exists(file_path):
        extension = filename.lower().split('.')[-1]
        media_type = f"image/{extension}" if extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp'] else "image/jpeg"

        return FileResponse(
            file_path,
            media_type=media_type,
            headers={"Cache-Control": "no-cache"}
        )
    raise HTTPException(status_code=404, detail="Image not found")