from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.agile.ml_service import MLService
from apps.agile.models import Issue, Sprint

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def suggest_assignee(request):
    """Suggest best assignee for an issue"""
    title = request.data.get('title', '')
    description = request.data.get('description', '')
    project_id = request.data.get('project_id')
    
    if not title or not project_id:
        return Response({'error': 'Title and project_id required'}, status=400)
    
    suggestion = MLService.suggest_assignee(title, description, project_id)
    
    if suggestion:
        return Response(suggestion)
    return Response({'message': 'No suggestion available'}, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict_sprint(request, sprint_id):
    """Predict sprint completion"""
    prediction = MLService.predict_sprint_completion(sprint_id)
    return Response(prediction)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_tag(request):
    """Auto-generate tags for issue"""
    title = request.data.get('title', '')
    description = request.data.get('description', '')
    
    tags = MLService.auto_tag_issue(title, description)
    sentiment = MLService.analyze_sentiment(f"{title} {description}")
    story_points = MLService.estimate_story_points(title, description)
    
    return Response({
        'tags': tags,
        'sentiment': sentiment,
        'estimated_points': story_points
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_issue(request):
    """Complete AI analysis of an issue"""
    title = request.data.get('title', '')
    description = request.data.get('description', '')
    project_id = request.data.get('project_id')
    
    if not title:
        return Response({'error': 'Title required'}, status=400)
    
    analysis = {
        'tags': MLService.auto_tag_issue(title, description),
        'sentiment': MLService.analyze_sentiment(f"{title} {description}"),
        'estimated_points': MLService.estimate_story_points(title, description),
    }
    
    if project_id:
        assignee = MLService.suggest_assignee(title, description, project_id)
        if assignee:
            analysis['suggested_assignee'] = assignee
    
    return Response(analysis)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_insights(request, sprint_id):
    """Get AI insights for sprint"""
    try:
        sprint = Sprint.objects.get(id=sprint_id)
        issues = sprint.issues.all()
        
        prediction = MLService.predict_sprint_completion(sprint_id)
        
        # Analyze issue sentiments
        sentiments = []
        for issue in issues:
            text = f"{issue.title} {issue.description or ''}"
            sentiments.append(MLService.analyze_sentiment(text))
        
        sentiment_counts = {
            'urgent': sentiments.count('urgent'),
            'negative': sentiments.count('negative'),
            'neutral': sentiments.count('neutral'),
            'positive': sentiments.count('positive')
        }
        
        # Risk factors
        risks = []
        if prediction['at_risk']:
            risks.append('Sprint completion at risk')
        if sentiment_counts['urgent'] > 2:
            risks.append(f"{sentiment_counts['urgent']} urgent issues")
        if sentiment_counts['negative'] > 3:
            risks.append('High negative sentiment')
        
        return Response({
            'prediction': prediction,
            'sentiment_analysis': sentiment_counts,
            'risks': risks,
            'health_score': max(0, 100 - len(risks) * 20)
        })
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=404)
