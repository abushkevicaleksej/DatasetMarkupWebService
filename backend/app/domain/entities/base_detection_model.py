from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

import numpy as np

from app.domain.ml_schemas import BoundingBoxPrediction

class BaseDetectionModel(ABC):

    @abstractmethod
    def load(self, model_path: str, config_path: Optional[str] = None) -> None:
        pass

    @abstractmethod
    def predict(self, image: np.ndarray, confidence_threshold: float = 0.5) -> List[BoundingBoxPrediction]:
        pass

    @abstractmethod
    def train(self, train_data: List[Dict[str, Any]], epochs: int, batch_size: int, learning_rate: float, **kwargs) -> Dict[str, Any]:
        pass

    @abstractmethod
    def save(self, path: str) -> None:
        pass

    @abstractmethod
    def supports_incremental_learning(self) -> bool:
        pass

    @abstractmethod
    def add_new_classes(self, new_class_names: List[str]) -> None:
        pass

    def freeze_backbone(self, frozen: bool = True) -> None:
        pass