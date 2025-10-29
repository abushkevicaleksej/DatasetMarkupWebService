from pathlib import Path
from uuid import uuid4
from typing import List
import mimetypes

from domain.entities.file_info import FileInfo, MediaType, ProcessingResult
from domain.interfaces.file_processor import FileProcessor

class ImageProcessor(FileProcessor):
    
    @property
    def supported_extensions(self) -> List[str]:
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
    
    async def process(self, file_path: Path, original_filename: str) -> ProcessingResult:
        import time
        start_time = time.time()
        
        try:
            mime_type, _ = mimetypes.guess_type(original_filename)
            
            width, height = await self._get_image_dimensions(file_path)
            
            file_info = FileInfo(
                id=uuid4(),
                original_filename=original_filename,
                file_path=file_path,
                media_type=MediaType.IMAGE,
                mime_type=mime_type or 'image/jpeg',
                file_size=file_path.stat().st_size,
                width=width,
                height=height
            )
            
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=True,
                extracted_files=[file_info],
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=f"Error processing image file: {str(e)}",
                processing_time=processing_time
            )
    
    async def _get_image_dimensions(self, file_path: Path):
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                return img.size
        except ImportError:
            return None, None
        except Exception:
            return None, None