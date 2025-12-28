import json

class MockAIProcessor:
    """Mock AI processor for testing without AWS Bedrock"""
    
    def generate_summary(self, content):
        """Generate a mock summary"""
        words = content.split()[:50]
        return f"Summary: This conversation discusses {' '.join(words[:10])}... Key points include team collaboration and decision-making processes."
    
    def extract_action_items(self, content):
        """Extract mock action items"""
        items = []
        lines = content.lower().split('\n')
        
        for line in lines:
            if any(word in line for word in ['will', 'should', 'need to', 'must', 'action']):
                items.append({
                    'title': line.strip()[:100],
                    'priority': 'medium'
                })
        
        if not items:
            items = [
                {'title': 'Review discussion points', 'priority': 'medium'},
                {'title': 'Follow up on decisions', 'priority': 'high'}
            ]
        
        return items[:5]
    
    def extract_keywords(self, content):
        """Extract mock keywords"""
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = content.lower().split()
        keywords = []
        
        for word in words:
            clean_word = ''.join(c for c in word if c.isalnum())
            if len(clean_word) > 4 and clean_word not in common_words and clean_word not in keywords:
                keywords.append(clean_word)
        
        return keywords[:8] if keywords else ['discussion', 'team', 'project', 'update']
