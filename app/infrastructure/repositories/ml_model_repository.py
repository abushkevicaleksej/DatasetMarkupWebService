from typing import List, Optional

from sqlalchemy.orm import Session

from app.domain.ml_models import MLModel, TrainingSession, Prediction, PredictionBoundingBox


class MLModelRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_model(self, model_data: dict) -> MLModel:
        db_model = MLModel(**model_data)
        self.db.add(db_model)
        self.db.commit()
        self.db.refresh(db_model)
        return db_model

    def get_model(self, model_id: str) -> Optional[MLModel]:
        return self.db.query(MLModel).filter(MLModel.id == model_id).first()

    def get_active_models(self) -> List[MLModel]:
        return self.db.query(MLModel).filter(MLModel.is_active == True).all()

    def get_models_by_framework(self, framework: str) -> List[MLModel]:
        return self.db.query(MLModel).filter(MLModel.framework == framework).all()

    def update_model(self, model_id: str, update_data: dict) -> Optional[MLModel]:
        model = self.get_model(model_id)
        if model:
            for key, value in update_data.items():
                setattr(model, key, value)
            self.db.commit()
            self.db.refresh(model)
        return model

    def delete_model(self, model_id: str) -> bool:
        model = self.get_model(model_id)
        if model:
            self.db.delete(model)
            self.db.commit()
            return True
        return False


class TrainingSessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_session(self, session_data: dict) -> TrainingSession:
        db_session = TrainingSession(**session_data)
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def get_session(self, session_id: str) -> Optional[TrainingSession]:
        return self.db.query(TrainingSession).filter(TrainingSession.id == session_id).first()

    def update_session(self, session_id: str, update_data: dict) -> Optional[TrainingSession]:
        session = self.get_session(session_id)
        if session:
            for key, value in update_data.items():
                setattr(session, key, value)
            self.db.commit()
            self.db.refresh(session)
        return session


class PredictionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_prediction(self, prediction_data: dict) -> Prediction:
        db_prediction = Prediction(**prediction_data)
        self.db.add(db_prediction)
        self.db.commit()
        self.db.refresh(db_prediction)
        return db_prediction

    def create_bounding_boxes(self, prediction_id: str, bounding_boxes: List[dict]):
        for bbox_data in bounding_boxes:
            db_bbox = PredictionBoundingBox(
                prediction_id=prediction_id,
                **bbox_data
            )
            self.db.add(db_bbox)
        self.db.commit()

    def get_predictions_for_file(self, file_id: str) -> List[Prediction]:
        return self.db.query(Prediction).filter(Prediction.file_id == file_id).all()