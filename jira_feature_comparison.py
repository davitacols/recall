"""
Jira Feature Comparison - Check Missing Features
Compares your tool against Jira's core capabilities
"""

import os

def header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)

def check_feature(feature, status, details=""):
    symbols = {"IMPLEMENTED": "[PASS]", "MISSING": "[MISS]", "PARTIAL": "[PART]"}
    print(f"{symbols[status]} {feature}")
    if details:
        print(f"     {details}")
    return status

# Read models file
models_file = "d:\\recall\\backend\\apps\\agile\\models.py"
with open(models_file, 'r', encoding='utf-8') as f:
    models_content = f.read().lower()

# Read views file
views_file = "d:\\recall\\backend\\apps\\agile\\views.py"
with open(views_file, 'r', encoding='utf-8') as f:
    views_content = f.read().lower()

# Read urls file
urls_file = "d:\\recall\\backend\\apps\\agile\\urls.py"
with open(urls_file, 'r', encoding='utf-8') as f:
    urls_content = f.read().lower()

# Check frontend pages
frontend_dir = "d:\\recall\\frontend\\src\\pages"
frontend_files = os.listdir(frontend_dir) if os.path.exists(frontend_dir) else []
frontend_content = " ".join(frontend_files).lower()

results = {"IMPLEMENTED": 0, "MISSING": 0, "PARTIAL": 0}

print("\n" + "="*80)
print("  JIRA FEATURE COMPARISON")
print("  Checking which Jira features are present in your tool")
print("="*80)

# 1. ISSUE & TASK TRACKING
header("1. ISSUE & TASK TRACKING")

features = [
    ("Bug tracking", "issue_type" in models_content and "bug" in models_content, "Issue model has bug type"),
    ("Task tracking", "task" in models_content, "Issue model has task type"),
    ("Story tracking", "story" in models_content, "Issue model has story type"),
    ("Epic tracking", "epic" in models_content, "Issue model has epic type"),
    ("Sub-task support", "subtask" in models_content or "parent_issue" in models_content, "Parent-child relationships"),
    ("Issue status", "status" in models_content, "Status field in Issue model"),
    ("Assignee", "assignee" in models_content, "Assignee field in Issue model"),
    ("Priority levels", "priority" in models_content, "Priority field in Issue model"),
    ("Due dates", "due_date" in models_content, "Due date field in Issue model"),
    ("Comments", "issuecomment" in models_content, "IssueComment model exists"),
    ("Attachments", "file" in models_content or "attachment" in models_content, "File/attachment support"),
]

for feature, condition, detail in features:
    status = "IMPLEMENTED" if condition else "MISSING"
    results[status] += 1
    check_feature(feature, status, detail)

# 2. AGILE PROJECT MANAGEMENT
header("2. AGILE PROJECT MANAGEMENT (SCRUM & KANBAN)")

print("\nScrum Features:")
scrum_features = [
    ("Product Backlog", "backlog" in models_content, "Backlog model exists"),
    ("Sprint Planning", "sprint" in models_content and "planning" in models_content, "Sprint with planning status"),
    ("Sprints (work cycles)", "sprint" in models_content, "Sprint model exists"),
    ("Sprint Board", "board" in models_content and "sprint" in models_content, "Board and Sprint models"),
    ("Burndown Charts", "burndown" in models_content, "BurndownData model exists"),
    ("Sprint Goals", "goal" in models_content, "Sprint goal field"),
    ("Sprint Status", "status" in models_content and "sprint" in models_content, "Sprint status tracking"),
    ("Velocity Tracking", "velocity" in models_content, "SprintVelocity model exists"),
]

for feature, condition, detail in scrum_features:
    status = "IMPLEMENTED" if condition else "MISSING"
    results[status] += 1
    check_feature(feature, status, detail)

print("\nKanban Features:")
kanban_features = [
    ("Kanban Board", "kanban" in models_content or "board" in models_content, "Board model exists"),
    ("Custom Columns", "column" in models_content, "Column model exists"),
    ("Drag & Drop", "@dnd-kit" in open("d:\\recall\\frontend\\package.json").read(), "DnD library installed"),
    ("WIP Limits", "wip" in models_content or "limit" in models_content, "WIP limit support"),
    ("Continuous Flow", "board_type" in models_content and "kanban" in models_content, "Kanban board type"),
]

for feature, condition, detail in kanban_features:
    status = "IMPLEMENTED" if condition else "MISSING"
    results[status] += 1
    check_feature(feature, status, detail)

# 3. WORKFLOW MANAGEMENT
header("3. WORKFLOW MANAGEMENT")

workflow_features = [
    ("Custom Workflows", "workflow" in models_content, "WorkflowTransition model exists"),
    ("Status Transitions", "transition" in models_content, "Transition support"),
    ("Workflow Validation", "validate" in views_content and "transition" in views_content, "Validation logic"),
    ("Custom Statuses", "status_choices" in models_content, "Configurable statuses"),
    ("Transition Rules", "requires" in models_content and "transition" in models_content, "Transition requirements"),
]

for feature, condition, detail in workflow_features:
    status = "IMPLEMENTED" if condition else "MISSING"
    results[status] += 1
    check_feature(feature, status, detail)

# 4. REPORTING & METRICS
header("4. REPORTING & METRICS")

reporting_features = [
    ("Burndown Charts", "burndown" in models_content, "BurndownData model"),
    ("Velocity Charts", "velocity" in models_content, "SprintVelocity model"),
    ("Cumulative Flow Diagrams", "cumulative" in models_content or "flow" in models_content, "Flow tracking"),
    ("Issue Aging Reports", "created_at" in models_content and "updated_at" in models_content, "Timestamp tracking"),
    ("Sprint Reports", "sprint" in models_content and "summary" in models_content, "Sprint summaries"),
    ("Team Performance", "velocity" in models_content or "capacity" in models_content, "Performance metrics"),
    ("Custom Reports", "report" in urls_content or "analytics" in urls_content, "Reporting endpoints"),
]

for feature, condition, detail in reporting_features:
    status = "IMPLEMENTED" if condition else "MISSING"
    results[status] += 1
    check_feature(feature, status, detail)

# 5. COLLABORATION & INTEGRATIONS
header("5. COLLABORATION & INTEGRATIONS")

collab_features = [
    ("Comments & Mentions", "comment" in models_content, "Comment system"),
    ("Notifications", os.path.exists("d:\\recall\\backend\\apps\\notifications"), "Notifications app exists"),
    ("Real-time Updates", "consumer" in os.listdir("d:\\recall\\backend\\apps\\agile"), "WebSocket consumers"),
    ("Git Integration (GitHub/GitLab)", "branch" in models_content and "commit" in models_content, "Git tracking"),
    ("Pull Request Tracking", "pullrequest" in models_content or "pr_url" in models_content, "PR model/field"),
    ("CI/CD Integration", "ci_status" in models_content or "deployment" in models_content, "CI/CD tracking"),
    ("Documentation Integration", "knowledge" in os.listdir("d:\\recall\\backend\\apps"), "Knowledge base app"),
    ("Slack/Teams Integration", "integrations" in os.listdir("d:\\recall\\backend\\apps"), "Integrations app"),
]

for feature, condition, detail in collab_features:
    status = "IMPLEMENTED" if condition else "MISSING"
    results[status] += 1
    check_feature(feature, status, detail)

# 6. ADDITIONAL JIRA FEATURES
header("6. ADDITIONAL JIRA FEATURES")

additional_features = [
    ("Issue Linking", "link" in models_content, "Issue linking models"),
    ("Labels/Tags", "label" in models_content, "IssueLabel model"),
    ("Watchers", "watcher" in models_content, "Watcher support"),
    ("Time Tracking", "time" in models_content or "hours" in models_content, "Time tracking"),
    ("Story Points", "story_points" in models_content, "Story points field"),
    ("Issue Search", "search" in urls_content or "filter" in views_content, "Search functionality"),
    ("Issue Filters", "filter" in models_content or "filter" in views_content, "Filter support"),
    ("Saved Filters", "saved" in models_content and "filter" in models_content, "Saved filter support"),
    ("Dashboards", "dashboard" in frontend_content, "Dashboard pages"),
    ("Roadmaps", "roadmap" in frontend_content or "roadmap" in urls_content, "Roadmap feature"),
    ("Release Management", "release" in models_content or "version" in models_content, "Release tracking"),
    ("Component Management", "component" in models_content, "Component support"),
    ("Issue History", "history" in models_content or "audit" in models_content, "Change history"),
    ("Bulk Operations", "bulk" in views_content, "Bulk edit support"),
    ("Issue Templates", "template" in models_content, "Template support"),
    ("Custom Fields", "custom" in models_content or "field" in models_content, "Custom field support"),
    ("Permissions & Roles", "permission" in os.listdir("d:\\recall\\backend\\apps\\agile"), "Permission system"),
    ("Project Categories", "category" in models_content, "Project categorization"),
    ("Multi-project Support", "project" in models_content, "Project model exists"),
    ("Team Management", "team" in models_content or "capacity" in models_content, "Team features"),
]

for feature, condition, detail in additional_features:
    status = "IMPLEMENTED" if condition else "MISSING"
    results[status] += 1
    check_feature(feature, status, detail)

# SUMMARY
header("COMPARISON SUMMARY")

total = sum(results.values())
impl_pct = (results["IMPLEMENTED"] / total * 100)
miss_pct = (results["MISSING"] / total * 100)

print(f"\nTotal Features Checked: {total}")
print(f"[PASS] Implemented: {results['IMPLEMENTED']} ({impl_pct:.1f}%)")
print(f"[MISS] Missing: {results['MISSING']} ({miss_pct:.1f}%)")
print(f"[PART] Partial: {results['PARTIAL']} ({results['PARTIAL']/total*100:.1f}%)")

# List missing features
if results["MISSING"] > 0:
    print("\n" + "="*80)
    print("  MISSING FEATURES (Compared to Jira)")
    print("="*80)
    
    missing_list = []
    
    # Re-check to build missing list
    all_checks = [
        ("WIP Limits", "wip" in models_content or "limit" in models_content),
        ("Cumulative Flow Diagrams", "cumulative" in models_content or "flow" in models_content),
        ("Watchers", "watcher" in models_content),
        ("Time Tracking", "time_tracking" in models_content or "time_spent" in models_content),
        ("Saved Filters", "saved" in models_content and "filter" in models_content),
        ("Release Management", "release" in models_content or "version" in models_content),
        ("Component Management", "component" in models_content),
        ("Bulk Operations", "bulk" in views_content),
        ("Issue Templates", "template" in models_content),
        ("Custom Fields", "customfield" in models_content),
        ("Project Categories", "category" in models_content and "project" in models_content),
        ("Attachments", "attachment" in models_content or "file" in models_content),
    ]
    
    for feature, condition in all_checks:
        if not condition:
            missing_list.append(feature)
    
    for i, feature in enumerate(missing_list, 1):
        print(f"{i}. {feature}")

print("\n" + "="*80)
if impl_pct >= 80:
    print("[SUCCESS] Your tool has most Jira features!")
    print(f"Coverage: {impl_pct:.1f}% - Excellent Jira alternative")
elif impl_pct >= 60:
    print("[GOOD] Your tool covers core Jira features")
    print(f"Coverage: {impl_pct:.1f}% - Good for most teams")
else:
    print("[NEEDS WORK] Several Jira features are missing")
    print(f"Coverage: {impl_pct:.1f}% - Consider adding more features")
print("="*80 + "\n")
