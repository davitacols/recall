from django.urls import path
from . import views

urlpatterns = [
    path('', views.notifications_list, name='notifications_list'),
    path('<int:notification_id>/read/', views.mark_as_read, name='mark_as_read'),
    path('read-all/', views.mark_all_as_read, name='mark_all_as_read'),
    path('<int:notification_id>/delete/', views.delete_notification, name='delete_notification'),
]
