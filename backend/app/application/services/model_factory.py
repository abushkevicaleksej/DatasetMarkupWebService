from app.domain.entities.base_detection_model import BaseDetectionModel
from app.infrastructure.adapters.yolo_adapter import YOLOAdapter
from app.infrastructure.adapters.pytorch_adapter import PyTorchAdapter
from app.domain.ml_schemas import ModelFramework

class ModelFactory:
    @staticmethod
    def create_model(framework: ModelFramework, **kwargs) -> BaseDetectionModel:
        if framework == ModelFramework.YOLO:
            return YOLOAdapter()
        elif framework == ModelFramework.PYTORCH:
            num_classes = kwargs.get('num_classes', 91)
            return PyTorchAdapter(num_classes=num_classes)
        else:
            raise ValueError(f"Unsupported framework: {framework}")
