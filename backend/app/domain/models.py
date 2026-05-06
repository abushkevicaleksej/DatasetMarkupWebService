from sqlalchemy import (
    Column, 
    String, 
    Integer, 
    Boolean, 
    Float, 
    DateTime, 
    ForeignKey, 
    Text, 
    Table
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
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
    task_id = Column(String(36), ForeignKey('tasks.id'), nullable=True)
    
    task = relationship("Task", back_populates="files")
    
    annotations = relationship("Annotation", back_populates="file", cascade="all, delete-orphan")
    children = relationship("File", backref="parent", remote_side=[id])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    owner = relationship("User", back_populates="files")

    annotation_status = Column(String(50), default='unannotated')
    uncertainty_score = Column(Float, default=0.0)

    def __str__(self):
        return self.original_filename


class Task(Base):
    __tablename__ = 'tasks'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default='in progress')
    
    files = relationship("File", back_populates="task", cascade="all, delete-orphan")
    
    annotations = relationship("Annotation", back_populates="task", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user_id = Column(String(36), ForeignKey('users.id'), nullable=False, index=True)
    owner = relationship("User", back_populates="tasks")

    def __str__(self):
        return self.name


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


class User(Base):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    role = Column(String(20), default="user", nullable=False)
    files = relationship("File", back_populates="owner", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")

    def __str__(self):
        return self.username
    
class TokenBlacklist(Base):
    __tablename__ = 'token_blacklist'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    token_jti = Column(String(255), unique=True, nullable=False, index=True)
    token_type = Column(String(20), nullable=False)
    expired_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)