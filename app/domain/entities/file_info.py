from dataclasses import dataclass
from pathlib import Path
from enum import Enum
from typing import List, Optional
from uuid import UUID

class MediaType(Enum):
    IMAGE = "image"
    VIDEO = "video"
    ARCHIVE = "archive"

@dataclass
class FileInfo:
    id: UUID
    original_filename: str
    file_path: Path
    media_type: MediaType
    mime_type: str
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    extracted_from: Optional[UUID] = None 

@dataclass
class ProcessingResult:
    success: bool
    extracted_files: List[FileInfo]
    error_message: Optional[str] = None
    processing_time: float = 0.0
