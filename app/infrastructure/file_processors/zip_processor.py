import zipfile
import tempfile
from pathlib import Path
from uuid import uuid4
import asyncio
from typing import List
import mimetypes

from app.domain.entities.file_info import FileInfo, MediaType, ProcessingResult
from app.domain.interfaces.file_processor import FileProcessor

class ZipProcessor(FileProcessor):
    
    @property
    def supported_extensions(self) -> List[str]:
        return ['.zip']
    
    async def process(self, file_path: Path, original_filename: str) -> ProcessingResult:
        import time
        start_time = time.time()

        try:
            extracted_files = []
            source_file_id = uuid4()
            
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_path)
                
                for extracted_file in temp_path.rglob('*'):
                    if extracted_file.is_file():
                        mime_type, _ = mimetypes.guess_type(extracted_file.name)
                        media_type = self._determine_media_type(mime_type, extracted_file.name)
                        
                        if media_type == MediaType.IMAGE:

                            file_info = FileInfo(
                                id=uuid4(),
                                original_filename=extracted_file.name,
                                file_path=extracted_file,
                                media_type=media_type,
                                mime_type=mime_type or 'application/octet-stream',
                                file_size=extracted_file.stat().st_size,
                                extracted_from=source_file_id
                            )
                            extracted_files.append(file_info)
            
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
                error_message=f"Error processing ZIP file: {str(e)}",
                processing_time=processing_time
            )
        

    def _determine_media_type(self, mime_type: str, filename: str) -> MediaType:
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
        video_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'}
        
        file_ext = Path(filename).suffix.lower()
        
        if mime_type and mime_type.startswith('image/'):
            return MediaType.IMAGE
        elif mime_type and mime_type.startswith('video/'):
            return MediaType.VIDEO
        elif file_ext in image_extensions:
            return MediaType.IMAGE
        elif file_ext in video_extensions:
            return MediaType.VIDEO
        else:
            return MediaType.ARCHIVE