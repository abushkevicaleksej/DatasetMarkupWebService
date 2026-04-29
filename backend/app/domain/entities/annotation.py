from uuid import UUID
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

@dataclass
class BoundingBox:
    id: UUID | None
    x: float
    y: float
    width: float
    height: float
    label: str
    confidence: float = 1.0


@dataclass
class Annotation:
    id: UUID
    file_id: UUID
    bounding_boxes: List[BoundingBox]
    created_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class BoundingBoxCreate(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str = "object"
    confidence: float = 1.0

class BoundingBoxUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    label: Optional[str] = None

class AnnotationCreateRequest(BaseModel):
    file_id: str
    task_id: str
    bounding_boxes: List[BoundingBoxCreate]

class SmartBBoxRequest(BaseModel):
    file_id: str
    task_id: str
    x: int
    y: int