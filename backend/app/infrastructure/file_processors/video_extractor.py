import asyncio
from pathlib import Path
from typing import List

import cv2

from app.domain.interfaces.file_processor import ExtractorProcessor

class VideoExtractor(ExtractorProcessor):
    
    @property
    def supported_extensions(self) -> List[str]:
        return ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v']
    
    async def process(self, file_path: Path, original_filename: str):
        raise NotImplementedError("Use extract() method via ContentExtractor")
    
    async def extract(self, file_path: Path, output_dir: Path, fps: int = 1) -> List[Path]:
        try:
            frames = await asyncio.to_thread(self._extract_frames_sync, file_path, output_dir, fps)
            return frames
        except Exception as e:
            if output_dir.exists():
                for frame_file in output_dir.glob("frame_*.jpg"):
                    frame_file.unlink(missing_ok=True)
            raise Exception(f"Frame extraction failed: {str(e)}")
    
    def _extract_frames_sync(self, file_path: Path, output_dir: Path, fps: int) -> List[Path]:
        cap = cv2.VideoCapture(str(file_path))
        if not cap.isOpened():
            raise Exception(f"Cannot open video file: {file_path}")
        
        try:
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            if video_fps <= 0:
                raise Exception("Invalid video FPS")
            
            frame_interval = max(1, int(round(video_fps / fps)))
            
            output_dir.mkdir(parents=True, exist_ok=True)
            frame_paths = []
            frame_count = 0
            saved_count = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count % frame_interval == 0:
                    out_path = output_dir / f"frame_{saved_count:04d}.jpg"
                    success = cv2.imwrite(str(out_path), frame)
                    if not success:
                        raise Exception(f"Failed to write frame: {out_path}")
                    frame_paths.append(out_path)
                    saved_count += 1
                
                frame_count += 1
            
            if not frame_paths:
                raise Exception("No frames extracted from video")
            
            return frame_paths
        
        finally:
            cap.release()