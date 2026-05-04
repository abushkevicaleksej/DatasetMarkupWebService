import shutil
from pathlib import Path
from typing import List
import asyncio

class CleanupService:
    def __init__(self):
        self.temp_dirs: List[Path] = []
    
    def register_temp_dir(self, temp_dir: Path):
        self.temp_dirs.append(temp_dir)
    
    async def cleanup_temp_dirs(self):
        for temp_dir in self.temp_dirs:
            if temp_dir.exists():
                try:
                    await asyncio.get_event_loop().run_in_executor(
                        None, self._remove_directory, temp_dir
                    )
                    print(f"Cleaned up temp directory: {temp_dir}")
                except Exception as e:
                    print(f"Error cleaning up {temp_dir}: {e}")
        
        self.temp_dirs.clear()
    
    def _remove_directory(self, path: Path):
        if path.exists():
            shutil.rmtree(path)

cleanup_service = CleanupService()
