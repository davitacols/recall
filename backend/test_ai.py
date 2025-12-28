import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.ai_processor import AIProcessor

def test_ai_processing():
    """Test AI processing with sample content"""
    print("=" * 50)
    print("AI PROCESSING TEST")
    print("=" * 50)
    print()
    
    processor = AIProcessor()
    
    sample_content = """
    Team meeting notes from Q4 planning session:
    
    We discussed the new feature roadmap for next quarter. Sarah proposed 
    implementing the user dashboard redesign first, which everyone agreed on.
    
    Action items:
    - John will create mockups by Friday
    - Maria will research competitor features
    - Team will review designs next Monday
    
    Decision: We're moving forward with the Getty-inspired design system.
    Budget approved: $50k for Q4 development.
    """
    
    print("Testing with sample content...")
    print()
    
    # Test summary
    print("[1/3] Generating summary...")
    try:
        summary = processor.generate_summary(sample_content)
        print(f"[OK] Summary: {summary[:100]}...")
    except Exception as e:
        print(f"[FAIL] Summary failed: {e}")
        return False
    
    print()
    
    # Test action items
    print("[2/3] Extracting action items...")
    try:
        action_items = processor.extract_action_items(sample_content)
        print(f"[OK] Found {len(action_items)} action items")
        for item in action_items[:3]:
            print(f"   - {item.get('title', 'N/A')}")
    except Exception as e:
        print(f"[FAIL] Action items failed: {e}")
        return False
    
    print()
    
    # Test keywords
    print("[3/3] Extracting keywords...")
    try:
        keywords = processor.extract_keywords(sample_content)
        print(f"[OK] Found {len(keywords)} keywords: {', '.join(keywords[:5])}")
    except Exception as e:
        print(f"[FAIL] Keywords failed: {e}")
        return False
    
    print()
    print("=" * 50)
    print("AI PROCESSING WORKS!")
    print("=" * 50)
    return True

if __name__ == '__main__':
    try:
        success = test_ai_processing()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[FAIL] Test failed: {e}")
        sys.exit(1)
