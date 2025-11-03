from pathlib import Path
from typing import List, Dict
import tempfile
import uuid

from app.domain.interfaces.file_processor import FileProcessor
from app.domain.entities.file_info import ProcessingResult

class FileProcessingService:
    
    def __init__(self):
        self._processors: Dict[str, FileProcessor] = {}
        self.upload_dir = Path("uploads")
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
        file_id = uuid.uuid4()
        file_extension = Path(original_filename).suffix
        saved_file_path = self.upload_dir / f"{file_id}{file_extension}"

        with open(saved_file_path, "wb") as f:
            f.write(file_content)

        try:
            processor = self.get_processor(original_filename)

            result = await processor.process(saved_file_path, original_filename)

            from app.api.routes.workspace import file_storage
            for file_info in result.extracted_files:
                file_storage[str(file_info.id)] = file_info

            return result

        except Exception as e:
            if saved_file_path.exists():
                saved_file_path.unlink()
            raise