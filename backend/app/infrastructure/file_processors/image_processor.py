from pathlib import Path
from uuid import uuid4
from typing import List
import mimetypes

from app.domain.entities.file_info import FileInfo, MediaType, ProcessingResult
from app.domain.interfaces.file_processor import ImageProcessor as ImageProcessorInterface


class ImageProcessor(ImageProcessorInterface):
    
    @property
    def supported_extensions(self) -> List[str]:
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
    

    async def process(self, file_path: Path, original_filename: str) -> ProcessingResult:
        import time
        start_time = time.time()
        
        try:
            result = await self.process_single_image(file_path, original_filename)
            result.processing_time = time.time() - start_time
            return result
        except Exception as e:
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=f"Error processing image file: {str(e)}",
                processing_time=processing_time
            )
    

    async def process_single_image(self, file_path: Path, original_filename: str) -> ProcessingResult:
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
        
        return ProcessingResult(
            success=True,
            extracted_files=[file_info],
            processing_time=0.0
        )
    

    async def process_multiple_images(self, image_paths: List[Path], original_filenames: List[str] = None) -> ProcessingResult:
        import time
        start_time = time.time()
        
        try:
            extracted_files = []
            
            for i, image_path in enumerate(image_paths):
                if not image_path.exists():
                    continue
                    
                original_filename = original_filenames[i] if original_filenames else image_path.name
                single_result = await self.process_single_image(image_path, original_filename)
                
                if single_result.success:
                    extracted_files.extend(single_result.extracted_files)
            
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=True,
                extracted_files=extracted_files,
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=f"Error processing multiple images: {str(e)}",
                processing_time=processing_time
            )
    

    async def _get_image_dimensions(self, file_path: Path):
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                return img.size
        except ImportError:
            return None, None
        except Exception as e:
            return None, None
