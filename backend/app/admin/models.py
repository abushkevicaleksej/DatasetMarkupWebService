from sqladmin import ModelView

from app.domain.models import User, File, Task, BoundingBox, Annotation

class UserAdminView(ModelView, model=User):
    can_delete = True
    column_list = [
        User.id,
        User.username,
        User.email,
        User.hashed_password,
        User.is_active,
        User.created_at,
        User.updated_at,
        User.role,
        User.files,
        User.tasks
    ]
    column_labels = {
        User.hashed_password: "Password"
    }
    form_excluded_columns = [
        User.tasks,
        User.files
    ]

    async def on_model_change(self, data: dict, model: User, is_created, request):
        from app.application.services.auth_service import pwd_context
        raw_password = data["hashed_password"]
        if is_created or model.hashed_password != raw_password:
            data.update(hashed_password=pwd_context.hash(raw_password))

class FileAdminView(ModelView, model=File):
    can_delete = True
    column_list = [
        File.id,
        File.original_filename,
        File.file_path,
        File.media_type,
        File.mime_type,
        File.file_size,
        File.width,
        File.height,
        File.duration,
        File.extracted_from,
        File.task_id,
        File.annotations,
        File.children,
        File.created_at,
        File.updated_at,
        File.user_id,
    ]

class TaskAdminView(ModelView, model=Task):
    can_delete = True
    column_list = [
        Task.id,
        Task.name,
        Task.description,
        Task.status,
        Task.files,
        Task.annotations,
        Task.created_at,
        Task.updated_at,
        Task.user_id,
    ]
    form_excluded_columns = [
        Task.files,
        Task.annotations
    ]
    async def delete_model(self, request, pk):
        return super().delete_model(request, pk)

class AnnotationAdminView(ModelView, model=Annotation):
    column_list = [
        Annotation.id,
        Annotation.file_id,
        Annotation.task_id,
        Annotation.file,
        Annotation.task,
        Annotation.bounding_boxes,
        Annotation.created_at,
        Annotation.updated_at
    ]

    form_excluded_columns = [
        Annotation.file,
        Annotation.task
    ]


class BoundingBoxAdminView(ModelView, model=BoundingBox):
    column_list = [
        BoundingBox.id,
        BoundingBox.annotation_id,
        BoundingBox.x,
        BoundingBox.y,
        BoundingBox.width,
        BoundingBox.height,
        BoundingBox.label,
        BoundingBox.confidence,
        BoundingBox.annotation,
        BoundingBox.created_at
    ]
    form_excluded_columns = [
        BoundingBox.annotation_id,
        BoundingBox.annotation
    ]