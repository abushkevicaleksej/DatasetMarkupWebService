from pathlib import Path
from typing import List, Dict
import tempfile

from domain.interfaces.file_processor import FileProcessor
from domain.entities.file_info import ProcessingResult

class FileProcessingService:
    
    def __init__(self):
        self._processors: Dict[str, FileProcessor] = {}
        self._setup_processors()
    
    def _setup_processors(self):
        from infrastructure.file_processors.zip_processor import ZipProcessor
        from infrastructure.file_processors.video_processor import VideoProcessor
        from infrastructure.file_processors.image_processor import ImageProcessor
        
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
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(original_filename).suffix) as temp_file:
            temp_file.write(file_content)
            temp_path = Path(temp_file.name)
        
        try:
            processor = self.get_processor(original_filename)
            
            result = await processor.process(temp_path, original_filename)
            
            return result
            
        finally:
            if temp_path.exists():
                temp_path.unlink()