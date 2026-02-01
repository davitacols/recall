from sentence_transformers import SentenceTransformer
import numpy as np
from django.core.cache import cache
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
import json

class SemanticSearch:
    """Semantic search using embeddings"""
    
    MODEL_NAME = 'all-MiniLM-L6-v2'
    EMBEDDING_DIM = 384
    
    def __init__(self):
        self.model = SentenceTransformer(self.MODEL_NAME)
    
    def encode_text(self, text):
        """Encode text to embedding"""
        if not text:
            return np.zeros(self.EMBEDDING_DIM)
        return self.model.encode(text, convert_to_numpy=True)
    
    def search_conversations(self, query, org_id, limit=10):
        """Search conversations semantically"""
        query_embedding = self.encode_text(query)
        
        conversations = Conversation.objects.filter(
            organization_id=org_id,
            is_archived=False
        ).values('id', 'title', 'content')
        
        results = []
        for conv in conversations:
            text = f"{conv['title']} {conv['content']}"
            embedding = self.encode_text(text)
            
            # Calculate cosine similarity
            similarity = np.dot(query_embedding, embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(embedding) + 1e-8
            )
            
            results.append({
                'id': conv['id'],
                'title': conv['title'],
                'similarity': float(similarity),
                'type': 'conversation'
            })
        
        return sorted(results, key=lambda x: x['similarity'], reverse=True)[:limit]
    
    def search_decisions(self, query, org_id, limit=10):
        """Search decisions semantically"""
        query_embedding = self.encode_text(query)
        
        decisions = Decision.objects.filter(
            organization_id=org_id
        ).values('id', 'title', 'description')
        
        results = []
        for dec in decisions:
            text = f"{dec['title']} {dec['description']}"
            embedding = self.encode_text(text)
            
            similarity = np.dot(query_embedding, embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(embedding) + 1e-8
            )
            
            results.append({
                'id': dec['id'],
                'title': dec['title'],
                'similarity': float(similarity),
                'type': 'decision'
            })
        
        return sorted(results, key=lambda x: x['similarity'], reverse=True)[:limit]
    
    def search_all(self, query, org_id, limit=20):
        """Search all content semantically"""
        conv_results = self.search_conversations(query, org_id, limit // 2)
        dec_results = self.search_decisions(query, org_id, limit // 2)
        
        all_results = conv_results + dec_results
        return sorted(all_results, key=lambda x: x['similarity'], reverse=True)[:limit]
    
    def find_similar(self, content, org_id, content_type='conversation', limit=5):
        """Find similar content"""
        query_embedding = self.encode_text(content)
        
        if content_type == 'conversation':
            items = Conversation.objects.filter(
                organization_id=org_id,
                is_archived=False
            ).values('id', 'title', 'content')
        else:
            items = Decision.objects.filter(
                organization_id=org_id
            ).values('id', 'title', 'description')
        
        results = []
        for item in items:
            text = item.get('content') or item.get('description', '')
            if not text:
                continue
            
            embedding = self.encode_text(text)
            similarity = np.dot(query_embedding, embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(embedding) + 1e-8
            )
            
            results.append({
                'id': item['id'],
                'title': item['title'],
                'similarity': float(similarity),
                'type': content_type
            })
        
        return sorted(results, key=lambda x: x['similarity'], reverse=True)[:limit]


class KnowledgeGapDetector:
    """Detect knowledge gaps in organization"""
    
    @staticmethod
    def find_gaps(org_id):
        """Find topics with low coverage"""
        from apps.knowledge.models import SearchQuery
        
        # Get frequently searched but rarely answered topics
        queries = SearchQuery.objects.filter(
            organization_id=org_id
        ).values('query').annotate(
            count=models.Count('id')
        ).order_by('-count')[:20]
        
        gaps = []
        for q in queries:
            results_count = Conversation.objects.filter(
                organization_id=org_id,
                title__icontains=q['query']
            ).count()
            
            if results_count == 0:
                gaps.append({
                    'topic': q['query'],
                    'search_count': q['count'],
                    'coverage': 0
                })
        
        return gaps


class FAQGenerator:
    """Generate FAQ from Q&A"""
    
    @staticmethod
    def generate_faq(org_id, limit=20):
        """Generate FAQ from resolved questions"""
        questions = Conversation.objects.filter(
            organization_id=org_id,
            post_type='question',
            is_closed=True
        ).order_by('-view_count')[:limit]
        
        faq = []
        for q in questions:
            replies = q.replies.all()
            if replies.exists():
                answer = replies.first().content
                faq.append({
                    'question': q.title,
                    'answer': answer,
                    'views': q.view_count,
                    'conversation_id': q.id
                })
        
        return faq
