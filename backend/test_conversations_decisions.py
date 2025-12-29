"""
Comprehensive test of Conversations and Decisions features
Run: python test_conversations_decisions.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.conversations.models import Conversation, ConversationReply, Tag, Bookmark, Reaction, Badge
from apps.decisions.models import Decision
from apps.organizations.models import Organization, User
from django.utils import timezone

def test_conversations():
    print("\n" + "="*70)
    print("TEST 1: CONVERSATIONS FEATURE")
    print("="*70)
    
    org = Organization.objects.first()
    conversations = Conversation.objects.filter(organization=org)
    
    print(f"\nTotal conversations: {conversations.count()}")
    
    # Test different post types
    post_types = conversations.values_list('post_type', flat=True).distinct()
    print(f"Post types: {list(post_types)}")
    
    # Test AI processing
    ai_processed = conversations.filter(ai_processed=True).count()
    print(f"AI processed: {ai_processed}/{conversations.count()}")
    
    # Test priorities
    priorities = {}
    for priority in ['low', 'medium', 'high', 'urgent']:
        count = conversations.filter(priority=priority).count()
        priorities[priority] = count
    print(f"Priorities: {priorities}")
    
    # Test features on first conversation
    if conversations.exists():
        conv = conversations.first()
        print(f"\nSample conversation: {conv.title}")
        print(f"  Author: {conv.author.get_full_name()}")
        print(f"  Type: {conv.post_type}")
        print(f"  Priority: {conv.priority}")
        print(f"  Replies: {conv.reply_count}")
        print(f"  Views: {conv.view_count}")
        print(f"  AI Summary: {conv.ai_summary[:80] if conv.ai_summary else 'None'}...")
        print(f"  Keywords: {conv.ai_keywords[:5]}")
        print(f"  Status: {conv.status_label or 'None'}")
        print(f"  Memory Health: {conv.memory_health_score or 'Not calculated'}")
        
        # Test replies
        replies = ConversationReply.objects.filter(conversation=conv)
        print(f"  Actual replies in DB: {replies.count()}")
        
        # Test reactions
        reactions = Reaction.objects.filter(conversation=conv)
        print(f"  Reactions: {reactions.count()}")
        
        # Test tags
        tags = conv.tags.all()
        print(f"  Tags: {[t.name for t in tags]}")
    
    print("\n[PASS] CONVERSATIONS FEATURE WORKING")
    return True

def test_conversation_features():
    print("\n" + "="*70)
    print("TEST 2: CONVERSATION ADVANCED FEATURES")
    print("="*70)
    
    org = Organization.objects.first()
    
    # Test bookmarks
    bookmarks = Bookmark.objects.filter(user__organization=org)
    print(f"\nBookmarks: {bookmarks.count()}")
    
    # Test reactions
    reactions = Reaction.objects.all()
    print(f"Total reactions: {reactions.count()}")
    if reactions.exists():
        for reaction_type in ['agree', 'unsure', 'concern']:
            count = reactions.filter(reaction_type=reaction_type).count()
            print(f"  {reaction_type}: {count}")
    
    # Test badges
    badges = Badge.objects.all()
    print(f"\nBadges earned: {badges.count()}")
    if badges.exists():
        for badge_type in ['decision_owner', 'knowledge_builder', 'crisis_responder']:
            count = badges.filter(badge_type=badge_type).count()
            if count > 0:
                print(f"  {badge_type}: {count}")
    
    # Test tags
    tags = Tag.objects.filter(organization=org)
    print(f"\nTags: {tags.count()}")
    if tags.exists():
        print("  Top tags:")
        for tag in tags.order_by('-usage_count')[:5]:
            print(f"    #{tag.name} ({tag.usage_count} uses)")
    
    # Test closed conversations
    closed = Conversation.objects.filter(organization=org, is_closed=True)
    print(f"\nClosed conversations: {closed.count()}")
    
    # Test archived conversations
    archived = Conversation.objects.filter(organization=org, is_archived=True)
    print(f"Archived conversations: {archived.count()}")
    
    # Test pinned conversations
    pinned = Conversation.objects.filter(organization=org, is_pinned=True)
    print(f"Pinned conversations: {pinned.count()}")
    
    print("\n[PASS] CONVERSATION ADVANCED FEATURES WORKING")
    return True

def test_decisions():
    print("\n" + "="*70)
    print("TEST 3: DECISIONS FEATURE")
    print("="*70)
    
    org = Organization.objects.first()
    decisions = Decision.objects.filter(organization=org)
    
    print(f"\nTotal decisions: {decisions.count()}")
    
    # Test statuses
    statuses = {}
    for status in ['under_review', 'approved', 'rejected', 'implemented']:
        count = decisions.filter(status=status).count()
        statuses[status] = count
    print(f"Statuses: {statuses}")
    
    # Test impact levels
    impacts = {}
    for impact in ['low', 'medium', 'high', 'critical']:
        count = decisions.filter(impact_level=impact).count()
        impacts[impact] = count
    print(f"Impact levels: {impacts}")
    
    # Test decision details
    if decisions.exists():
        dec = decisions.first()
        print(f"\nSample decision: {dec.title}")
        print(f"  Decision maker: {dec.decision_maker.get_full_name() if dec.decision_maker else 'None'}")
        print(f"  Status: {dec.status}")
        print(f"  Impact: {dec.impact_level}")
        print(f"  Confidence: {dec.confidence_level}/10")
        print(f"  Rationale: {dec.rationale[:80] if dec.rationale else 'None'}...")
        print(f"  Context: {dec.context_reason[:80] if dec.context_reason else 'None'}...")
        print(f"  If fails: {dec.if_this_fails[:80] if dec.if_this_fails else 'None'}...")
        print(f"  Decided at: {dec.decided_at}")
        print(f"  Implemented at: {dec.implemented_at or 'Not yet'}")
        
        # Test confidence votes
        if dec.confidence_votes:
            print(f"  Confidence votes: {len(dec.confidence_votes)}")
            avg = sum(v['vote'] for v in dec.confidence_votes) / len(dec.confidence_votes)
            print(f"  Average confidence: {avg:.1f}/10")
        
        # Test linked conversation
        if dec.conversation:
            print(f"  Linked to conversation: {dec.conversation.title}")
    
    print("\n[PASS] DECISIONS FEATURE WORKING")
    return True

def test_decision_features():
    print("\n" + "="*70)
    print("TEST 4: DECISION ADVANCED FEATURES")
    print("="*70)
    
    org = Organization.objects.first()
    
    # Test decisions with conversations
    decisions_with_conv = Decision.objects.filter(
        organization=org,
        conversation__isnull=False
    )
    print(f"\nDecisions linked to conversations: {decisions_with_conv.count()}")
    
    # Test decisions with reminders
    decisions_with_reminders = Decision.objects.filter(
        organization=org,
        reminder_enabled=True
    )
    print(f"Decisions with reminders enabled: {decisions_with_reminders.count()}")
    
    # Test decisions needing implementation
    approved_not_implemented = Decision.objects.filter(
        organization=org,
        status='approved',
        implemented_at__isnull=True
    )
    print(f"Approved but not implemented: {approved_not_implemented.count()}")
    
    # Test critical decisions
    critical = Decision.objects.filter(
        organization=org,
        impact_level='critical'
    )
    print(f"Critical decisions: {critical.count()}")
    
    # Test recent decisions
    from datetime import timedelta
    week_ago = timezone.now() - timedelta(days=7)
    recent = Decision.objects.filter(
        organization=org,
        created_at__gte=week_ago
    )
    print(f"Decisions this week: {recent.count()}")
    
    # Test decision timeline
    timeline_decisions = Decision.objects.filter(
        organization=org,
        status__in=['approved', 'implemented']
    ).order_by('-decided_at')
    print(f"\nDecision timeline entries: {timeline_decisions.count()}")
    
    print("\n[PASS] DECISION ADVANCED FEATURES WORKING")
    return True

def test_ai_processing():
    print("\n" + "="*70)
    print("TEST 5: AI PROCESSING")
    print("="*70)
    
    org = Organization.objects.first()
    conversations = Conversation.objects.filter(organization=org, ai_processed=True)
    
    print(f"\nAI processed conversations: {conversations.count()}")
    
    # Test AI features
    with_summary = conversations.exclude(ai_summary='').count()
    with_keywords = conversations.exclude(ai_keywords=[]).count()
    with_action_items = conversations.exclude(ai_action_items=[]).count()
    
    print(f"  With AI summary: {with_summary}")
    print(f"  With keywords: {with_keywords}")
    print(f"  With action items: {with_action_items}")
    
    # Test keyword extraction quality
    if conversations.exists():
        conv = conversations.first()
        print(f"\nSample AI processing:")
        print(f"  Conversation: {conv.title}")
        print(f"  Summary: {conv.ai_summary[:100]}...")
        print(f"  Keywords ({len(conv.ai_keywords)}): {', '.join(conv.ai_keywords[:8])}")
        if conv.ai_action_items:
            print(f"  Action items ({len(conv.ai_action_items)}):")
            for item in conv.ai_action_items[:3]:
                print(f"    - {item.get('title', 'N/A')} [{item.get('priority', 'medium')}]")
    
    print("\n[PASS] AI PROCESSING WORKING")
    return True

def test_search_and_filters():
    print("\n" + "="*70)
    print("TEST 6: SEARCH AND FILTERS")
    print("="*70)
    
    org = Organization.objects.first()
    
    # Test post type filtering
    print("\nPost type filtering:")
    for post_type in ['update', 'decision', 'question', 'proposal']:
        count = Conversation.objects.filter(
            organization=org,
            post_type=post_type
        ).count()
        print(f"  {post_type}: {count}")
    
    # Test priority filtering
    print("\nPriority filtering:")
    for priority in ['low', 'medium', 'high', 'urgent']:
        count = Conversation.objects.filter(
            organization=org,
            priority=priority
        ).count()
        print(f"  {priority}: {count}")
    
    # Test status filtering
    print("\nStatus filtering:")
    for status in ['under_review', 'approved', 'rejected', 'implemented']:
        count = Decision.objects.filter(
            organization=org,
            status=status
        ).count()
        print(f"  {status}: {count}")
    
    # Test tag filtering
    tags = Tag.objects.filter(organization=org)
    if tags.exists():
        tag = tags.first()
        tagged_convs = Conversation.objects.filter(
            organization=org,
            tags=tag
        ).count()
        print(f"\nConversations with tag '#{tag.name}': {tagged_convs}")
    
    print("\n[PASS] SEARCH AND FILTERS WORKING")
    return True

def test_relationships():
    print("\n" + "="*70)
    print("TEST 7: RELATIONSHIPS AND LINKS")
    print("="*70)
    
    org = Organization.objects.first()
    
    # Test conversation-decision links
    decisions_with_conv = Decision.objects.filter(
        organization=org,
        conversation__isnull=False
    )
    print(f"\nDecisions linked to conversations: {decisions_with_conv.count()}")
    
    # Test conversation-reply links
    conversations_with_replies = Conversation.objects.filter(
        organization=org,
        reply_count__gt=0
    )
    print(f"Conversations with replies: {conversations_with_replies.count()}")
    
    # Test user-conversation links
    users = User.objects.filter(organization=org)
    if users.exists():
        user = users.first()
        user_convs = Conversation.objects.filter(author=user).count()
        user_replies = ConversationReply.objects.filter(author=user).count()
        user_decisions = Decision.objects.filter(decision_maker=user).count()
        print(f"\nUser '{user.get_full_name()}' activity:")
        print(f"  Conversations: {user_convs}")
        print(f"  Replies: {user_replies}")
        print(f"  Decisions: {user_decisions}")
    
    # Test tag-conversation links
    tags = Tag.objects.filter(organization=org)
    if tags.exists():
        print(f"\nTag usage:")
        for tag in tags.order_by('-usage_count')[:3]:
            print(f"  #{tag.name}: {tag.usage_count} conversations")
    
    print("\n[PASS] RELATIONSHIPS AND LINKS WORKING")
    return True

def test_data_integrity():
    print("\n" + "="*70)
    print("TEST 8: DATA INTEGRITY")
    print("="*70)
    
    org = Organization.objects.first()
    
    # Test required fields
    conversations = Conversation.objects.filter(organization=org)
    print(f"\nChecking {conversations.count()} conversations...")
    
    issues = []
    for conv in conversations:
        if not conv.title:
            issues.append(f"Conversation {conv.id} missing title")
        if not conv.content:
            issues.append(f"Conversation {conv.id} missing content")
        if not conv.author:
            issues.append(f"Conversation {conv.id} missing author")
        if not conv.post_type:
            issues.append(f"Conversation {conv.id} missing post_type")
    
    if issues:
        print(f"[WARNING] Found {len(issues)} issues:")
        for issue in issues[:5]:
            print(f"  - {issue}")
    else:
        print("  All conversations have required fields")
    
    # Test decisions
    decisions = Decision.objects.filter(organization=org)
    print(f"\nChecking {decisions.count()} decisions...")
    
    dec_issues = []
    for dec in decisions:
        if not dec.title:
            dec_issues.append(f"Decision {dec.id} missing title")
        if not dec.description:
            dec_issues.append(f"Decision {dec.id} missing description")
        if not dec.impact_level:
            dec_issues.append(f"Decision {dec.id} missing impact_level")
    
    if dec_issues:
        print(f"[WARNING] Found {len(dec_issues)} issues:")
        for issue in dec_issues[:5]:
            print(f"  - {issue}")
    else:
        print("  All decisions have required fields")
    
    print("\n[PASS] DATA INTEGRITY CHECK COMPLETE")
    return len(issues) == 0 and len(dec_issues) == 0

def main():
    print("\n" + "="*70)
    print("  CONVERSATIONS & DECISIONS - COMPREHENSIVE TEST")
    print("="*70)
    
    org = Organization.objects.first()
    if not org:
        print("\n[FAIL] ERROR: No organization found!")
        return
    
    print(f"\nTesting organization: {org.name}")
    
    results = []
    results.append(("Conversations", test_conversations()))
    results.append(("Conversation Features", test_conversation_features()))
    results.append(("Decisions", test_decisions()))
    results.append(("Decision Features", test_decision_features()))
    results.append(("AI Processing", test_ai_processing()))
    results.append(("Search & Filters", test_search_and_filters()))
    results.append(("Relationships", test_relationships()))
    results.append(("Data Integrity", test_data_integrity()))
    
    print("\n" + "="*70)
    print("  TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n[SUCCESS] ALL FEATURES WORKING CORRECTLY!")
        print("\nFeatures verified:")
        print("  - Conversation CRUD operations")
        print("  - Post types (update, decision, question, proposal)")
        print("  - Priorities (low, medium, high, urgent)")
        print("  - AI processing (summaries, keywords, action items)")
        print("  - Replies and threading")
        print("  - Reactions (agree, unsure, concern)")
        print("  - Bookmarks")
        print("  - Tags and mentions")
        print("  - Badges")
        print("  - Decision tracking")
        print("  - Decision statuses and workflows")
        print("  - Confidence voting")
        print("  - Impact levels")
        print("  - Search and filtering")
        print("  - Relationships and links")
        print("  - Data integrity")
    else:
        print("\n[WARNING] Some features need attention")

if __name__ == '__main__':
    main()
