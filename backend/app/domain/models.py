from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime


Base = declarative_base()


task_files = Table(
    'task_files',
    Base.metadata,
    Column('task_id', String(36), ForeignKey('tasks.id')),
    Column('file_id', String(36), ForeignKey('files.id'))
)


class File(Base):
    __tablename__ = 'files'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    media_type = Column(String(50), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    duration = Column(Float, nullable=True)
    extracted_from = Column(String(36), ForeignKey('files.id'), nullable=True)
    
    annotations = relationship("Annotation", back_populates="file", cascade="all, delete-orphan")
    tasks = relationship("Task", secondary=task_files, back_populates="files")
    children = relationship("File", backref="parent", remote_side=[id])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Task(Base):
    __tablename__ = 'tasks'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default='in progress')
    
    files = relationship("File", secondary=task_files, back_populates="tasks")
    annotations = relationship("Annotation", back_populates="task", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Annotation(Base):
    __tablename__ = 'annotations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String(36), ForeignKey('files.id'), nullable=False)
    task_id = Column(String(36), ForeignKey('tasks.id'), nullable=False)
    
    file = relationship("File", back_populates="annotations")
    task = relationship("Task", back_populates="annotations")
    bounding_boxes = relationship("BoundingBox", back_populates="annotation", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BoundingBox(Base):
    __tablename__ = 'bounding_boxes'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    annotation_id = Column(String(36), ForeignKey('annotations.id'), nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    label = Column(String(100), nullable=False)
    confidence = Column(Float, default=1.0)
    
    annotation = relationship("Annotation", back_populates="bounding_boxes")
    
    created_at = Column(DateTime, default=datetime.utcnow)