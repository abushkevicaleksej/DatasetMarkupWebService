import asyncio
from pathlib import Path
from typing import List

from app.domain.interfaces.file_processor import ExtractorProcessor


class VideoExtractor(ExtractorProcessor):
    
    @property
    def supported_extensions(self) -> List[str]:
        return ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v']
    

    async def process(self, file_path: Path, original_filename: str):
        raise NotImplementedError("Use extract() method via ContentExtractor")
    

    async def extract(self, file_path: Path, output_dir: Path, fps: int = 1) -> List[Path]:
        try:
            import subprocess
            
            output_pattern = output_dir / "frame_%04d.jpg"
            command = [
                'ffmpeg', '-i', str(file_path),
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
