from app.infrastructure.database import get_db
from app.infrastructure.repositories.ml_model_repository import MLModelRepository


def initialize_predefined_models():
    db = next(get_db())
    model_repo = MLModelRepository(db)

    predefined_models = [
        {
            'name': 'YOLOv8 Nano',
            'version': '8.0',
            'model_type': 'object_detection',
            'framework': 'yolo',
            'description': 'Ultralytics YOLOv8 Nano model - fastest and smallest',
            'model_path': 'yolov8n.pt',
            'supported_classes': [
                'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
                'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
                'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'
            ],
            'input_size': {'width': 640, 'height': 640},
            'confidence_threshold': 0.5,
            'is_active': True,
            'is_pretrained': True
        },
        {
            'name': 'YOLOv8 Small',
            'version': '8.0',
            'model_type': 'object_detection',
            'framework': 'yolo',
            'description': 'Ultralytics YOLOv8 Small model - balanced speed and accuracy',
            'model_path': 'yolov8s.pt',
            'supported_classes': [
                'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
                'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
                'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'
            ],
            'input_size': {'width': 640, 'height': 640},
            'confidence_threshold': 0.5,
            'is_active': True,
            'is_pretrained': True
        },
        {
            'name': 'YOLOv11 Small',
            'version': '11.0',
            'model_type': 'object_detection',
            'framework': 'yolo',
            'description': 'Ultralytics YOLOv11 Small model - latest version with improved accuracy',
            'model_path': 'yolov11s.pt',
            'supported_classes': [
                'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
                'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
                'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'
            ],
            'input_size': {'width': 640, 'height': 640},
            'confidence_threshold': 0.5,
            'is_active': True,
            'is_pretrained': True
        }
    ]

    for model_data in predefined_models:
        existing_models = model_repo.get_models_by_framework('yolo')
        model_exists = any(m.name == model_data['name'] for m in existing_models)

        if not model_exists:
            try:
                model_repo.create_model(model_data)
            except Exception as e:


initialize_predefined_models()