from pathlib import Path
from ultralytics import YOLO

class YoloService:
    def __init__(self):
        self.runs_dir = Path("runs") 

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
                project=str(self.runs_dir), # Корневая папка результатов
                name=f"train_{session_id}", # Имя подпапки
                exist_ok=True,
                verbose=True
            )
            
            print(f"Training finished successfully. Saved to: {model.trainer.save_dir}")
            
            
        except Exception as e:
            print(f"Training failed for session {session_id}: {e}")

yolo_service = YoloService()
