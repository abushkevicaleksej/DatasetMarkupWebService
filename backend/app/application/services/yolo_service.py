from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

import cv2
from ultralytics import YOLO

from app.domain.ml_schemas import BoundingBoxPrediction, PredictionResponse
from app.infrastructure.repositories.ml_model_repository import MLModelRepository, TrainingSessionRepository
from app.infrastructure.repositories.file_repository import FileRepository
from app.infrastructure.repositories.annotation_repository import AnnotationRepository
from app.infrastructure.database import get_db

class YOLOService:
    def __init__(self):
        self.loaded_models: Dict[str, Any] = {}
        self.model_cache = {}
        self.runs_dir = Path("runs") 

    def load_model(self, model_path: str, config_path: Optional[str] = None) -> Any:
        if model_path in self.model_cache:
            return self.model_cache[model_path]

        try:
            model = YOLO(model_path)
            self.model_cache[model_path] = model
            return model
        except Exception as e:
            raise

    def run_training(self, model_path: str, yaml_path: str, epochs: int, batch_size: int, lr: float, session_id: str):

        try:
            print(f"Starting YOLO training for session {session_id}")
            print(f"Config: {yaml_path}")
            
            model = YOLO(model_path) 

            results = model.train(
                data=yaml_path,
                epochs=epochs,
                batch=batch_size,
                lr0=lr,
                imgsz=640,
                project=str(self.runs_dir),
                name=f"train_{session_id}",
                exist_ok=True,
                verbose=True
            )
            
            print(f"Training finished successfully. Saved to: {model.trainer.save_dir}")
            
            
        except Exception as e:
            print(f"Training failed for session {session_id}: {e}")


    async def predict_single_image(self, model_id: str, file_path: Path,
                                   confidence_threshold: float = 0.5) -> List[BoundingBoxPrediction]:
        db = next(get_db())
        model_repo = MLModelRepository(db)

        model_info = model_repo.get_model(model_id)
        if not model_info:
            raise ValueError(f"Model {model_id} not found")

        model = self.load_model(model_info.model_path, model_info.config_path)

        image = cv2.imread(str(file_path))
        if image is None:
            raise ValueError(f"Could not load image: {file_path}")

        start_time = datetime.now()
        results = model(image, conf=confidence_threshold)
        processing_time = (datetime.now() - start_time).total_seconds()

        predictions = []

        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = box.conf[0].cpu().numpy()
                    cls = int(box.cls[0].cpu().numpy())

                    class_name = model.names[cls]

                    height, width = image.shape[:2]
                    x_top_left = x1 / width
                    y_top_left = y1 / height
                    bbox_width = (x2 - x1) / width
                    bbox_height = (y2 - y1) / height

                    prediction = BoundingBoxPrediction(
                        x=float(x_top_left),
                        y=float(y_top_left),
                        width=float(bbox_width),
                        height=float(bbox_height),
                        label=class_name,
                        confidence=float(conf)
                    )
                    predictions.append(prediction)

        return predictions, processing_time

    async def batch_predict(self, model_id: str, file_paths: List[Path],
                            confidence_threshold: float = 0.5) -> Dict[Path, PredictionResponse]:
        results = {}

        for file_path in file_paths:
            try:
                predictions, processing_time = await self.predict_single_image(
                    model_id, file_path, confidence_threshold
                )

                results[file_path] = PredictionResponse(
                    file_id=str(file_path.stem),
                    predictions=predictions,
                    processing_time=processing_time,
                    total_predictions=len(predictions)
                )
            except Exception as e:
                continue

        return results

    async def online_learning(self, model_id: str, task_id: str,
                              epochs: int = 10, batch_size: int = 8,
                              learning_rate: float = 0.001) -> str:
        db = next(get_db())
        model_repo = MLModelRepository(db)
        training_repo = TrainingSessionRepository(db)
        annotation_repo = AnnotationRepository(db)
        file_repo = FileRepository(db)

        model_info = model_repo.get_model(model_id)
        if not model_info:
            raise ValueError(f"Model {model_id} not found")

        session = training_repo.create_session({
            'model_id': model_id,
            'task_id': task_id,
            'epochs': epochs,
            'batch_size': batch_size,
            'learning_rate': learning_rate,
            'status': 'preparing'
        })

        try:
            annotations = annotation_repo.get_annotations_for_task(task_id)

            if not annotations:
                raise ValueError(f"No annotations found for task {task_id}")

            training_data = self._prepare_training_data(annotations, file_repo)

            training_repo.update_session(session.id, {
                'status': 'running',
                'train_files_count': len(training_data),
                'start_time': datetime.now()
            })

            model = self.load_model(model_info.model_path)

            results = model.train(
                data='coco128.yaml',
                epochs=epochs,
                batch=batch_size,
                lr0=learning_rate,
                resume=False
            )

            updated_model_path = self._save_updated_model(model, model_info)

            training_repo.update_session(session.id, {
                'status': 'completed',
                'final_accuracy': results.results_dict.get('metrics/mAP50-95(B)', 0),
                'final_loss': results.results_dict.get('train/box_loss', 0),
                'end_time': datetime.now(),
                'training_logs': results.results_dict
            })

            return session.id

        except Exception as e:
            training_repo.update_session(session.id, {
                'status': 'failed',
                'end_time': datetime.now()
            })
            raise e

    def _prepare_training_data(self, annotations, file_repo) -> List[Dict]:
        training_data = []

        for annotation in annotations:
            file_info = file_repo.get_by_id(annotation.file_id)
            if not file_info:
                continue

            yolo_annotations = []
            for bbox in annotation.bounding_boxes:
                class_id = self._get_class_id(bbox.label)
                cnt_x = bbox.x + (bbox.width / 2)
                cnt_y = bbox.y + (bbox.height / 2)
                yolo_bbox = f"{class_id} {cnt_x} {cnt_y} {bbox.width} {bbox.height}"
                yolo_annotations.append(yolo_bbox)

            training_data.append({
                'image_path': file_info.file_path,
                'annotations': yolo_annotations
            })

        return training_data

    def _get_class_id(self, class_name: str) -> int:
        class_mapping = {
            'person': 0, 'bicycle': 1, 'car': 2, 'motorcycle': 3,
            'airplane': 4, 'bus': 5, 'train': 6, 'truck': 7,
            'boat': 8, 'traffic light': 9, 'fire hydrant': 10,
            'stop sign': 11, 'parking meter': 12, 'bench': 13,
            'bird': 14, 'cat': 15, 'dog': 16, 'horse': 17,
            'sheep': 18, 'cow': 19, 'elephant': 20, 'bear': 21,
            'zebra': 22, 'giraffe': 23
        }
        return class_mapping.get(class_name.lower(), 0)

    def _save_updated_model(self, model, original_model_info) -> str:
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_model_name = f"{original_model_info.name}_finetuned_{timestamp}.pt"
        new_model_path = models_dir / new_model_name

        model.save(new_model_path)

        return str(new_model_path)

yolo_service = YOLOService()