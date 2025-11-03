from abc import ABC, abstractmethod
from pathlib import Path
from typing import List
from app.domain.entities.file_info import ProcessingResult

class FileProcessor(ABC):
    
    @property
    @abstractmethod
    def supported_extensions(self) -> List[str]:
        pass

    @abstractmethod
    async def process(self, file_path: Path, original_filename: str) -> ProcessingResult:
        pass

    def can_process(self, filename: str) -> bool:
        return any(filename.lower().endswith(ext) for ext in self.supported_extensions)