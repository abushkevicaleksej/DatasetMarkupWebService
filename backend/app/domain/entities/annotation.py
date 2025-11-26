from uuid import UUID
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, List

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