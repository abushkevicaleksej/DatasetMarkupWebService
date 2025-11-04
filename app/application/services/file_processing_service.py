from pathlib import Path
from typing import List, Dict
import tempfile
import shutil
from uuid import uuid4
import asyncio
import time

from app.domain.entities.file_info import ProcessingResult, FileInfo, MediaType
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.database import get_db
from app.infrastructure.utils.content_extractor import ContentExtractor
from app.infrastructure.file_processors.image_processor import ImageProcessor

class FileProcessingService:
    
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
        self.content_extractor = ContentExtractor()
        self.image_processor = ImageProcessor()
    
    async def process_file(self, file_content: bytes, original_filename: str) -> ProcessingResult:
        import time
        start_time = time.time()
        
        file_id = uuid4()
        file_extension = Path(original_filename).suffix
        saved_file_path = self.upload_dir / f"{file_id}{file_extension}"
        
        with open(saved_file_path, "wb") as f:
            f.write(file_content)
        
        temp_dirs_to_cleanup = []
        
        try:
            if self.content_extractor.can_extract(original_filename):
                return await self._process_with_extraction(
                    saved_file_path, original_filename, start_time, temp_dirs_to_cleanup
                )
            else:
                return await self._process_direct(
                    saved_file_path, original_filename, start_time
                )
            
        except Exception as e:
            if saved_file_path.exists():
                saved_file_path.unlink()
            
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=f"Error processing file: {str(e)}",
                processing_time=processing_time
            )
        finally:
            await self._cleanup_temp_dirs(temp_dirs_to_cleanup)
    
    async def _process_with_extraction(self, file_path: Path, original_filename: str, 
                                    start_time: float, temp_dirs_to_cleanup: list) -> ProcessingResult:
        
        extracted_files, temp_dir = await self.content_extractor.extract_content(
            file_path, original_filename
        )
        temp_dirs_to_cleanup.append(temp_dir)
        
        image_files = []
        for extracted_file in extracted_files:
            if self.image_processor.can_process(extracted_file.name):
                image_files.append(extracted_file)
        
        if not image_files:
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message="No supported images found in extracted content",
                processing_time=processing_time
            )
        
        image_result = await self.image_processor.process_multiple_images(image_files)
        
        if not image_result.success:
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=image_result.error_message,
                processing_time=processing_time
            )
        
        processed_files = await self._save_files_to_db_and_storage(
            image_result.extracted_files, file_path, original_filename
        )
        
        processing_time = time.time() - start_time
        return ProcessingResult(
            success=True,
            extracted_files=processed_files,
            processing_time=processing_time
        )
    
    async def _process_direct(self, file_path: Path, original_filename: str, start_time: float) -> ProcessingResult:
        
        if not self.image_processor.can_process(original_filename):
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=f"Unsupported file type: {Path(original_filename).suffix}",
                processing_time=processing_time
            )
        
        result = await self.image_processor.process(file_path, original_filename)
        
        if not result.success:
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=result.error_message,
                processing_time=processing_time
            )
        
        processed_files = await self._save_files_to_db_and_storage(
            result.extracted_files, file_path, original_filename
        )
        
        processing_time = time.time() - start_time
        return ProcessingResult(
            success=True,
            extracted_files=processed_files,
            processing_time=processing_time
        )
    
    async def _save_files_to_db_and_storage(self, file_infos: List[FileInfo], 
                                          source_file_path: Path, original_filename: str) -> List[FileInfo]:
        db = next(get_db())
        file_repository = FileRepository(db)
        
        processed_files = []
        source_file_id = uuid4()
        
        for file_info in file_infos:
            if file_info.file_path.exists():
                new_file_id = file_info.id
                new_extension = Path(file_info.file_path).suffix
                new_file_path = self.upload_dir / f"{new_file_id}{new_extension}"
                
                shutil.copy2(file_info.file_path, new_file_path)
                
                file_info.file_path = new_file_path
                file_info.file_size = new_file_path.stat().st_size
                file_info.extracted_from = source_file_id
                
                file_repository.create(file_info)
                processed_files.append(file_info)
            else:
                print(f"Warning: File {file_info.file_path} does not exist, skipping")
        
        return processed_files
    
    async def _cleanup_temp_dirs(self, temp_dirs: List[Path]):
        for temp_dir in temp_dirs:
            if temp_dir and temp_dir.exists():
                try:
                    await asyncio.get_event_loop().run_in_executor(
                        None, self._remove_directory, temp_dir
                    )
                    print(f"Cleaned up temp directory: {temp_dir}")
                except Exception as e:
                    print(f"Error cleaning up {temp_dir}: {e}")
    
    def _remove_directory(self, path: Path):
        import shutil
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)