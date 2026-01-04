# GitHub Integration Setup for Recall

## How It Works

Recall now syncs with GitHub to track:
- **Commits** linked to issues (via commit messages)
- **Pull Requests** linked to issues (via PR titles)
- **Code changes** tied to project management

## Setup Steps

### Step 1: Generate GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token"
3. Select scopes:
   - `repo` (full control of private repositories)
   - `read:user` (read user profile data)
4. Copy the token (you'll need it)

### Step 2: Connect GitHub to Recall

1. Go to Recall → Projects → Your Project
2. Click "Integrations" tab
3. Click "Add Integration" → "GitHub"
4. Fill in:
   - **Repository URL**: `username/repo-name` (e.g., `essasuk/essasuk-web`)
   - **GitHub Token**: Paste your personal access token
   - **Project**: Select your Recall project
5. Click "Connect"

### Step 3: Setup GitHub Webhook

1. Go to GitHub → Your Repository → Settings → Webhooks
2. Click "Add webhook"
3. Fill in:
   - **Payload URL**: `https://your-recall-domain.com/api/integrations/github/webhook/`
   - **Content type**: `application/json`
   - **Events**: Select:
     - Push events
     - Pull request events
     - Issues
4. Click "Add webhook"

### Step 4: Link Issues in Commits

When committing code, reference the issue key in your commit message:

```bash
git commit -m "ESS-1: Implement user authentication"
git commit -m "ESS-2: Fix database schema - closes #123"
git commit -m "ESS-3: Add API endpoints for products"
```

Format: `[ISSUE-KEY]: [Description]`

### Step 5: Link Issues in Pull Requests

When creating a PR, reference the issue in the title or description:

```
Title: ESS-1: Implement user authentication

Description:
This PR implements user authentication system.

Closes #ESS-1
```

## What Gets Tracked

### Commits
- Commit hash
- Author
- Message
- Branch
- Timestamp

### Pull Requests
- PR number
- Title
- Status (open/closed/merged)
- Author
- URL

### Issues
- GitHub issue number
- Title
- Status
- Link to GitHub

## View in Recall

### On Issue Detail Page
1. Open any issue (e.g., ESS-1)
2. Scroll to "Code Changes" section
3. See all linked:
   - Commits
   - Pull Requests
   - GitHub Issues

### On Activity Feed
- See all code activity
- Track commits and PRs
- Monitor team progress

## Example Workflow

### 1. Create Issue in Recall
- Issue: ESS-1 - Implement user authentication
- Assignee: John
- Sprint: Sprint 1

### 2. Create Feature Branch
```bash
git checkout -b feature/ESS-1-auth
```

### 3. Make Commits
```bash
git commit -m "ESS-1: Add authentication models"
git commit -m "ESS-1: Implement JWT tokens"
git commit -m "ESS-1: Add login endpoint"
```

### 4. Create Pull Request
```
Title: ESS-1: Implement user authentication
Description: Closes #ESS-1
```

### 5. View in Recall
- Issue ESS-1 now shows:
  - 3 commits
  - 1 pull request
  - Code changes linked

## API Endpoints

### Connect GitHub
```
POST /api/integrations/github/connect/
{
  "repo_url": "username/repo",
  "github_token": "ghp_xxxxx",
  "project_id": 1
}
```

### Get Commits for Issue
```
GET /api/integrations/github/commits/1/
```

### Get PRs for Issue
```
GET /api/integrations/github/prs/1/
```

### GitHub Webhook
```
POST /api/integrations/github/webhook/
(Automatically called by GitHub)
```

## Troubleshooting

### Commits not showing up
- Check commit message includes issue key (ESS-1)
- Verify webhook is configured
- Check GitHub token has correct permissions

### PRs not linking
- Ensure PR title includes issue key
- Check webhook is receiving events
- Verify GitHub token is valid

### Webhook not working
- Check payload URL is correct
- Verify HTTPS is enabled
- Check firewall allows GitHub IPs
- Review webhook delivery logs in GitHub

## Benefits

✅ **Automatic tracking** - No manual linking needed
✅ **Full history** - See all code changes for each issue
✅ **Team visibility** - Everyone sees what's being coded
✅ **Better planning** - Track progress from code to deployment
✅ **Audit trail** - Complete record of all changes
✅ **Integration** - Seamless GitHub + Recall workflow

## Next Steps

1. Generate GitHub token
2. Connect GitHub repository
3. Setup webhook
4. Start committing with issue keys
5. Watch commits appear in Recall!
