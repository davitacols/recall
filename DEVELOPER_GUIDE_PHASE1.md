# Phase 1 Components - Developer Guide

## Quick Reference for Using New Components

---

## 1. Auto-Save Hook

### Basic Usage
```javascript
import { useAutoSave } from '../hooks/useAutoSave';
import SaveIndicator from '../components/SaveIndicator';

function MyComponent() {
  const saveData = async (data) => {
    await api.put('/api/endpoint/', data);
  };

  const { status, triggerSave, getStatusText } = useAutoSave(saveData, 2000);

  const handleChange = (e) => {
    const newValue = e.target.value;
    triggerSave({ field: newValue });
  };

  return (
    <div>
      <input onChange={handleChange} />
      <SaveIndicator status={status} statusText={getStatusText()} />
    </div>
  );
}
```

### Parameters
- `saveFunction` - Async function that saves data
- `delay` - Debounce delay in ms (default: 2000)

### Returns
- `status` - 'saved' | 'saving' | 'unsaved' | 'error'
- `triggerSave(data)` - Function to trigger save
- `getStatusText()` - Human-readable status message

---

## 2. Inline Editable Text

### Basic Usage
```javascript
import InlineEditableText from '../components/InlineEditableText';

function MyComponent() {
  const handleSave = async (newValue) => {
    await api.put('/api/endpoint/', { title: newValue });
  };

  return (
    <InlineEditableText
      value={title}
      onSave={handleSave}
      placeholder="Enter title"
      className="text-2xl font-bold"
    />
  );
}
```

### Props
- `value` - Current text value
- `onSave` - Async function called on save
- `multiline` - Boolean for textarea vs input (default: false)
- `placeholder` - Placeholder text
- `className` - CSS classes for input
- `displayClassName` - CSS classes for display mode

### Features
- Click to edit
- Auto-save after 2 seconds
- ESC to cancel
- Enter to save (single-line only)
- Blur to save

---

## 3. Save Indicator

### Basic Usage
```javascript
import SaveIndicator from '../components/SaveIndicator';

<SaveIndicator status="saved" statusText="Saved just now" />
```

### Props
- `status` - 'saved' | 'saving' | 'error'
- `statusText` - Text to display

### Visual States
- **Saving**: Spinner + "Saving..."
- **Saved**: Green checkmark + "Saved just now"
- **Error**: Red X + "Save failed"

---

## 4. First Time Experience

### Basic Usage
```javascript
import FirstTimeExperience from '../components/FirstTimeExperience';

function Dashboard() {
  return (
    <div>
      <FirstTimeExperience />
      {/* Rest of dashboard */}
    </div>
  );
}
```

### Features
- Auto-hides after first conversation created
- Dismissible (saves to localStorage)
- Shows 3-step guided flow
- Links to sample decision

### Customization
Edit steps in `FirstTimeExperience.js`:
```javascript
const steps = [
  {
    title: 'Your title',
    description: 'Your description',
    action: 'Button text',
    link: '/your-link'
  }
];
```

---

## 5. Personal Memory Pages

### My Decisions
```javascript
// Route: /my-decisions
// Shows only decisions where user is decision_maker
```

### My Questions
```javascript
// Route: /my-questions
// Shows only questions where user is author
```

### Adding New Personal Views
1. Create page in `pages/MyXXX.js`
2. Filter by `user.id` in fetch
3. Add route to `App.js`
4. Add link to `Layout.js` personalNav

---

## 6. One-Click Actions

### Pattern
```javascript
// Before: Multi-step modal
const handleAction = () => {
  setShowModal(true);
};

// After: One-click with smart defaults
const handleQuickAction = async () => {
  try {
    const response = await api.post('/api/endpoint/', { 
      // Smart defaults
      impact_level: 'medium',
      status: 'active'
    });
    // Immediate redirect
    window.location.href = `/result/${response.data.id}`;
  } catch (error) {
    alert(error.response?.data?.error || 'Failed');
  }
};
```

### When to Use
- ✅ Common actions with obvious defaults
- ✅ Actions that can be edited later
- ✅ Time-sensitive workflows
- ❌ Destructive actions (keep confirmation)
- ❌ Actions requiring multiple inputs

---

## 7. Sample Content Pages

### Creating Sample Pages
```javascript
// pages/SampleXXX.js
function SampleDecision() {
  return (
    <div>
      {/* Educational banner */}
      <div className="bg-blue-50 border-2 border-blue-600 p-6">
        <p>This is a sample to show how it works</p>
      </div>

      {/* Realistic content */}
      <h1>Sample Title</h1>
      <p>Sample content that looks real...</p>

      {/* CTA to create real content */}
      <Link to="/create">Create your own</Link>
    </div>
  );
}
```

### Best Practices
- Use realistic data (not "Lorem ipsum")
- Show complete structure
- Include educational banner
- End with clear CTA
- Link from onboarding

---

## 8. Sidebar Navigation

### Adding Personal Links
```javascript
// In Layout.js
const personalNav = [
  { name: 'My Decisions', href: '/my-decisions' },
  { name: 'My Questions', href: '/my-questions' },
  { name: 'My New Thing', href: '/my-new-thing' }, // Add here
];
```

### Section Organization
- **Primary Nav**: Main features (Home, Conversations, Decisions)
- **Quick Actions**: Create buttons
- **Personal**: User-specific views
- **Saved**: Bookmarks, Drafts, Files

---

## Design Patterns

### 1. Empty States
```javascript
{items.length === 0 ? (
  <div className="text-center py-20 border border-gray-200 bg-gray-50">
    <h3 className="text-2xl font-bold text-gray-900 mb-3">No items yet</h3>
    <p className="text-lg text-gray-600 mb-8">
      Clear explanation of what this is for.
    </p>
    <a href="/create" className="recall-btn-primary inline-block">
      Action-oriented CTA
    </a>
  </div>
) : (
  // List items
)}
```

### 2. Status Indicators
```javascript
// Color-coded dots
<span className={`w-3 h-3 rounded-full ${
  level === 'critical' ? 'bg-red-600' :
  level === 'high' ? 'bg-orange-500' :
  level === 'medium' ? 'bg-blue-500' :
  'bg-gray-400'
}`}></span>
```

### 3. Stats Cards
```javascript
<div className="grid grid-cols-4 gap-6 mb-8">
  <div className="border border-gray-200 p-6">
    <div className="text-4xl font-bold text-gray-900 mb-2">42</div>
    <div className="text-sm text-gray-600 font-medium">Label</div>
  </div>
</div>
```

---

## Common Patterns

### Fetch User-Specific Data
```javascript
const fetchMyData = async () => {
  const response = await api.get('/api/endpoint/');
  const myData = (response.data.results || response.data).filter(
    item => item.author_id === user?.id
  );
  setData(myData);
};
```

### Filter with Counts
```javascript
const [filter, setFilter] = useState('all');

const filteredItems = items.filter(item => {
  if (filter === 'all') return true;
  return item.status === filter;
});

const statusCounts = items.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] || 0) + 1;
  return acc;
}, {});
```

### Auto-Hide Components
```javascript
const [dismissed, setDismissed] = useState(false);

useEffect(() => {
  const isDismissed = localStorage.getItem('component_dismissed');
  if (isDismissed) setDismissed(true);
}, []);

const handleDismiss = () => {
  localStorage.setItem('component_dismissed', 'true');
  setDismissed(true);
};

if (dismissed) return null;
```

---

## Testing Checklist

### Auto-Save
- [ ] Shows "Saving..." immediately
- [ ] Shows "Saved just now" after save
- [ ] Debounces rapid changes
- [ ] Shows error state on failure

### Inline Editing
- [ ] Click to edit works
- [ ] ESC cancels edit
- [ ] Enter saves (single-line)
- [ ] Blur saves changes
- [ ] Shows save indicator

### Personal Views
- [ ] Filters to current user only
- [ ] Shows correct counts
- [ ] Empty state displays
- [ ] Links work correctly

### Onboarding
- [ ] Shows for new users
- [ ] Dismisses properly
- [ ] Hides after first action
- [ ] Sample content loads

---

## Performance Tips

1. **Debounce auto-save** - Use 2000ms minimum
2. **Filter client-side** - For small datasets (<100 items)
3. **LocalStorage for UI state** - Dismissals, preferences
4. **Memoize expensive filters** - Use useMemo for large lists
5. **Lazy load sample content** - Don't fetch unless needed

---

## Accessibility

1. **Keyboard navigation** - All interactive elements focusable
2. **ARIA labels** - Add to icon-only buttons
3. **Focus states** - Visible on all inputs
4. **Screen reader text** - For status indicators
5. **Color contrast** - Black/white meets WCAG AA

---

## Questions?

Check the implementation files:
- `hooks/useAutoSave.js` - Auto-save logic
- `components/SaveIndicator.js` - Status display
- `components/InlineEditableText.js` - Inline editing
- `components/FirstTimeExperience.js` - Onboarding
- `pages/MyDecisions.js` - Personal view example
