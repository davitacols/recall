"""
BM25 Search Implementation for RECALL
Provides full-text search with relevance ranking
"""
from django.db.models import Q, F
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from rank_bm25 import BM25Okapi
import re
from collections import defaultdict


class BM25SearchEngine:
    """BM25 search engine for conversations, decisions, and knowledge"""
    
    def __init__(self):
        self.k1 = 1.5  # Term frequency saturation parameter
        self.b = 0.75  # Length normalization parameter
        self.bm25 = None
        self.documents = []
        self.doc_map = {}
    
    def tokenize(self, text):
        """Tokenize text for BM25"""
        if not text:
            return []
        # Convert to lowercase, remove special chars, split
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        # Remove common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
            'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
        return [t for t in tokens if t not in stop_words and len(t) > 2]
    
    def index_documents(self, documents):
        """Index documents for BM25 search"""
        self.documents = []
        self.doc_map = {}
        
        for doc in documents:
            # Combine searchable fields
            text = f"{doc['title']} {doc['content']} {' '.join(doc.get('keywords', []))}"
            tokens = self.tokenize(text)
            
            self.documents.append(tokens)
            self.doc_map[len(self.documents) - 1] = doc
        
        # Initialize BM25
        if self.documents:
            self.bm25 = BM25Okapi(self.documents, k1=self.k1, b=self.b)
    
    def search(self, query, limit=20):
        """Search documents using BM25"""
        if not self.bm25 or not query:
            return []
        
        query_tokens = self.tokenize(query)
        if not query_tokens:
            return []
        
        # Get BM25 scores
        scores = self.bm25.get_scores(query_tokens)
        
        # Get top results
        results = []
        for idx, score in enumerate(scores):
            if score > 0:
                doc = self.doc_map[idx]
                results.append({
                    'id': doc['id'],
                    'type': doc['type'],
                    'title': doc['title'],
                    'content': doc['content'][:200],
                    'score': float(score),
                    'keywords': doc.get('keywords', [])
                })
        
        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]


class HybridSearchEngine:
    """Hybrid search combining BM25 and PostgreSQL full-text search"""
    
    def __init__(self):
        self.bm25 = BM25SearchEngine()
    
    def search_conversations(self, query, org_id, limit=20):
        """Search conversations with BM25"""
        from apps.conversations.models import Conversation
        
        # Get conversations from database
        conversations = Conversation.objects.filter(
            organization_id=org_id,
            is_archived=False
        ).values('id', 'title', 'content', 'ai_keywords', 'post_type')
        
        # Prepare documents for BM25
        documents = []
        for conv in conversations:
            documents.append({
                'id': conv['id'],
                'type': 'conversation',
                'title': conv['title'],
                'content': conv['content'],
                'keywords': conv['ai_keywords'] or []
            })
        
        # Index and search
        self.bm25.index_documents(documents)
        results = self.bm25.search(query, limit)
        
        # Enhance with database info
        for result in results:
            conv = Conversation.objects.get(id=result['id'])
            result['author'] = conv.author.get_full_name()
            result['created_at'] = conv.created_at
            result['reply_count'] = conv.reply_count
            result['view_count'] = conv.view_count
        
        return results
    
    def search_decisions(self, query, org_id, limit=20):
        """Search decisions with BM25"""
        from apps.decisions.models import Decision
        
        # Get decisions from database
        decisions = Decision.objects.filter(
            organization_id=org_id
        ).values('id', 'title', 'description', 'rationale', 'status')
        
        # Prepare documents for BM25
        documents = []
        for dec in decisions:
            documents.append({
                'id': dec['id'],
                'type': 'decision',
                'title': dec['title'],
                'content': f"{dec['description']} {dec['rationale']}",
                'keywords': [dec['status']]
            })
        
        # Index and search
        self.bm25.index_documents(documents)
        results = self.bm25.search(query, limit)
        
        # Enhance with database info
        for result in results:
            dec = Decision.objects.get(id=result['id'])
            result['status'] = dec.status
            result['impact_level'] = dec.impact_level
            result['created_at'] = dec.created_at
        
        return results
    
    def search_all(self, query, org_id, limit=20):
        """Search all content types including agile"""
        conversations = self.search_conversations(query, org_id, limit=limit//3)
        decisions = self.search_decisions(query, org_id, limit=limit//3)
        agile = self.search_agile(query, org_id, limit=limit//3)
        
        # Combine and sort by score
        all_results = conversations + decisions + agile
        all_results.sort(key=lambda x: x['score'], reverse=True)
        
        return all_results[:limit]
    
    def search_agile(self, query, org_id, limit=20):
        """Search sprints, issues, and blockers with BM25"""
        from apps.agile.models import Sprint, Issue, Blocker
        
        documents = []
        
        # Index sprints
        sprints = Sprint.objects.filter(
            organization_id=org_id
        ).values('id', 'name', 'goal', 'summary')
        
        for sprint in sprints:
            documents.append({
                'id': sprint['id'],
                'type': 'sprint',
                'title': sprint['name'],
                'content': f"{sprint['goal']} {sprint['summary']}",
                'keywords': ['sprint']
            })
        
        # Index issues
        issues = Issue.objects.filter(
            organization_id=org_id
        ).values('id', 'title', 'description', 'key')
        
        for issue in issues:
            documents.append({
                'id': issue['id'],
                'type': 'issue',
                'title': f"{issue['key']}: {issue['title']}",
                'content': issue['description'],
                'keywords': ['issue']
            })
        
        # Index blockers
        blockers = Blocker.objects.filter(
            organization_id=org_id
        ).values('id', 'title', 'description')
        
        for blocker in blockers:
            documents.append({
                'id': blocker['id'],
                'type': 'blocker',
                'title': blocker['title'],
                'content': blocker['description'],
                'keywords': ['blocker']
            })
        
        # Index and search
        if documents:
            self.bm25.index_documents(documents)
            results = self.bm25.search(query, limit)
            
            # Enhance with database info
            for result in results:
                if result['type'] == 'sprint':
                    sprint = Sprint.objects.get(id=result['id'])
                    result['status'] = sprint.status
                    result['created_at'] = sprint.created_at
                elif result['type'] == 'issue':
                    issue = Issue.objects.get(id=result['id'])
                    result['status'] = issue.status
                    result['priority'] = issue.priority
                    result['created_at'] = issue.created_at
                elif result['type'] == 'blocker':
                    blocker = Blocker.objects.get(id=result['id'])
                    result['status'] = blocker.status
                    result['created_at'] = blocker.created_at
            
            return results
        
        return []


class PostgreSQLFullTextSearch:
    """PostgreSQL full-text search for conversations"""
    
    @staticmethod
    def search_conversations(query, org_id, limit=20):
        """Search using PostgreSQL full-text search"""
        from apps.conversations.models import Conversation
        
        search_vector = SearchVector('title', weight='A') + \
                       SearchVector('content', weight='B') + \
                       SearchVector('ai_summary', weight='C')
        
        search_query = SearchQuery(query)
        
        results = Conversation.objects.filter(
            organization_id=org_id,
            is_archived=False
        ).annotate(
            search=search_vector,
            rank=SearchRank(search_vector, search_query)
        ).filter(
            search=search_query
        ).order_by('-rank')[:limit]
        
        return [{
            'id': r.id,
            'type': 'conversation',
            'title': r.title,
            'content': r.content[:200],
            'author': r.author.get_full_name(),
            'created_at': r.created_at,
            'rank': r.rank
        } for r in results]


class SearchService:
    """Main search service combining all search methods"""
    
    def __init__(self):
        self.hybrid = HybridSearchEngine()
        self.postgres = PostgreSQLFullTextSearch()
    
    def search(self, query, org_id, search_type='all', limit=20):
        """
        Search with multiple methods
        
        Args:
            query: Search query string
            org_id: Organization ID
            search_type: 'bm25', 'postgres', or 'all'
            limit: Number of results
        
        Returns:
            List of search results with scores
        """
        if not query or len(query) < 2:
            return []
        
        if search_type == 'bm25':
            return self.hybrid.search_all(query, org_id, limit)
        elif search_type == 'postgres':
            return self.postgres.search_conversations(query, org_id, limit)
        else:  # 'all' - combine both
            bm25_results = self.hybrid.search_all(query, org_id, limit)
            postgres_results = self.postgres.search_conversations(query, org_id, limit)
            
            # Combine and deduplicate
            seen = set()
            combined = []
            
            for result in bm25_results + postgres_results:
                key = (result['type'], result['id'])
                if key not in seen:
                    seen.add(key)
                    combined.append(result)
            
            return combined[:limit]
    
    def get_suggestions(self, query, org_id, limit=10):
        """Get search suggestions based on partial query"""
        from apps.conversations.models import Conversation, Tag
        from apps.agile.models import Sprint, Issue
        
        if not query or len(query) < 2:
            return []
        
        suggestions = []
        
        # Suggest tags
        tags = Tag.objects.filter(
            organization_id=org_id,
            name__istartswith=query
        ).values_list('name', flat=True)[:3]
        
        for tag in tags:
            suggestions.append({
                'type': 'tag',
                'text': f'#{tag}',
                'value': tag
            })
        
        # Suggest conversations
        conversations = Conversation.objects.filter(
            organization_id=org_id,
            title__istartswith=query,
            is_archived=False
        ).values('id', 'title')[:3]
        
        for conv in conversations:
            suggestions.append({
                'type': 'conversation',
                'text': conv['title'],
                'value': conv['id']
            })
        
        # Suggest sprints
        sprints = Sprint.objects.filter(
            organization_id=org_id,
            name__istartswith=query
        ).values('id', 'name')[:2]
        
        for sprint in sprints:
            suggestions.append({
                'type': 'sprint',
                'text': sprint['name'],
                'value': sprint['id']
            })
        
        # Suggest issues
        issues = Issue.objects.filter(
            organization_id=org_id,
            title__istartswith=query
        ).values('id', 'key', 'title')[:2]
        
        for issue in issues:
            suggestions.append({
                'type': 'issue',
                'text': f"{issue['key']}: {issue['title']}",
                'value': issue['id']
            })
        
        return suggestions[:limit]
    
    def record_search(self, query, org_id, user_id, results_count, response_time_ms):
        """Record search query for analytics"""
        from apps.knowledge.models import SearchQuery
        
        SearchQuery.objects.create(
            organization_id=org_id,
            user_id=user_id,
            query_text=query,
            results_count=results_count,
            response_time_ms=response_time_ms,
            search_type='bm25'
        )


# Global search service instance
search_service = SearchService()
