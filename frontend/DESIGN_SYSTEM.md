# Recall Design System

## Philosophy: Quiet Confidence

Recall should feel like:
- A thinking space
- A system of record
- Calm, serious, and reliable

**Meaning > decoration**

---

## Core Color Palette

| Purpose | Color | Hex |
|---------|-------|-----|
| Primary Black | Text, primary actions | `#0B0B0B` |
| Soft White | Background | `#FAFAFA` |
| Border Gray | Dividers, outlines | `#E5E7EB` |
| Muted Gray | Metadata, timestamps | `#6B7280` |

---

## Intelligence Accent (Signature Color)

**Recall Intelligence Blue: `#2563EB`**

Used for:
- AI-generated labels
- Active navigation state
- Primary call-to-action
- Focus indicators

**Rule: If everything is blue, nothing is important. Use sparingly.**

---

## Semantic Status Colors

| Meaning | Color | Hex |
|---------|-------|-----|
| Decision | Slate Blue | `#334155` |
| Question | Soft Amber | `#F59E0B` |
| Success/Locked | Deep Green | `#166534` |
| Critical Decision | Deep Red (rare) | `#7F1D1D` |

---

## Background Layering

- Base background: `#FAFAFA`
- Content surface: `#FFFFFF`
- Highlight strip: `#F8FAFC`

Depth created with:
- Borders
- Padding
- Alignment
- Typography

**No heavy shadows.**

---

## Typography

**Font: League Spartan**

| Element | Size | Weight |
|---------|------|--------|
| Page Title | 36-40px | Bold |
| Section Header | 20-24px | Semi-bold |
| Body Text | 16-18px | Regular |
| Metadata | 13-14px | Medium |

### Color Rules
- Titles: `#0B0B0B`
- Body: `#111827`
- Metadata: `#6B7280`

---

## Button Design

### Primary Button
- Background: `#0B0B0B`
- Text: White
- Hover: Slight opacity change
- Border radius: 0px (square)

### Secondary Button
- Border: `#0B0B0B`
- Background: Transparent
- Text: Black

### Destructive
- Text only
- Color: Muted red
- Requires confirmation

---

## Sidebar Design

### Background
- White or `#FAFAFA`

### Active Item
- Left border: Intelligence Blue
- Text weight increase
- No background fill

### Badges
- Gray by default
- Blue only if actionable

---

## AI Visual Language

AI should never shout.

### Pattern
- Small ✨ icon
- Label: "AI suggestion"
- Text color: Blue
- Subtle background tint: `#EFF6FF`

AI always:
- Explains why
- Allows editing
- Can be dismissed

---

## Decision Weight Styling

Decisions should feel heavier.

### Visual Cues
- Slightly darker border
- Left accent bar (slate blue)
- Larger line spacing
- Locked icon only after confirmation

**No animations. Just gravity.**

---

## Micro-Interactions

- Hover = slight underline
- Focus = blue outline
- Loading = thin progress bar (top of page)
- New activity = brief highlight fade

**Never bouncing. Never spinning.**

---

## Design Rulebook

1. If color doesn't add meaning → remove it
2. If AI acts → explain why
3. Decisions must feel heavier than messages
4. Silence is better than noise
5. Fewer colors, more hierarchy

---

## Implementation

Use the design tokens from `src/utils/designTokens.js` in your components.

Example:
```javascript
import { colors, typography } from '../utils/designTokens';

<button style={{ background: colors.primary, color: colors.surface }}>
  Action
</button>
```

Or use Tailwind classes with the extended config:
```jsx
<button className="bg-black text-white hover:opacity-90">
  Action
</button>
```
