from typing import List, Dict, Any, Optional
from pathlib import Path

import numpy as np
from ultralytics import YOLO

from app.domain.ml_schemas import BoundingBoxPrediction
from app.domain.entities.base_detection_model import BaseDetectionModel

class YOLOAdapter(BaseDetectionModel):
    def __init__(self):
        self.model = None
        self.model_path = None

    def load(self, model_path: str, config_path: Optional[str] = None) -> None:
        self.model = YOLO(model_path)
        self.model_path = model_path

    def predict(self, image: np.ndarray, confidence_threshold: float = 0.5) -> List[BoundingBoxPrediction]:
        results = self.model(image, conf=confidence_threshold)
        predictions = []
        for result in results:
            if result.boxes is not None:
                h, w = image.shape[:2]
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = box.conf[0].cpu().numpy()
                    cls = int(box.cls[0].cpu().numpy())
                    class_name = self.model.names[cls]
                    predictions.append(BoundingBoxPrediction(
                        x=float(x1 / w),
                        y=float(y1 / h),
                        width=float((x2 - x1) / w),
                        height=float((y2 - y1) / h),
                        label=class_name,
                        confidence=float(conf)
                    ))
        return predictions

    def train(self, train_data: List[Dict[str, Any]], epochs: int, batch_size: int, learning_rate: float, **kwargs) -> Dict[str, Any]:
        data_yaml = kwargs.get('data_yaml')
        if not data_yaml:
            raise ValueError("YOLO requires 'data_yaml' in kwargs pointing to dataset YAML")
        results = self.model.train(
            data=data_yaml,
            epochs=epochs,
            batch=batch_size,
            lr0=learning_rate,
            **{k: v for k, v in kwargs.items() if k not in ['data_yaml']}
        )
        return results.results_dict

    def save(self, path: str) -> None:
        self.model.save(path)

    def supports_incremental_learning(self) -> bool:
        return True

    def add_new_classes(self, new_class_names: List[str]) -> None:
        raise NotImplementedError("YOLO does not support dynamic class expansion via this interface. Please retrain from scratch.")
