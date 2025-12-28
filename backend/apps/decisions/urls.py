from django.urls import path
from . import views

urlpatterns = [
    path('', views.decisions, name='decisions'),
    path('<int:decision_id>/', views.decision_detail, name='decision_detail'),
    path('<int:decision_id>/approve/', views.approve_decision, name='approve_decision'),
    path('<int:decision_id>/implement/', views.implement_decision, name='implement_decision'),
    path('<int:decision_id>/reminded/', views.mark_reminded, name='mark_reminded'),
    path('timeline/', views.decisions_timeline, name='decisions_timeline'),
    path('reminders/', views.decisions_needing_reminders, name='decisions_reminders'),
    path('convert/<int:conversation_id>/', views.convert_to_decision, name='convert_to_decision'),
]