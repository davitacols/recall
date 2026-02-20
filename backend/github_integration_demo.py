"""
GitHub Integration Demonstration for Recall

This demonstrates how the GitHub integration automatically links PRs to decisions
and updates decision status when PRs are merged.
"""

# ============================================
# SCENARIO: Developer workflow with Recall
# ============================================

# 1. TEAM MAKES A DECISION
# Decision created in Recall: "Migrate from REST to GraphQL API"
# Decision ID: 42
# Status: "approved"

decision = {
    "id": 42,
    "title": "Migrate from REST to GraphQL API",
    "status": "approved",
    "description": "Move all API endpoints to GraphQL for better flexibility"
}

# ============================================
# 2. DEVELOPER CREATES BRANCH & COMMITS
# ============================================

# Developer creates branch and includes decision reference in commit:
commit_message = """
feat: Add GraphQL schema for users endpoint

Implements the first endpoint migration as part of RECALL-42.
This adds the User type and basic queries.
"""

# When pushed to GitHub, the webhook detects "RECALL-42" pattern
# and automatically links this commit to Decision #42

# ============================================
# 3. DEVELOPER OPENS PULL REQUEST
# ============================================

# PR title or description includes decision reference:
pr_title = "feat: Migrate users endpoint to GraphQL (RECALL-42)"
pr_description = """
## Changes
- Added GraphQL schema for User type
- Implemented user queries
- Added tests

## Related Decision
RECALL-42: Migrate from REST to GraphQL API
"""

# GitHub webhook fires: pull_request.opened
# Recall automatically:
# - Detects "RECALL-42" in PR title/description
# - Creates PullRequest record linked to Decision #42
# - Shows PR in decision detail page

# ============================================
# 4. CODE REVIEW & MERGE
# ============================================

# Team reviews PR, approves, and merges to main branch

# GitHub webhook fires: pull_request.closed (merged=true)
# Recall automatically:
# - Updates PullRequest status to "merged"
# - Updates Decision #42 status to "implemented"
# - Records merge timestamp

# ============================================
# FINAL STATE IN RECALL
# ============================================

decision_after_merge = {
    "id": 42,
    "title": "Migrate from REST to GraphQL API",
    "status": "implemented",  # ← Auto-updated!
    "pull_requests": [
        {
            "pr_number": 123,
            "title": "feat: Migrate users endpoint to GraphQL (RECALL-42)",
            "status": "merged",
            "url": "https://github.com/org/repo/pull/123",
            "author": "developer",
            "commits_count": 5,
            "merged_at": "2024-02-20T10:30:00Z"
        }
    ],
    "commits": [
        {
            "sha": "abc123",
            "message": "feat: Add GraphQL schema for users endpoint...",
            "author": "developer"
        }
    ]
}

# ============================================
# API ENDPOINTS USED
# ============================================

"""
Backend endpoints that power this workflow:

1. POST /api/integrations/github/webhook/
   - Receives GitHub webhook events
   - Handles: pull_request (opened/closed/merged), push
   - Auto-detects RECALL-{id} pattern
   - Links PRs/commits to decisions
   - Updates decision status on merge

2. GET /api/integrations/github/decision/<id>/prs/
   - Fetches all PRs linked to a decision
   - Used by GitHubPanel component

3. POST /api/integrations/github/link-pr/
   - Manual PR linking (if auto-detection missed it)
   - Accepts: decision_id, pr_url
"""

# ============================================
# WEBHOOK PAYLOAD EXAMPLE
# ============================================

github_webhook_payload = {
    "action": "closed",
    "pull_request": {
        "number": 123,
        "title": "feat: Migrate users endpoint to GraphQL (RECALL-42)",
        "html_url": "https://github.com/org/repo/pull/123",
        "state": "closed",
        "merged": True,
        "merged_at": "2024-02-20T10:30:00Z",
        "user": {"login": "developer"},
        "head": {"ref": "feature/graphql-users"},
        "body": "Implements RECALL-42..."
    },
    "repository": {
        "full_name": "org/repo"
    }
}

# Recall processes this and:
# 1. Extracts decision_id = 42 from "RECALL-42"
# 2. Updates PullRequest record: status = "merged"
# 3. Updates Decision #42: status = "implemented"

# ============================================
# FRONTEND DISPLAY
# ============================================

"""
In DecisionDetail page, GitHubPanel shows:

┌─────────────────────────────────────────┐
│ Development Activity                     │
├─────────────────────────────────────────┤
│ ✓ PR #123: Migrate users endpoint       │
│   Status: MERGED                         │
│   Branch: feature/graphql-users          │
│   Author: developer                      │
│   Commits: 5                             │
│   → View on GitHub                       │
├─────────────────────────────────────────┤
│ 💡 Tip: Reference decisions in commits  │
│    using RECALL-42 pattern               │
└─────────────────────────────────────────┘
"""

# ============================================
# KEY BENEFITS
# ============================================

"""
1. Zero manual tracking - developers just code
2. Decision status auto-updates when code ships
3. Full traceability: decision → PR → commits
4. Works with existing GitHub workflow
5. No context switching between tools
"""

print("GitHub Integration Demo Complete!")
print("\nWorkflow:")
print("1. Team creates decision in Recall")
print("2. Developer commits with 'RECALL-42' reference")
print("3. Developer opens PR mentioning 'RECALL-42'")
print("4. Webhook auto-links PR to decision")
print("5. PR merged -> Decision status auto-updates to 'implemented'")
