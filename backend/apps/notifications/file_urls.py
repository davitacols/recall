from django.urls import path
from .file_views import upload_file, delete_file

urlpatterns = [
    path('upload/', upload_file, name='upload_file'),
    path('delete/<str:public_id>/', delete_file, name='delete_file'),
]
