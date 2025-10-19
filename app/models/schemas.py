from pydantic import BaseModel
from typing import List, Optional

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class AnnotationCreate(BaseModel):
    image_id: str
    bbox: BoundingBox

class ImageInfo(BaseModel):
    id: str
    filename: str
    width: int
    height: int
    url: str