import re
from apps.organizations.models import User
from apps.conversations.models import Tag

def parse_mentions_and_tags(text, organization):
    """Extract @mentions and #tags from text"""
    # Find @mentions
    mention_pattern = r'@(\w+)'
    mentions = re.findall(mention_pattern, text)
    
    # Find #tags
    tag_pattern = r'#(\w+)'
    tags = re.findall(tag_pattern, text)
    
    # Get user objects
    mentioned_users = []
    for username in mentions:
        try:
            user = User.objects.get(username=username, organization=organization)
            mentioned_users.append(user)
        except User.DoesNotExist:
            pass
    
    # Get or create tag objects
    tag_objects = []
    for tag_name in tags:
        tag, created = Tag.objects.get_or_create(
            name=tag_name.lower(),
            organization=organization,
            defaults={'color': '#000000'}
        )
        if not created:
            tag.usage_count += 1
            tag.save()
        tag_objects.append(tag)
    
    return mentioned_users, tag_objects

def highlight_mentions_and_tags(text):
    """Add HTML highlighting to @mentions and #tags"""
    # Highlight @mentions
    text = re.sub(
        r'@(\w+)',
        r'<span class="mention">@\1</span>',
        text
    )
    
    # Highlight #tags
    text = re.sub(
        r'#(\w+)',
        r'<span class="tag">#\1</span>',
        text
    )
    
    return text
