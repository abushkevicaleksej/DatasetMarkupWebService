import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import List, Dict

from sqlalchemy.orm import Session
from app.infrastructure.repositories.task_repository import TaskRepository
from app.infrastructure.repositories.file_repository import FileRepository

class ExportService:
    def __init__(self, db: Session):
        self.db = db
        self.task_repo = TaskRepository(db)
        self.file_repo = FileRepository(db)

    def export_task_yolo(self, task_id: str) -> str:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise ValueError("Task not found")

        unique_labels = sorted(list(set(
            bbox.label 
            for annotation in task.annotations 
            for bbox in annotation.bounding_boxes
        )))
        label_map = {label: idx for idx, label in enumerate(unique_labels)}

        with tempfile.TemporaryDirectory() as temp_dir:
            base_path = Path(temp_dir)
            dataset_root = base_path / task.name.replace(" ", "_")
            
            images_dir = dataset_root / "images"
            labels_dir = dataset_root / "labels"
            
            images_dir.mkdir(parents=True, exist_ok=True)
            labels_dir.mkdir(parents=True, exist_ok=True)

            with open(dataset_root / "classes.txt", "w", encoding="utf-8") as f:
                for label in unique_labels:
                    f.write(f"{label}\n")

            annotations_by_file = {ann.file_id: ann for ann in task.annotations}

            for file in task.files:
                src_path = Path(file.file_path)
                if not src_path.exists():
                    continue
                
                safe_filename = Path(file.original_filename).name
                dst_image_path = images_dir / safe_filename
                shutil.copy2(src_path, dst_image_path)

                label_filename = safe_filename.rsplit('.', 1)[0] + ".txt"
                label_path = labels_dir / label_filename

                annotation = annotations_by_file.get(file.id)
                
                if annotation and annotation.bounding_boxes:
                    with open(label_path, "w", encoding="utf-8") as lf:
                        for bbox in annotation.bounding_boxes:
                            class_id = label_map.get(bbox.label)
                            if class_id is None:
                                continue

                            is_normalized = bbox.x <= 1.0 and bbox.width <= 1.0
                            
                            if is_normalized:
                                cx, cy, w, h = bbox.x, bbox.y, bbox.width, bbox.height
                                
                            else:
                                if not file.width or not file.height:
                                    continue # Нельзя нормализовать без размеров
                                
                                w = bbox.width / file.width
                                h = bbox.height / file.height
                                cx = (bbox.x + (bbox.width / 2)) / file.width
                                cy = (bbox.y + (bbox.height / 2)) / file.height

                            lf.write(f"{class_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")
                else:
                    open(label_path, 'a').close()

            output_zip_name = f"{task.name}_yolo_export.zip"
            output_zip_path = os.path.join(tempfile.gettempdir(), output_zip_name)
            
            with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(dataset_root):
                    for f in files:
                        file_abs_path = os.path.join(root, f)
                        arcname = os.path.relpath(file_abs_path, start=base_path)
                        zipf.write(file_abs_path, arcname)
            
            return output_zip_path