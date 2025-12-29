from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from apps.conversations.models import Conversation, ConversationReply
from apps.decisions.models import Decision

@api_view(['PUT'])
@parser_classes([MultiPartParser, FormParser])
def update_profile(request):
    try:
        user = request.user
        
        # Update text fields
        if 'full_name' in request.data:
            user.full_name = request.data['full_name']
        if 'bio' in request.data:
            user.bio = request.data['bio']
        if 'timezone' in request.data:
            user.timezone = request.data['timezone']
        
        # Handle avatar upload
        if 'avatar' in request.FILES:
            user.avatar = request.FILES['avatar']
        
        user.save()
        
        # Build avatar URL
        avatar_url = None
        if user.avatar:
            try:
                from django.conf import settings
                if hasattr(user.avatar, 'url'):
                    if settings.DEBUG or not hasattr(settings, 'AWS_STORAGE_BUCKET_NAME') or not settings.AWS_STORAGE_BUCKET_NAME:
                        avatar_url = request.build_absolute_uri(user.avatar.url)
                    else:
                        avatar_url = user.avatar.url
            except Exception as e:
                print(f"Avatar URL error: {str(e)}")
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'bio': user.bio,
            'role': user.role,
            'timezone': user.timezone,
            'avatar': avatar_url,
            'organization': user.organization.name
        })
    except Exception as e:
        print(f"Profile update error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not user.check_password(old_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save()
    
    return Response({'message': 'Password updated successfully'})

@api_view(['GET'])
def profile_stats(request):
    user = request.user
    
    conversations = Conversation.objects.filter(author=user).count()
    replies = ConversationReply.objects.filter(author=user).count()
    decisions = Decision.objects.filter(decision_maker=user).count()
    
    return Response({
        'conversations': conversations,
        'replies': replies,
        'decisions': decisions
    })
