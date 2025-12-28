# Activity Feed Setup

## Backend Setup

1. **Run migrations**:
```bash
cd backend
python manage.py migrate
```

2. **Start Django server**:
```bash
python manage.py runserver
```

## Frontend Setup

1. **Start React app**:
```bash
cd frontend
npm start
```

## Testing the Activity Feed

1. **Navigate to Activity Feed**:
   - Click "ACTIVITY" in the navigation menu
   - Or use Command Palette (⌘K) and search "Activity Feed"

2. **Generate Activity**:
   - Create a new conversation → Activity logged
   - Reply to a conversation → Activity logged
   - Create a decision → Activity logged
   - Approve a decision → Activity logged

3. **View Stats**:
   - TODAY: Activities from today
   - THIS WEEK: Activities from last 7 days
   - ALL TIME: Total activities

## API Endpoints

- `GET /api/organizations/activity/` - Fetch activity feed
- `GET /api/organizations/activity/stats/` - Get activity statistics

## Features

✅ Real-time activity timeline with Getty-style design
✅ Activity stats (today, this week, all time)
✅ Click activities to navigate to related content
✅ Automatic activity logging for:
   - Conversation creation
   - Conversation replies
   - Decision creation
   - Decision approval
   - Decision implementation
✅ Integrated with command palette (⌘K)
✅ Added to main navigation

## Design

- Getty Images editorial style
- Bold typography with League Spartan font
- 2px black borders
- Uppercase labels
- Timeline layout with icons
- Hover effects
- Relative timestamps (JUST NOW, 5M AGO, 2H AGO, 3D AGO)
