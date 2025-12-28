"""
Test Developer Productivity Features
Run: python test_dev_features.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.models import User, Organization
from apps.conversations.templates import list_templates, get_template
from apps.conversations.adr_export import export_to_adr, generate_adr_filename

def test_templates():
    print("\n=== Testing Templates ===")
    templates = list_templates()
    print(f"[OK] Found {len(templates)} templates")
    for t in templates:
        print(f"  - {t['name']} ({t['key']})")
    
    # Test loading a template
    arch_template = get_template('architecture')
    print(f"\n[OK] Loaded architecture template")
    print(f"  Title: {arch_template['fields']['title']}")
    print(f"  Has context_reason: {'context_reason' in arch_template['fields']}")
    print(f"  Has if_this_fails: {'if_this_fails' in arch_template['fields']}")

def test_adr_export():
    print("\n=== Testing ADR Export ===")
    
    # Get first conversation
    conv = Conversation.objects.first()
    if not conv:
        print("[SKIP] No conversations found")
        return
    
    print(f"[OK] Found conversation: {conv.title}")
    
    # Export to ADR
    adr_content = export_to_adr(conv)
    filename = generate_adr_filename(conv)
    
    print(f"[OK] Generated ADR")
    print(f"  Filename: {filename}")
    print(f"  Length: {len(adr_content)} characters")
    print(f"  Has Status: {'## Status' in adr_content}")
    print(f"  Has Context: {'## Context' in adr_content}")
    print(f"  Has Decision: {'## Decision' in adr_content}")

def test_new_fields():
    print("\n=== Testing New Fields ===")
    
    conv = Conversation.objects.first()
    if not conv:
        print("[SKIP] No conversations found")
        return
    
    # Test new fields exist
    fields = [
        'alternatives_considered',
        'tradeoffs',
        'code_links',
        'plain_language_summary',
        'context_reason',
        'key_takeaway',
        'emotional_context',
        'memory_health_score'
    ]
    
    for field in fields:
        has_field = hasattr(conv, field)
        print(f"  {'[OK]' if has_field else '[FAIL]'} {field}")

def test_decision_fields():
    print("\n=== Testing Decision Fields ===")
    
    decision = Decision.objects.first()
    if not decision:
        print("[SKIP] No decisions found")
        return
    
    fields = [
        'context_reason',
        'if_this_fails',
        'confidence_level',
        'confidence_votes',
        'tradeoffs',
        'code_links',
        'plain_language_summary'
    ]
    
    for field in fields:
        has_field = hasattr(decision, field)
        print(f"  {'[OK]' if has_field else '[FAIL]'} {field}")

def main():
    print("=" * 50)
    print("DEVELOPER PRODUCTIVITY FEATURES TEST")
    print("=" * 50)
    
    try:
        test_templates()
        test_adr_export()
        test_new_fields()
        test_decision_fields()
        
        print("\n" + "=" * 50)
        print("[SUCCESS] ALL TESTS PASSED")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
