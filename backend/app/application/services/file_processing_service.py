from pathlib import Path
from typing import List, Optional
import shutil
from uuid import uuid4
import asyncio
import time

from app.domain.models import User
from app.domain.entities.file_info import ProcessingResult, FileInfo
from app.infrastructure.utils.content_extractor import ContentExtractor
from app.infrastructure.file_processors.image_processor import ImageProcessor

class FileProcessingService:
    def __init__(self, file_repository, task_repository, current_user: User):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
        self.content_extractor = ContentExtractor()
        self.image_processor = ImageProcessor()
        self.file_repository = file_repository
        self.task_repository = task_repository
        self.current_user = current_user

    def _get_target_user_id(self):
        return None if self.current_user.role == "admin" else self.current_user.id

    def get_all_files(self):
        return self.file_repository.get_all(self._get_target_user_id())

    def get_file(self, file_id: str):
        file = self.file_repository.get_by_id(file_id, self._get_target_user_id())
        if not file:
            raise ValueError("File not found or access denied")
        return file
    
    def update_file(self, file_id: str):
        self.get_file(file_id)
        return self.file_repository.update_file(file_id)
        
    def delete_file(self, file_id: str):
        self.get_file(file_id)
        return self.file_repository.delete(file_id)

    async def upload_and_process(
        self, 
        file_content: bytes, 
        original_filename: str,
        task_id: Optional[str] = None
    ) -> dict:
        if task_id:
            task = self.task_repository.get_by_id(task_id) if self.task_repository else None
            if not task:
                raise ValueError("Task not found")
        result = await self.process_file(file_content, original_filename)
        if not result.success:
            print(result.success)
            raise ValueError(result.error_message)
        
        if task_id and result.extracted_files:
            file_ids = [str(file_info.id) for file_info in result.extracted_files]
            self.file_repository.update_task_id_for_files(file_ids, task_id)
        
        response = {
            "success": True,
            "processing_time": result.processing_time,
            "extracted_files": [
                {
                    "id": str(f.id),
                    "original_filename": f.original_filename,
                    "media_type": f.media_type.value,
                    "file_size": f.file_size,
                    "width": f.width,
                    "height": f.height
                }
                for f in result.extracted_files
            ]
        }
        redirect = f"/workspace?taskId={task_id}" if task_id else "/workspace"
        return {**response, "redirect_url": redirect}

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
            image_result.extracted_files
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
            result.extracted_files
        )
        
        processing_time = time.time() - start_time
        return ProcessingResult(
            success=True,
            extracted_files=processed_files,
            processing_time=processing_time
        )

    async def _save_files_to_db_and_storage(self, file_infos: List[FileInfo]) -> List[FileInfo]:
        processed_files = []
        source_file_id = uuid4()

        for file_info in file_infos:
            if file_info.file_path.exists():
                new_file_id = file_info.id
                new_extension = Path(file_info.file_path).suffix
                new_file_path = self.upload_dir / f"{new_file_id}{new_extension}"

                shutil.copy2(file_info.file_path, new_file_path)

                data = {
                    "id": str(new_file_id),
                    "original_filename": file_info.original_filename,
                    "file_path": str(new_file_path),
                    "media_type": file_info.media_type.value,
                    "mime_type": file_info.mime_type,
                    "file_size": new_file_path.stat().st_size,
                    "width": file_info.width,
                    "height": file_info.height,
                    "duration": file_info.duration,
                    "extracted_from": str(source_file_id),
                    "user_id": self.current_user.id,
                }
                self.file_repository.create(data)

                file_info.file_path = new_file_path
                file_info.file_size = data["file_size"]
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
