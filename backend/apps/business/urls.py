from django.urls import path
from .goal_views import goals_list, goal_detail
from .meeting_views import meetings_list, meeting_detail
from .task_views import tasks_list, task_detail, tasks_board
from .analytics_views import business_analytics
from .team_views import team_members
from .advanced_views import (
    milestones_list, milestone_detail,
    templates_list, template_delete,
    comments_list, comment_detail,
    reminders_list
)
from .document_views import documents_list, document_detail, document_search, document_file, document_comments

urlpatterns = [
    path('goals/', goals_list, name='goals_list'),
    path('goals/<int:pk>/', goal_detail, name='goal_detail'),
    path('goals/<int:goal_id>/milestones/', milestones_list, name='milestones_list'),
    path('goals/<int:goal_id>/milestones/<int:pk>/', milestone_detail, name='milestone_detail'),
    path('meetings/', meetings_list, name='meetings_list'),
    path('meetings/<int:pk>/', meeting_detail, name='meeting_detail'),
    path('tasks/', tasks_list, name='tasks_list'),
    path('tasks/<int:pk>/', task_detail, name='task_detail'),
    path('tasks/board/', tasks_board, name='tasks_board'),
    path('analytics/', business_analytics, name='business_analytics'),
    path('team/', team_members, name='team_members'),
    path('templates/', templates_list, name='templates_list'),
    path('templates/<int:pk>/', template_delete, name='template_delete'),
    path('comments/', comments_list, name='comments_list'),
    path('comments/<int:pk>/', comment_detail, name='comment_detail'),
    path('reminders/', reminders_list, name='reminders_list'),
    path('documents/', documents_list, name='documents_list'),
    path('documents/<int:pk>/', document_detail, name='document_detail'),
    path('documents/<int:pk>/file/', document_file, name='document_file'),
    path('documents/<int:pk>/comments/', document_comments, name='document_comments'),
    path('documents/search/', document_search, name='document_search'),
]
