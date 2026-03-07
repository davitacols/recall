from django.urls import path
from . import views
from . import messages_views
from . import campaign_views
from apps.decisions.phase2_views import knowledge_health

urlpatterns = [
    path('', views.notifications_list, name='notifications_list'),
    path('test/', views.send_test_notification, name='send_test_notification'),
    path('test-email/', views.send_test_email, name='send_test_email'),
    path('<int:notification_id>/read/', views.mark_as_read, name='mark_as_read'),
    path('read-all/', views.mark_all_as_read, name='mark_all_as_read'),
    path('<int:notification_id>/delete/', views.delete_notification, name='delete_notification'),
    
    # Private Messages
    path('messages/', messages_views.messages_list, name='messages_list'),
    path('messages/<int:user_id>/', messages_views.message_thread, name='message_thread'),
    path('messages/<int:message_id>/delete/', messages_views.delete_message, name='delete_message'),

    # Marketing campaigns
    path('campaigns/', campaign_views.campaign_list_create, name='campaign_list_create'),
    path('campaigns/<int:campaign_id>/', campaign_views.campaign_detail, name='campaign_detail'),
    path('campaigns/<int:campaign_id>/send/', campaign_views.campaign_send, name='campaign_send'),
    path('unsubscribe/<uuid:token>/', campaign_views.unsubscribe_marketing, name='unsubscribe_marketing'),
]
