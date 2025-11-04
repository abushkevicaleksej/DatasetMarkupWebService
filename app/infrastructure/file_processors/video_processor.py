import tempfile
from pathlib import Path
from uuid import uuid4
import asyncio
from typing import List
import mimetypes

from app.domain.entities.file_info import FileInfo, MediaType, ProcessingResult
from app.domain.interfaces.file_processor import FileProcessor

class VideoProcessor(FileProcessor):
    
    @property
    def supported_extensions(self) -> List[str]:
        return ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v']
    
    async def process(self, file_path: Path, original_filename: str) -> ProcessingResult:
        import time
        start_time = time.time()
        
        try:
            extracted_files = []
            source_file_id = uuid4()
            
            temp_dir = tempfile.mkdtemp(prefix="video_processor_")
            temp_path = Path(temp_dir)
            
            try:
                frames = await self._extract_frames(file_path, temp_path)
                
                for frame_path in frames:
                    if frame_path.exists():
                        mime_type = 'image/jpeg'
                        
                        file_info = FileInfo(
                            id=uuid4(),
                            original_filename=f"{original_filename}_frame_{frame_path.stem}.jpg",
                            file_path=frame_path,
                            media_type=MediaType.IMAGE,
                            mime_type=mime_type,
                            file_size=frame_path.stat().st_size,
                            extracted_from=source_file_id
                        )
                        extracted_files.append(file_info)
                    else:
                        print(f"Warning: Frame {frame_path} does not exist")
                
                processing_time = time.time() - start_time
                return ProcessingResult(
                    success=True,
                    extracted_files=extracted_files,
                    processing_time=processing_time
                )
                
            except Exception as e:
                import shutil
                if temp_path.exists():
                    shutil.rmtree(temp_path)
                raise
                
        except Exception as e:
            processing_time = time.time() - start_time
            return ProcessingResult(
                success=False,
                extracted_files=[],
                error_message=f"Error processing video file: {str(e)}",
                processing_time=processing_time
            )
    
    async def _extract_frames(self, video_path: Path, output_dir: Path, fps: int = 1) -> List[Path]:
        try:
            import subprocess
            
            output_pattern = output_dir / "frame_%04d.jpg"
            command = [
                'ffmpeg', '-i', str(video_path),
                '-vf', f'fps={fps}',
                '-qscale:v', '2',
                str(output_pattern)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                raise Exception(f"FFmpeg error: {error_msg}")
            
            frames = list(output_dir.glob("frame_*.jpg"))
            if not frames:
                raise Exception("No frames extracted from video")
                
            return frames
            
        except Exception as e:
            import shutil
            if output_dir.exists():
                for frame_file in output_dir.glob("frame_*.jpg"):
                    frame_file.unlink(missing_ok=True)
            raise Exception(f"Frame extraction failed: {str(e)}")