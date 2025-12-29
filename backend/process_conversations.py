"""
Process all unprocessed conversations with AI
Run: python process_conversations.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.models import Conversation
from apps.conversations.ai_processor import AIProcessor

def process_all():
    print("=" * 60)
    print("PROCESSING CONVERSATIONS WITH AI")
    print("=" * 60)
    
    # Get unprocessed conversations
    conversations = Conversation.objects.filter(ai_processed=False)
    total = conversations.count()
    
    if total == 0:
        print("\n[OK] All conversations already processed!")
        return
    
    print(f"\nFound {total} unprocessed conversations\n")
    
    processor = AIProcessor()
    
    for i, conv in enumerate(conversations, 1):
        print(f"[{i}/{total}] Processing: {conv.title[:50]}...")
        
        try:
            # Generate AI content
            summary = processor.generate_summary(conv.content)
            action_items = processor.extract_action_items(conv.content)
            keywords = processor.extract_keywords(conv.content)
            
            # Update conversation
            conv.ai_summary = summary
            conv.ai_action_items = action_items
            conv.ai_keywords = keywords
            conv.ai_processed = True
            conv.save()
            
            print(f"  [OK] Summary: {summary[:60]}...")
            print(f"  [OK] Keywords: {', '.join(keywords[:5])}")
            print()
            
        except Exception as e:
            print(f"  [ERROR] Error: {e}\n")
            conv.ai_processing_error = str(e)
            conv.save()
    
    print("=" * 60)
    print("[SUCCESS] PROCESSING COMPLETE")
    print("=" * 60)
    print("\nNow refresh your frontend to see:")
    print("  - Trending Topics")
    print("  - AI Summaries")
    print("  - Keywords on conversations")

if __name__ == '__main__':
    process_all()
