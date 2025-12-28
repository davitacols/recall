# Semantic search disabled for deployment - ChromaDB requires too much memory
# Use Claude API for knowledge search instead

class SemanticSearchEngine:
    def __init__(self):
        pass
    
    def index_conversation(self, conversation):
        pass
    
    def index_decision(self, decision):
        pass
    
    def search(self, query, organization_id, limit=10):
        return []
    
    def bulk_index_organization(self, organization_id):
        pass

def get_search_engine():
    return SemanticSearchEngine()
