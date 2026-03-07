import re
from collections import Counter
from datetime import datetime
from apps.agile.models import Issue, Sprint
from apps.organizations.models import User
from apps.agile.ml_models import AgileMLModelStore, NaiveBayesTextClassifier

class MLService:
    """Lightweight ML service for smart features"""
    
    @staticmethod
    def suggest_assignee(issue_title, issue_description, project_id, organization_id=None):
        """Suggest best assignee based on past work"""
        if organization_id and AgileMLModelStore.exists(organization_id):
            prediction = MLService._suggest_assignee_from_trained_model(
                issue_title, issue_description, project_id, organization_id
            )
            if prediction:
                return prediction

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
                'reason': f'Worked on {user_scores[best_user_id]} similar issues',
                'model_source': 'heuristic',
            }
        return None
    
    @staticmethod
    def _suggest_assignee_from_trained_model(issue_title, issue_description, project_id, organization_id):
        artifact = AgileMLModelStore.load(organization_id)
        if not artifact:
            return None

        model = NaiveBayesTextClassifier.from_dict(artifact.get("assignee_model", {}))
        if not model.is_trained():
            return None

        text = f"{issue_title} {issue_description or ''}".strip()
        probs = model.predict_proba(text)
        if not probs:
            return None

        recent_project_assignees = set(
            Issue.objects.filter(project_id=project_id, assignee__isnull=False)
            .values_list("assignee_id", flat=True)
            .distinct()
        )
        if recent_project_assignees:
            probs = {
                label: p for label, p in probs.items()
                if str(label).isdigit() and int(label) in recent_project_assignees
            } or probs

        best_label, confidence = max(probs.items(), key=lambda x: x[1])
        if not str(best_label).isdigit():
            return None
        user_id = int(best_label)
        user = User.objects.filter(id=user_id, organization_id=organization_id).first()
        if not user:
            return None

        return {
            "user_id": user.id,
            "name": user.full_name,
            "confidence": round(float(confidence), 3),
            "reason": "Prediction from trained assignee model",
            "model_source": "trained",
        }

    @staticmethod
    def predict_sprint_completion(sprint_id, organization_id=None):
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

            model_source = 'heuristic'
            if organization_id:
                artifact = AgileMLModelStore.load(organization_id)
                if artifact:
                    baseline = artifact.get("sprint_baseline", {})
                    avg_completion_ratio = baseline.get("avg_completion_ratio")
                    if avg_completion_ratio is not None:
                        completion_bias = (float(avg_completion_ratio) - 0.5) * 0.25
                        probability = max(0.0, min(1.0, probability + completion_bias))
                        model_source = 'trained+heuristic'
            
            return {
                'probability': round(probability * 100),
                'completed': completed,
                'total': total,
                'at_risk': probability < 0.7,
                'confidence': 'high' if days_passed > 2 else 'medium',
                'recommendation': 'On track' if probability > 0.8 else 'Needs attention',
                'model_source': model_source,
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
    def estimate_story_points(title, description, organization_id=None):
        """Estimate story points based on complexity"""
        if organization_id and AgileMLModelStore.exists(organization_id):
            predicted = MLService._estimate_story_points_from_trained_model(title, description, organization_id)
            if predicted is not None:
                return predicted

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

    @staticmethod
    def _estimate_story_points_from_trained_model(title, description, organization_id):
        artifact = AgileMLModelStore.load(organization_id)
        if not artifact:
            return None
        model = NaiveBayesTextClassifier.from_dict(artifact.get("story_point_model", {}))
        if not model.is_trained():
            return None

        probs = model.predict_proba(f"{title} {description or ''}")
        if not probs:
            return None
        label, _ = max(probs.items(), key=lambda x: x[1])
        try:
            return int(label)
        except (TypeError, ValueError):
            return None
