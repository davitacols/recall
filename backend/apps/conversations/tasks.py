from celery import shared_task
from .models import Conversation
from .ai_processor import AIProcessor

@shared_task
def process_conversation_ai(conversation_id):
    try:
        conversation = Conversation.objects.get(id=conversation_id)
        processor = AIProcessor()
        
        # Generate summary and extract action items
        summary = processor.generate_summary(conversation.content)
        action_items = processor.extract_action_items(conversation.content)
        keywords = processor.extract_keywords(conversation.content)
        
        # Update conversation with AI results
        conversation.ai_summary = summary
        conversation.ai_action_items = action_items
        conversation.ai_keywords = keywords
        conversation.ai_processed = True
        conversation.save()
        
        return f"Processed conversation {conversation_id}"
    except Exception as e:
        # Log error and mark as failed
        conversation = Conversation.objects.get(id=conversation_id)
        conversation.ai_processing_error = str(e)
        conversation.save()
        raise