from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ModelType(str, Enum):
    OBJECT_DETECTION = "object_detection"
    SEGMENTATION = "segmentation"
    CLASSIFICATION = "classification"


class ModelFramework(str, Enum):
    YOLO = "yolo"
    DETECTRON = "detectron"
    TORCHVISION = "torchvision"


class MLModelCreate(BaseModel):
    name: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    model_type: ModelType = Field(..., description="Type of model")
    framework: ModelFramework = Field(..., description="Model framework")
    description: Optional[str] = Field(None, description="Model description")
    model_path: str = Field(..., description="Path to model weights")
    config_path: Optional[str] = Field(None, description="Path to config file")
    supported_classes: List[str] = Field(..., description="List of supported classes")
    input_size: Dict[str, int] = Field(..., description="Input size for model")
    confidence_threshold: float = Field(0.5, description="Default confidence threshold")
    is_active: bool = Field(False, description="Whether model is active")


class MLModelResponse(BaseModel):
    id: str
    name: str
    version: str
    model_type: str
    framework: str
    description: Optional[str]
    supported_classes: List[str]
    input_size: Dict[str, int]
    confidence_threshold: float
    is_active: bool
    is_pretrained: bool
    accuracy: Optional[float]
    created_at: datetime
    updated_at: datetime


class PredictionRequest(BaseModel):
    file_ids: List[str] = Field(..., description="List of file IDs to process")
    model_id: str = Field(..., description="Model ID to use for prediction")
    confidence_threshold: float = Field(0.5, description="Confidence threshold")
    max_predictions: int = Field(5, description="Maximum number of images to process")
    task_id: Optional[str] = Field(None, description="Task ID to save annotations to")


class BoundingBoxPrediction(BaseModel):
    x: float = Field(..., description="Normalized x coordinate")
    y: float = Field(..., description="Normalized y coordinate")
    width: float = Field(..., description="Normalized width")
    height: float = Field(..., description="Normalized height")
    label: str = Field(..., description="Predicted label")
    confidence: float = Field(..., description="Confidence score")


class PredictionResponse(BaseModel):
    file_id: str
    predictions: List[BoundingBoxPrediction]
    processing_time: float
    total_predictions: int


class OnlineLearningRequest(BaseModel):
    model_id: str = Field(..., description="Model ID to fine-tune")
    task_id: str = Field(..., description="Task ID with annotations")
    epochs: int = Field(10, description="Number of training epochs")
    batch_size: int = Field(8, description="Batch size for training")
    learning_rate: float = Field(0.001, description="Learning rate")
    validation_split: float = Field(0.2, description="Validation split ratio")


class TrainingSessionResponse(BaseModel):
    id: str
    model_id: str
    status: str
    current_epoch: int
    total_epochs: int
    train_files_count: int
    val_files_count: int
    final_accuracy: Optional[float]
    final_loss: Optional[float]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
