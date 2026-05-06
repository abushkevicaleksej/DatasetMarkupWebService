import cv2
from pathlib import Path
from typing import List, Dict
from app.infrastructure.repositories.file_repository import FileRepository
from app.application.services.model_service import ModelService
from app.domain.models import User

class ActiveLearningService:
    def __init__(self, file_repository: FileRepository, model_service: ModelService, current_user: User):
        self.file_repository = file_repository
        self.model_service = model_service
        self.current_user = current_user

    def _check_access(self, file):
        if self.current_user.role != "admin" and file.user_id != self.current_user.id:
            raise ValueError("Access denied")

    async def get_next_batch(self, task_id: str, model_id: str, batch_size: int = 10) -> List[Dict]:
        sample_files = self.file_repository.get_random_unannotated_files(task_id, limit=50)
        
        if not sample_files:
            return []

        model = self.model_service._get_model(model_id)

        for file in sample_files:
            self._check_access(file)
            
            image_path = Path(file.file_path)
            if not image_path.exists():
                continue

            image = cv2.imread(str(image_path))
            if image is None:
                continue
                
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            predictions, uncertainty = model.predict_with_uncertainty(image_rgb)
            
            self.file_repository.update_file(file.id, {"uncertainty_score": uncertainty})

        top_files = self.file_repository.get_top_uncertain_files(task_id, limit=batch_size)
        
        return [
            {
                "id": str(f.id),
                "original_filename": f.original_filename,
                "file_path": f.file_path,
                "uncertainty_score": f.uncertainty_score
            }
            for f in top_files
        ]
