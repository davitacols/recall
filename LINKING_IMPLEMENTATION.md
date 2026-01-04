# Linking Implementation: Conversations ↔ Decisions ↔ Sprints ↔ Projects

## Overview
Implemented comprehensive linking across all four core entities with best practices UX for seamless navigation and context awareness.

## Backend Endpoints Added

### Conversation Linking
- `GET /api/conversations/{id}/related-decisions/` - Get all decisions linked to a conversation

### Decision Linking  
- `GET /api/decisions/{id}/related-sprints/` - Get sprint context for a decision

### Sprint Linking
- `GET /api/agile/sprints/{id}/related-conversations/` - Get conversations (via blockers) for a sprint
- `GET /api/agile/sprints/{id}/decisions/` - Get decisions for a sprint (already existed)

### Project Linking
- `GET /api/agile/projects/{id}/roadmap/` - Get all sprints with decisions and issues for a project

### Issue Linking
- `GET /api/agile/issues/{id}/related-decision/` - Get decision context for an issue via its sprint

## Frontend Components Created

### 1. RelatedDecisions.js
Displays decisions linked to a conversation in ConversationDetail
- Shows decision title, status, impact level, and sprint assignment
- Clickable cards navigate to decision detail
- Appears in main content area below developer insights

### 2. RelatedSprints.js
Displays sprint context for a decision in DecisionDetail
- Shows sprint name, project, dates, and goal
- Highlighted card with accent border
- Appears in right sidebar

### 3. SprintRoadmap.js
Displays all sprints for a project with their metrics in ProjectDetail
- Shows sprint name, dates, completion status, and decision count
- Clickable cards navigate to sprint detail
- Appears before boards section

## Integration Points

### ConversationDetail Page
- Added RelatedDecisions component to show linked decisions
- Decisions appear after developer insights section
- Provides context on what decisions were made from this conversation

### DecisionDetail Page
- Added RelatedSprints component to show sprint context
- Sprint appears in right sidebar with full details
- Helps understand which sprint this decision impacts

### ProjectDetail Page
- Added SprintRoadmap component before boards section
- Shows complete sprint roadmap with metrics
- Provides overview of project timeline and decisions

## Data Flow

```
Conversation
    ↓
    └─→ Decision (via conversation FK)
            ↓
            └─→ Sprint (via sprint FK)
                    ↓
                    └─→ Project (via project FK)
                    
Issue
    ↓
    └─→ Sprint (via sprint FK)
            ↓
            └─→ Decision (via sprint FK)
```

## UX Best Practices Implemented

1. **Breadcrumb Navigation**: Each component shows the path to related items
2. **Visual Hierarchy**: Related items use accent colors and hover effects
3. **Minimal Cognitive Load**: Show only essential info, link for details
4. **Consistent Styling**: All linking components use design tokens
5. **Lazy Loading**: Components fetch data on demand
6. **Error Handling**: Graceful fallbacks when no related items exist

## Key Features

- **Conversation → Decision**: See what decisions were made from discussions
- **Decision → Sprint**: Understand sprint impact of decisions
- **Sprint → Project**: View complete project roadmap
- **Issue → Decision**: Get decision context for work items
- **Bidirectional**: Navigate in both directions through relationships

## Database Relationships

All relationships already existed in models:
- Decision.conversation (FK to Conversation)
- Decision.sprint (FK to Sprint)
- Sprint.project (FK to Project)
- Issue.sprint (FK to Sprint)
- Blocker.conversation (FK to Conversation)
- Blocker.sprint (FK to Sprint)

## Performance Considerations

- Endpoints use select_related/prefetch_related for efficiency
- Components implement lazy loading
- Pagination not needed (small result sets)
- Caching via React state management

## Future Enhancements

1. Add search/filter within related items
2. Show decision impact metrics on sprints
3. Add timeline view showing all relationships
4. Implement bulk operations across linked items
5. Add relationship strength indicators
