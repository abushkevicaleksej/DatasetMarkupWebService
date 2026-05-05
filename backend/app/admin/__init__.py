from sqladmin import Admin
from app.admin.models import FileAdminView, TaskAdminView, AnnotationAdminView, UserAdminView, BoundingBoxAdminView

def setup_admin_panel(admin: Admin):
    admin.add_view(FileAdminView)
    admin.add_view(TaskAdminView)
    admin.add_view(AnnotationAdminView)
    admin.add_view(UserAdminView)
    admin.add_view(BoundingBoxAdminView)