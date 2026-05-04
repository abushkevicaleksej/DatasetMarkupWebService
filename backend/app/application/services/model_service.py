import logging
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

import cv2
import httpx
from fastapi import BackgroundTasks

from app.domain.ml_schemas import (
    PredictionResponse, 
    OnlineLearningRequest, 
)
from app.domain.entities.base_detection_model import BaseDetectionModel
from app.application.services.model_factory import ModelFactory, ModelFramework
from app.application.services.export_service import ExportService

from app.settings import VALIDATION_URL

logger = logging.getLogger(__name__)

class ModelService:
    def __init__(self, model_repo, training_session_repo, anno_repo, file_repo, pred_repo):
        self.model_cache: Dict[str, BaseDetectionModel] = {}
        self._class_mappings: Dict[str, Dict[str, int]] = {}
        self.model_repository = model_repo
        self.training_session_repository = training_session_repo
        self.annotation_repository = anno_repo
        self.file_repository = file_repo
        self.prediction_repository = pred_repo

    def _get_model(self, model_id: str) -> BaseDetectionModel:
        if model_id in self.model_cache:
            return self.model_cache[model_id]

        model_info = self.model_repository.get_model(model_id)
        if not model_info:
            raise ValueError(f"Model {model_id} not found")

        framework = ModelFramework(model_info.framework)
        model = ModelFactory.create_model(framework)
        model.load(model_info.model_path, model_info.config_path)
        self.model_cache[model_id] = model
        return model

    async def predict_single_image(
        self, model_id: str, 
        file_path: Path, 
        confidence_threshold: float = 0.5
    ) -> tuple[List[Any], float]:
        model = self._get_model(model_id)
        image = cv2.imread(str(file_path))
        if image is None:
            raise ValueError(f"Could not load image: {file_path}")
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        start = datetime.now()
        predictions = model.predict(image_rgb, confidence_threshold)
        elapsed = (datetime.now() - start).total_seconds()
        return predictions, elapsed

    async def online_learning(
        self,
        model_id: str,
        task_id: str,
        session_id: str,
        epochs: int = 10,
        batch_size: int = 8,
        learning_rate: float = 0.001,
        dataset_config: Optional[str] = None,
        **kwargs
    ) -> str:
        model = self._get_model(model_id)

        model_info = self.model_repository.get_model(model_id)
        if not model_info:
            raise ValueError(f"Model {model_id} not found")

        self._build_class_mapping(model_id, model_info.supported_classes)

        try:
            if dataset_config:
                train_data = None
                extra_kwargs = {'data_yaml': dataset_config}
                train_size = self._get_dataset_size_from_yaml(dataset_config)
                annotations = []
            else:
                annotations = self.annotation_repository.get_annotations_for_task(task_id)
                if not annotations:
                    raise ValueError(f"No annotations for task {task_id}")
                train_data = self._prepare_training_data(annotations, self.file_repository, model_id)
                extra_kwargs = {}
                train_size = len(train_data)

            new_classes = self._extract_new_classes(annotations, model_info.supported_classes)
            if new_classes and model.supports_incremental_learning():
                logger.info("Adding new classes to model: %s", new_classes)
                model.add_new_classes(new_classes)
                self._extend_class_mapping(model_id, new_classes)

            existing_session = self.training_session_repository.get_session(session_id)
            if existing_session:
                self.training_session_repository.update_session(session_id, {
                    'status': 'running',
                    'train_files_count': train_size,
                    'start_time': datetime.now()
                })
            else:
                self.training_session_repository.create_session({
                    'id': session_id,
                    'model_id': model_id,
                    'task_id': task_id,
                    'epochs': epochs,
                    'batch_size': batch_size,
                    'learning_rate': learning_rate,
                    'total_epochs': epochs,
                    'status': 'running',
                    'train_files_count': train_size,
                    'start_time': datetime.now()
                })

            logger.info("Starting training for session %s (%d samples)", session_id, train_size)
            metrics = model.train(
                train_data=train_data if train_data is not None else [],
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                **extra_kwargs,
                **kwargs
            )

            new_model_path = self._save_updated_model(model, model_id)
            self.model_repository.update_model(model_id, {'model_path': new_model_path, 'updated_at': datetime.now()})

            self.training_session_repository.update_session(session_id, {
                'status': 'completed',
                'final_accuracy': metrics.get('mAP', 0),
                'final_loss': metrics.get('loss', 0),
                'end_time': datetime.now(),
                'training_logs': metrics,
                'current_epoch': epochs
            })
            logger.info("Training completed for session %s", session_id)
            return session_id
        except Exception as e:
            logger.error("Training failed for session %s: %s", session_id, str(e), exc_info=True)
            self.training_session_repository.update_session(session_id, {
                'status': 'failed',
                'end_time': datetime.now(),
                'error_message': str(e)
            })
            raise

    def _get_dataset_size_from_yaml(self, yaml_path: str) -> int:
        import yaml
        from pathlib import Path
        with open(yaml_path, 'r') as f:
            cfg = yaml.safe_load(f)
        dataset_path = Path(cfg['path'])
        train_path = cfg.get('train')
        if isinstance(train_path, list):
            train_path = train_path[0]
        images_dir = dataset_path / train_path
        extensions = ('*.jpg', '*.jpeg', '*.png', '*.bmp', '*.JPG', '*.JPEG', '*.PNG')
        count = 0
        for ext in extensions:
            count += len(list(images_dir.glob(ext)))
        return count

    def _build_class_mapping(self, model_id: str, supported_classes: List[str]) -> None:
        self._class_mappings[model_id] = {
            name: idx for idx, name in enumerate(supported_classes)
        }

    def _extend_class_mapping(self, model_id: str, new_classes: List[str]) -> None:
        if model_id not in self._class_mappings:
            self._class_mappings[model_id] = {}

        current_max = max(self._class_mappings[model_id].values()) + 1 if self._class_mappings[model_id] else 0

        for cls in new_classes:
            self._class_mappings[model_id][cls] = current_max
            current_max += 1

    def _get_class_id(self, class_name: str, model_id: str) -> Optional[int]:
        mapping = self._class_mappings.get(model_id, {})
        class_id = mapping.get(class_name.lower())

        if class_id is None:
            logger.warning("Unknown class '%s' for model %s — skipping bounding box", class_name, model_id)

        return class_id

    def _prepare_training_data(self, annotations, file_repo, model_id: str) -> List[Dict]:
        training_data = []
        skipped_count = 0

        for ann in annotations:
            file_info = file_repo.get_by_id(ann.file_id)

            if not file_info:
                continue

            yolo_anns = []

            for bbox in ann.bounding_boxes:
                class_id = self._get_class_id(bbox.label, model_id)

                if class_id is None:
                    skipped_count += 1
                    continue

                cx = bbox.x + bbox.width / 2
                cy = bbox.y + bbox.height / 2
                yolo_anns.append([class_id, cx, cy, bbox.width, bbox.height])

            if yolo_anns:
                training_data.append({
                    'image_path': file_info.file_path,
                    'annotations': yolo_anns
                })

        if skipped_count:
            logger.warning("Skipped %d bounding boxes with unknown classes", skipped_count)
        return training_data

    def _extract_new_classes(self, annotations, supported_classes: List[str]) -> List[str]:
        known_classes = {c.lower() for c in supported_classes}
        annotated_classes = set()

        for ann in annotations:
            for bbox in ann.bounding_boxes:
                annotated_classes.add(bbox.label.lower())
        new_classes = list(annotated_classes - known_classes)

        if new_classes:
            logger.info("Found %d new classes not in model: %s", len(new_classes), new_classes)

        return new_classes

    def _save_updated_model(self, model: BaseDetectionModel, model_id: str) -> str:
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_path = models_dir / f"{model_id}_updated_{timestamp}.pt"
        model.save(str(new_path))
        return str(new_path)

    async def validate_model(self, model_data):
        model_path = Path(model_data.model_path)
        
        if not model_path.exists():
            raise ValueError("Model file not found")
        
        async with httpx.AsyncClient() as client:
            with open(model_path, "rb") as f:
                files = {"model_file": f}
                data = {"model_type": model_data.framework.value}
                response = await client.post(VALIDATION_URL, files=files, data=data)
                return response
            
    async def predict_and_save(self, request) -> List[PredictionResponse]:
        file_ids = request.file_ids[:request.max_predictions]
        files = self.file_repository.get_by_ids(file_ids)
        if not files:
            raise ValueError("No files found")

        results = []
        for file_info in files:
            try:
                predictions, processing_time = await self.predict_single_image(
                    request.model_id,
                    Path(file_info.file_path),
                    request.confidence_threshold
                )

                db_prediction = self.prediction_repository.create_prediction({
                    'model_id': request.model_id,
                    'file_id': file_info.id,
                    'confidence_threshold': request.confidence_threshold,
                    'total_predictions': len(predictions),
                    'processing_time': processing_time
                })

                bboxes_data = [
                    {
                        'x': p.x, 'y': p.y, 'width': p.width, 'height': p.height,
                        'label': p.label, 'confidence': p.confidence
                    }
                    for p in predictions
                ]
                self.prediction_repository.create_bounding_boxes(db_prediction.id, bboxes_data)

                if request.task_id:
                    self.annotation_repository.create_annotation(
                        file_id=file_info.id,
                        task_id=request.task_id,
                        bounding_boxes=bboxes_data
                    )

                results.append(PredictionResponse(
                    file_id=file_info.id,
                    predictions=predictions,
                    processing_time=processing_time,
                    total_predictions=len(predictions)
                ))

            except Exception as e:
                logger.error(f"Prediction failed for file {file_info.id}: {e}")

        return results
    
    async def start_online_learning_background(
        self,
        request: OnlineLearningRequest,
        export_service: ExportService,
        background_tasks: BackgroundTasks
    ) -> str:
        session_id = str(uuid.uuid4())
        base_train_dir = Path("training_data") / session_id

        try:
            yaml_path = export_service.prepare_dataset_for_training(
                request.task_id,
                str(base_train_dir)
            )
        except Exception as e:
            logger.error(f"Failed to prepare dataset for session {session_id}: {e}")
            raise

        async def _train():
            try:
                await self.online_learning(
                    model_id=request.model_id,
                    task_id=request.task_id,
                    session_id=session_id,
                    epochs=request.epochs,
                    batch_size=request.batch_size,
                    learning_rate=request.learning_rate,
                    dataset_config=yaml_path,
                )
            except Exception as e:
                logger.error(f"Background training failed for session {session_id}: {e}")

        background_tasks.add_task(_train)
        return session_id