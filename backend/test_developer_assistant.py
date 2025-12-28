"""
Test Developer Productivity Assistant
Run: python test_developer_assistant.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.models import Conversation
from apps.organizations.models import User, Organization
from apps.conversations.developer_assistant import process_as_developer_conversation

def test_developer_assistant():
    print("=" * 60)
    print("DEVELOPER PRODUCTIVITY ASSISTANT TEST")
    print("=" * 60)
    
    # Get or create test conversation
    conv = Conversation.objects.first()
    if not conv:
        print("[SKIP] No conversations found")
        return
    
    print(f"\n[TEST] Processing conversation: {conv.title}")
    print(f"Type: {conv.post_type}")
    print(f"Content length: {len(conv.content)} characters")
    
    # Process with Developer Assistant
    print("\n[PROCESSING] Running Developer Productivity Assistant...")
    result = process_as_developer_conversation(conv)
    
    # Display results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    
    if 'error' in result:
        print(f"\n[ERROR] {result['error']}")
        return
    
    # Simple Summary
    if result.get('simple_summary'):
        print("\n[SIMPLE SUMMARY]")
        print(result['simple_summary'])
    
    # Technical Decision
    if result.get('technical_decision'):
        decision = result['technical_decision']
        if decision.get('decision_made'):
            print("\n[TECHNICAL DECISION]")
            print(f"  What: {decision.get('what_decided', 'N/A')}")
            print(f"  Why: {decision.get('why_decided', 'N/A')}")
            print(f"  Confidence: {decision.get('confidence_level', 'N/A')}")
            print(f"  Permanence: {decision.get('permanence', 'N/A')}")
            if decision.get('alternatives'):
                print(f"  Alternatives: {', '.join(decision['alternatives'])}")
        else:
            print("\n[TECHNICAL DECISION]")
            print("  No final decision was made.")
    
    # Action Items
    if result.get('action_items'):
        print(f"\n[ACTION ITEMS] ({len(result['action_items'])} found)")
        for i, item in enumerate(result['action_items'], 1):
            print(f"  {i}. {item.get('task', 'N/A')}")
            if item.get('responsible'):
                print(f"     Responsible: {item['responsible']}")
            if item.get('blockers'):
                print(f"     Blocker: {item['blockers']}")
    
    # Agile Context
    if result.get('agile_context'):
        print(f"\n[AGILE CONTEXT]")
        print(f"  {', '.join(result['agile_context'])}")
    
    # Future Developer Note
    if result.get('future_developer_note'):
        print("\n[FUTURE DEVELOPER NOTE]")
        print(f"  {result['future_developer_note']}")
    
    # Warnings
    if result.get('warnings'):
        warnings = result['warnings']
        if warnings.get('repeated_topic'):
            print("\n[WARNING] This topic has been discussed before.")
        if warnings.get('needs_background'):
            print("[WARNING] Additional background may be needed for new team members.")
        if warnings.get('has_risk'):
            print(f"[WARNING] {warnings.get('risk_description', 'Risk or uncertainty exists.')}")
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Developer Assistant test completed")
    print("=" * 60)

if __name__ == '__main__':
    test_developer_assistant()
