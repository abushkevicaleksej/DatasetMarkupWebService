import os

from pathlib import Path
from typing import Dict
import tempfile
import shutil
from uuid import uuid4
import asyncio

from app.domain.interfaces.file_processor import FileProcessor
from app.domain.entities.file_info import ProcessingResult, FileInfo
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.database import get_db

class FileProcessingService:
    
    def __init__(self):
        self._processors: Dict[str, FileProcessor] = {}
        self.upload_dir = Path(os.getcwd() + "\\uploads")
        self.upload_dir.mkdir(exist_ok=True)
        self._setup_processors()
    
    def _setup_processors(self):
        from app.infrastructure.file_processors.zip_processor import ZipProcessor
        from app.infrastructure.file_processors.video_processor import VideoProcessor
        from app.infrastructure.file_processors.image_processor import ImageProcessor
        
        processors = [
            ZipProcessor(),
            VideoProcessor(),
            ImageProcessor()
        ]
        
        for processor in processors:
            for ext in processor.supported_extensions:
                self._processors[ext] = processor
    
    def get_processor(self, filename: str) -> FileProcessor:
        file_path = Path(filename)
        extension = file_path.suffix.lower()
        
        processor = self._processors.get(extension)
        if not processor:
            raise ValueError(f"No processor found for file type: {extension}")
        
        return processor
    
    async def process_file(self, file_content: bytes, original_filename: str) -> ProcessingResult:
        file_id = uuid4()
        file_extension = Path(original_filename).suffix
        saved_file_path = self.upload_dir / f"{file_id}{file_extension}"
        
        with open(saved_file_path, "wb") as f:
            f.write(file_content)
        
        try:
            processor = self.get_processor(original_filename)
            
            result = await processor.process(saved_file_path, original_filename)
            
            db = next(get_db())
            file_repository = FileRepository(db)

            processed_files = []

            for file_info in result.extracted_files:
                if file_info.file_path.exists():
                    new_file_id = uuid4()
                    new_extension = Path(file_info.file_path).suffix
                    new_file_path = self.upload_dir / f"{new_file_id}{new_extension}"

                    print(new_file_path)
                    print(file_info.file_path)

                    shutil.copy2(file_info.file_path, new_file_path)

                    updated_file_info = FileInfo(
                        id=new_file_id,
                        original_filename=file_info.original_filename,
                        file_path=new_file_path,
                        media_type=file_info.media_type,
                        mime_type=file_info.mime_type,
                        file_size=new_file_path.stat().st_size,
                        width=file_info.width,
                        height=file_info.height,
                        duration=file_info.duration,
                        extracted_from=file_id
                    )
                    file_repository.create(updated_file_info)
                    processed_files.append(updated_file_info)
                
                else:
                    print(f"Warning: File {file_info.file_path} does not exist, skipping")
            
            result.extracted_files = processed_files
            
            return result

        except Exception as e:
            if saved_file_path.exists():
                saved_file_path.unlink()
            raise
        finally:
            pass