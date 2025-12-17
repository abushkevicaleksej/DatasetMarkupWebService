import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.domain.models import Base


class MLModel(Base):
    __tablename__ = 'ml_models'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    version = Column(String(100), nullable=False)
    model_type = Column(String(100), nullable=False)
    framework = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    model_path = Column(String(1000), nullable=False)
    config_path = Column(String(1000), nullable=True)

    supported_classes = Column(JSON, nullable=False)
    input_size = Column(JSON, nullable=False)
    confidence_threshold = Column(Float, default=0.5)

    is_active = Column(Boolean, default=False)
    is_pretrained = Column(Boolean, default=True)

    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    training_sessions = relationship("TrainingSession", back_populates="model")
    predictions = relationship("Prediction", back_populates="model")


class TrainingSession(Base):
    __tablename__ = 'training_sessions'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey('ml_models.id'), nullable=False)
    task_id = Column(String(36), ForeignKey('tasks.id'), nullable=True)

    epochs = Column(Integer, default=10)
    batch_size = Column(Integer, default=8)
    learning_rate = Column(Float, default=0.001)

    train_files_count = Column(Integer, default=0)
    val_files_count = Column(Integer, default=0)

    status = Column(String(50), default='pending')
    current_epoch = Column(Integer, default=0)
    total_epochs = Column(Integer, default=0)

    final_accuracy = Column(Float, nullable=True)
    final_loss = Column(Float, nullable=True)
    training_logs = Column(JSON, nullable=True)

    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("MLModel", back_populates="training_sessions")
    task = relationship("Task")


class Prediction(Base):
    __tablename__ = 'predictions'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_id = Column(String(36), ForeignKey('ml_models.id'), nullable=False)
    file_id = Column(String(36), ForeignKey('files.id'), nullable=False)
    task_id = Column(String(36), ForeignKey('tasks.id'), nullable=True)

    confidence_threshold = Column(Float, default=0.5)
    total_predictions = Column(Integer, default=0)
    processing_time = Column(Float, nullable=True)

    model = relationship("MLModel", back_populates="predictions")
    file = relationship("File")
    task = relationship("Task")
    bounding_boxes = relationship("PredictionBoundingBox", back_populates="prediction", cascade="all, delete-orphan")


class PredictionBoundingBox(Base):
    __tablename__ = 'prediction_bounding_boxes'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_id = Column(String(36), ForeignKey('predictions.id'), nullable=False)

    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)

    label = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)

    prediction = relationship("Prediction", back_populates="bounding_boxes")

    created_at = Column(DateTime, default=datetime.utcnow)
