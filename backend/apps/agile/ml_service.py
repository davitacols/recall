import re
from collections import Counter
from datetime import datetime, timedelta
from django.db.models import Count, Avg, Q
from apps.agile.models import Issue, Sprint
from apps.organizations.models import User

class MLService:
    """Lightweight ML service for smart features"""
    
    @staticmethod
    def suggest_assignee(issue_title, issue_description, project_id):
        """Suggest best assignee based on past work"""
        text = f"{issue_title} {issue_description}".lower()
        keywords = set(re.findall(r'\b\w+\b', text))
        
        # Get users who worked on similar issues
        similar_issues = Issue.objects.filter(
            project_id=project_id,
            assignee__isnull=False
        ).exclude(status='backlog')
        
        user_scores = Counter()
        for issue in similar_issues:
            issue_text = f"{issue.title} {issue.description or ''}".lower()
            issue_keywords = set(re.findall(r'\b\w+\b', issue_text))
            overlap = len(keywords & issue_keywords)
            if overlap > 2:
                user_scores[issue.assignee_id] += overlap
        
        if user_scores:
            best_user_id = user_scores.most_common(1)[0][0]
            user = User.objects.get(id=best_user_id)
            return {
                'user_id': user.id,
                'name': user.full_name,
                'confidence': min(user_scores[best_user_id] / 10, 1.0),
                'reason': f'Worked on {user_scores[best_user_id]} similar issues'
            }
        return None
    
    @staticmethod
    def predict_sprint_completion(sprint_id):
        """Predict sprint completion probability"""
        try:
            sprint = Sprint.objects.get(id=sprint_id)
            issues = sprint.issues.all()
            
            if not issues:
                return {'probability': 0, 'confidence': 'low'}
            
            total = issues.count()
            completed = issues.filter(status='done').count()
            in_progress = issues.filter(status='in_progress').count()
            
            days_total = (sprint.end_date - sprint.start_date).days
            days_passed = (datetime.now().date() - sprint.start_date).days
            days_remaining = (sprint.end_date - datetime.now().date()).days
            
            if days_total == 0:
                return {'probability': 0, 'confidence': 'low'}
            
            progress_rate = completed / max(days_passed, 1)
            needed_rate = (total - completed) / max(days_remaining, 1)
            
            probability = min(progress_rate / max(needed_rate, 0.1), 1.0)
            
            return {
                'probability': round(probability * 100),
                'completed': completed,
                'total': total,
                'at_risk': probability < 0.7,
                'confidence': 'high' if days_passed > 2 else 'medium',
                'recommendation': 'On track' if probability > 0.8 else 'Needs attention'
            }
        except Sprint.DoesNotExist:
            return {'probability': 0, 'confidence': 'low'}
    
    @staticmethod
    def auto_tag_issue(title, description):
        """Auto-generate tags based on content"""
        text = f"{title} {description or ''}".lower()
        tags = []
        
        tag_patterns = {
            'bug': r'\b(bug|error|crash|fail|broken|issue)\b',
            'feature': r'\b(feature|add|new|implement|create)\b',
            'performance': r'\b(slow|performance|optimize|speed|lag)\b',
            'security': r'\b(security|vulnerability|auth|permission)\b',
            'ui': r'\b(ui|ux|design|interface|layout)\b',
            'api': r'\b(api|endpoint|rest|graphql)\b',
            'database': r'\b(database|db|sql|query|migration)\b',
            'frontend': r'\b(frontend|react|vue|angular|css)\b',
            'backend': r'\b(backend|server|django|node|python)\b',
            'urgent': r'\b(urgent|critical|asap|emergency)\b',
        }
        
        for tag, pattern in tag_patterns.items():
            if re.search(pattern, text):
                tags.append(tag)
        
        return tags[:5]  # Max 5 tags
    
    @staticmethod
    def analyze_sentiment(text):
        """Simple sentiment analysis"""
        positive_words = {'good', 'great', 'excellent', 'love', 'perfect', 'amazing', 'awesome'}
        negative_words = {'bad', 'terrible', 'hate', 'awful', 'broken', 'worst', 'horrible'}
        urgent_words = {'urgent', 'critical', 'asap', 'emergency', 'blocker'}
        
        text_lower = text.lower()
        words = set(re.findall(r'\b\w+\b', text_lower))
        
        positive_count = len(words & positive_words)
        negative_count = len(words & negative_words)
        urgent_count = len(words & urgent_words)
        
        if urgent_count > 0:
            return 'urgent'
        elif negative_count > positive_count:
            return 'negative'
        elif positive_count > negative_count:
            return 'positive'
        return 'neutral'
    
    @staticmethod
    def estimate_story_points(title, description):
        """Estimate story points based on complexity"""
        text = f"{title} {description or ''}"
        
        # Simple heuristic based on length and keywords
        word_count = len(text.split())
        
        complex_keywords = ['integrate', 'refactor', 'migrate', 'architecture', 'system']
        medium_keywords = ['implement', 'create', 'update', 'modify']
        simple_keywords = ['fix', 'update', 'change', 'adjust']
        
        text_lower = text.lower()
        complexity = 0
        
        for keyword in complex_keywords:
            if keyword in text_lower:
                complexity += 3
        for keyword in medium_keywords:
            if keyword in text_lower:
                complexity += 2
        for keyword in simple_keywords:
            if keyword in text_lower:
                complexity += 1
        
        # Combine factors
        if word_count < 20 and complexity <= 1:
            return 1
        elif word_count < 50 and complexity <= 3:
            return 2
        elif word_count < 100 and complexity <= 5:
            return 3
        elif word_count < 200:
            return 5
        else:
            return 8
