import os
import uuid
from fastapi import UploadFile
from PIL import Image
import shutil


class LocalStorage:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)

    async def save_image(self, file: UploadFile) -> dict:
        # Генерируем уникальный ID для файла
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = os.path.join(self.upload_dir, filename)

        try:
            # Сохраняем файл
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Получаем размеры изображения
            with Image.open(file_path) as img:
                width, height = img.size

            return {
                "id": file_id,
                "filename": filename,
                "file_path": file_path,
                "width": width,
                "height": height,
                "naturalWidth": width,  # Добавляем natural dimensions
                "naturalHeight": height
            }
        except Exception as e:
            # Удаляем файл если произошла ошибка
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    def get_image_url(self, filename: str) -> str:
        return f"/api/v1/uploads/{filename}"