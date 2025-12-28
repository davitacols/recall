import tempfile
import os
import warnings
from django.conf import settings

# Suppress warnings
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', message='.*telemetry.*')
os.environ['ANONYMIZED_TELEMETRY'] = 'False'

# Set temp directory to D drive
tempfile.tempdir = getattr(settings, 'TEMP_DIR', 'D:\\temp')
os.environ['TMPDIR'] = tempfile.tempdir
os.environ['TEMP'] = tempfile.tempdir
os.environ['TMP'] = tempfile.tempdir

import chromadb
from sentence_transformers import SentenceTransformer
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

# Global singleton instance
_search_engine_instance = None

class SemanticSearchEngine:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=getattr(settings, 'CHROMA_PERSIST_DIRECTORY', './chroma_db')
        )
        # Use a much smaller model to avoid space issues
        self.model = SentenceTransformer('paraphrase-MiniLM-L3-v2')  # Only ~17MB
        self.collection = self.client.get_or_create_collection("knowledge")
    
    def index_conversation(self, conversation):
        """Index a conversation for semantic search"""
        content = f"{conversation.title}\n{conversation.content}"
        if conversation.ai_summary:
            content += f"\nSummary: {conversation.ai_summary}"
        
        embedding = self.model.encode([content])[0].tolist()
        
        self.collection.upsert(
            ids=[f"conv_{conversation.id}"],
            embeddings=[embedding],
            metadatas=[{
                "type": "conversation",
                "title": conversation.title,
                "post_type": conversation.post_type,
                "author": conversation.author.get_full_name(),
                "created_at": conversation.created_at.isoformat(),
                "organization_id": conversation.organization_id
            }],
            documents=[content]
        )
    
    def index_decision(self, decision):
        """Index a decision for semantic search"""
        content = f"{decision.title}\n{decision.description}"
        if decision.rationale:
            content += f"\nRationale: {decision.rationale}"
        
        embedding = self.model.encode([content])[0].tolist()
        
        self.collection.upsert(
            ids=[f"decision_{decision.id}"],
            embeddings=[embedding],
            metadatas=[{
                "type": "decision",
                "title": decision.title,
                "status": decision.status,
                "impact_level": decision.impact_level,
                "decision_maker": decision.decision_maker.get_full_name() if decision.decision_maker else None,
                "created_at": decision.created_at.isoformat(),
                "organization_id": decision.organization_id
            }],
            documents=[content]
        )
    
    def search(self, query, organization_id, limit=10):
        """Perform semantic search"""
        query_embedding = self.model.encode([query])[0].tolist()
        
        # Get total count first to adjust limit
        try:
            count_results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=1,
                where={"organization_id": organization_id}
            )
            total_available = len(self.collection.get(where={"organization_id": organization_id})['ids'])
            actual_limit = min(limit, total_available) if total_available > 0 else limit
        except:
            actual_limit = limit
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_limit,
            where={"organization_id": organization_id}
        )
        
        search_results = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i, doc_id in enumerate(results['ids'][0]):
                metadata = results['metadatas'][0][i]
                distance = results['distances'][0][i]
                
                search_results.append({
                    'id': doc_id,
                    'title': metadata['title'],
                    'type': metadata['type'],
                    'relevance_score': 1 - distance,
                    'created_at': metadata['created_at'],
                    'author': metadata.get('author') or metadata.get('decision_maker'),
                    'snippet': results['documents'][0][i][:200] + '...'
                })
        
        return search_results
    
    def bulk_index_organization(self, organization_id):
        """Index all content for an organization"""
        # Index conversations
        conversations = Conversation.objects.filter(
            organization_id=organization_id,
            ai_processed=True
        )
        for conv in conversations:
            self.index_conversation(conv)
        
        # Index decisions
        decisions = Decision.objects.filter(organization_id=organization_id)
        for decision in decisions:
            self.index_decision(decision)

def get_search_engine():
    """Get or create singleton search engine instance"""
    global _search_engine_instance
    if _search_engine_instance is None:
        _search_engine_instance = SemanticSearchEngine()
    return _search_engine_instance
