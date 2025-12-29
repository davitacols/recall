# GitHub-Style Design Implementation

## Overview
Full GitHub dark theme redesign applied to Recall platform with consistent styling across all components.

## Design System

### Color Palette
- **Background**: `#0d1117` (Dark background)
- **Surface**: `#161b22` (Card/panel background)
- **Border**: `#30363d` (Default borders)
- **Border Hover**: `#8b949e` (Hover state)
- **Text Primary**: `#c9d1d9` (Main text)
- **Text Secondary**: `#8b949e` (Muted text)
- **Text Tertiary**: `#6e7681` (Subtle text)
- **Link**: `#58a6ff` (Links and accents)
- **Success**: `#238636` (Green actions)
- **Warning**: `#9e6a03` (Yellow/orange)
- **Error**: `#da3633` (Red/critical)
- **Purple**: `#8957e5` (Proposals)
- **Blue**: `#1f6feb` (Updates)

### Typography
- **Font**: Inter (GitHub's font)
- **Sizes**: Compact, readable hierarchy
- **Weights**: 300-700 range

### Components

#### Buttons
- **Primary**: `.gh-btn-primary` - Green background (#238636)
- **Secondary**: `.gh-btn-secondary` - Gray with border
- **Base**: `.gh-btn` - Common button styles

#### Cards
- **Card**: `.gh-card` - Dark surface with border and hover effect

#### Inputs
- **Input**: `.gh-input` - Dark input with blue focus ring

#### Badges
- **Badge**: `.gh-badge` - Compact status indicators

#### Links
- **Link**: `.gh-link` - Blue with underline on hover

## Updated Components

### 1. Layout (Header & Navigation)
- Dark header with subtle border
- Compact navigation with rounded hover states
- Circular avatar with border
- Reduced spacing for GitHub-like density

### 2. Dashboard
- Compact card grid
- Smaller text sizes
- Badge-style post types
- Subtle borders and hover effects

### 3. Conversations
- Masonry and list view modes
- Image overlays with reduced opacity
- Compact cards with hover effects
- Badge-style labels

### 4. Login
- Centered minimal form
- Dark card container
- Simple logo
- Toggle link instead of tabs

### 5. Global Styles (index.css)
- Dark background (#0d1117)
- Inter font family
- Utility classes for common patterns
- Removed animations (cleaner, faster)

## Key Features

### Visual Hierarchy
- Clear content separation with borders
- Subtle hover states
- Consistent spacing (4px grid)
- Compact information density

### Interaction States
- Border color changes on hover
- Smooth transitions
- Focus rings on inputs
- Active states on buttons

### Responsive Design
- Mobile-friendly spacing
- Collapsible navigation
- Flexible grid layouts
- Touch-friendly targets

## Usage Examples

### Button
```jsx
<button className="gh-btn-primary">Create</button>
<button className="gh-btn-secondary">Cancel</button>
```

### Card
```jsx
<div className="gh-card p-4">
  <h3 className="text-sm font-semibold text-[#c9d1d9]">Title</h3>
  <p className="text-xs text-[#8b949e]">Description</p>
</div>
```

### Input
```jsx
<input 
  type="text" 
  className="gh-input" 
  placeholder="Search..."
/>
```

### Badge
```jsx
<span className="gh-badge bg-[#238636] text-white">
  approved
</span>
```

## Remaining Pages to Update

The following pages still need GitHub theme styling:
- Decisions
- DecisionDetail
- ConversationDetail
- Knowledge
- Settings
- Profile
- ActivityFeed
- StaffInvitations
- Notifications

## Next Steps

1. Apply GitHub theme to remaining pages
2. Update all modals and dialogs
3. Standardize form components
4. Add dark mode toggle (optional)
5. Test accessibility (contrast ratios)
6. Optimize for performance

## Notes

- Design prioritizes readability and information density
- Follows GitHub's visual language closely
- Maintains Recall's unique features and functionality
- All colors use GitHub's official palette
- Responsive and mobile-friendly
