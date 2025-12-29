# Recall UI Design — Knowledge-First Architecture

## ✅ Implementation Complete

### Core Philosophy
- **Non-technical and calm** — Clean, minimal interface
- **Knowledge-first** — Cards, not chat bubbles
- **Enterprise-ready** — Professional, trustworthy
- **Scalable** — Stable navigation structure

---

## 🎨 Design System

### Colors
- **Background**: `#fafafa` (Soft gray)
- **Surface**: `white` with subtle borders
- **Primary**: Blue 600 (calm, trustworthy)
- **Text**: Gray 900 (readable)
- **Accents**: Soft colors for post types

### Typography
- **Font**: Inter (clean, professional)
- **Sizes**: Comfortable reading (14-16px base)
- **Spacing**: Generous whitespace

### Components
- `.recall-card` — White cards with subtle borders
- `.recall-btn-primary` — Blue action buttons
- `.recall-btn-secondary` — Gray secondary buttons
- `.recall-input` — Clean form inputs
- `.recall-badge` — Soft status indicators

---

## 📐 Layout Structure

### Top Bar (56px height)
```
┌─────────────────────────────────────────────────┐
│ Logo | Org Name | [Global Search] | Profile     │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Global search: "Ask Recall anything..."
- Organization name visible
- Minimal, focused

### Sidebar (224px width)
```
┌──────────────┐
│ 🏠 Home      │
│ 📄 Decisions │
│ 📚 Knowledge │
│ ✨ Ask Recall│
│ 📊 Insights  │
│ ⚙️ Settings  │
└──────────────┘
```

**Navigation:**
- Icon + label
- Active state: Blue background
- Hover: Gray background
- Stable, never changes

### Main Content (Max 1200px)
- Centered content area
- Generous padding (32px)
- Comfortable reading width

---

## 📄 Pages Implemented

### 1. Home (Dashboard)
**Purpose:** Structured feed of organizational memory

**Features:**
- Card-based layout (not chat)
- Post type icons (Decision, Question, Proposal, Update)
- Color-coded badges
- Author + timestamp
- Reply count

**Visual Priority:**
- Decisions > Proposals > Questions > Updates

### 2. Ask Recall
**Purpose:** AI-powered knowledge search

**Features:**
- Large search input
- Natural language queries
- Answer with confidence level
- Related decisions
- Clean, factual presentation

**No chatbot personality** — Calm, trustworthy

### 3. Insights
**Purpose:** Analytics for executives

**Features:**
- Decision volume
- Knowledge gaps
- Trending topics
- High-risk areas

**No vanity metrics** — Only actionable insights

### 4. Decisions (Existing)
**Purpose:** Timeline of organizational decisions

**To Update:**
- Timeline visualization
- Decision cards
- Impact indicators

### 5. Knowledge (Existing)
**Purpose:** Searchable knowledge base

**To Update:**
- Search-first interface
- Topic clustering
- Related content

---

## 🎯 Key Interactions

### Global Search
- Always visible in top bar
- Placeholder: "Ask Recall anything..."
- Supports natural language
- Primary way to interact with Recall

### Post Cards
- Clean, readable layout
- Icon indicates type
- Badges show status/impact
- Hover: Subtle shadow
- Click: Navigate to detail

### Navigation
- Sidebar always visible
- Active state clear
- No nested menus
- Stable structure

---

## 🚫 What We Avoided

❌ Chat bubbles
❌ Noisy sidebars
❌ Gamified dashboards
❌ Task board visuals
❌ Flashy animations
❌ Notification spam

---

## ✨ What Makes This Special

### 1. Calm by Design
- Soft colors
- Generous spacing
- Minimal motion
- Quiet interface

### 2. Knowledge-First
- Cards show context
- Search is primary
- Memory, not messages
- Structured information

### 3. Enterprise-Ready
- Professional appearance
- Trustworthy design
- Scalable structure
- Clear hierarchy

### 4. Developer-Friendly
- Clean code structure
- Reusable components
- Consistent patterns
- Easy to extend

---

## 📱 Responsive Behavior

### Desktop (Primary)
- Full sidebar
- Wide content area
- Comfortable reading

### Tablet
- Collapsible sidebar
- Adjusted content width
- Touch-friendly targets

### Mobile (Secondary)
- Hidden sidebar (menu)
- Full-width content
- Read-first experience

---

## 🔄 Next Steps

### Pages to Update
1. **Decisions** — Add timeline view
2. **Knowledge** — Improve search UI
3. **ConversationDetail** — Add AI summary section
4. **Conversations** — Convert to card feed

### Features to Add
1. **Floating "+ New" button** — Create posts
2. **Context panel** — Related content sidebar
3. **Timeline visualization** — Decision history
4. **Confidence indicators** — AI trust levels

### Polish
1. Loading states
2. Empty states
3. Error handling
4. Keyboard shortcuts

---

## 🎨 Design Principles

> **"Recall should feel like reading your company's mind — calmly and clearly."**

### If users feel:
- ✅ Calm → Good
- ✅ Informed → Good
- ✅ Confident → Good
- ❌ Overwhelmed → Bad
- ❌ Distracted → Bad
- ❌ Anxious → Bad

---

## 📊 Success Metrics

### User Experience
- Time to find information ↓
- Search success rate ↑
- Daily active usage ↑
- User satisfaction ↑

### Knowledge Quality
- Documented decisions ↑
- Knowledge gaps ↓
- Decision reviews ↑
- Context clarity ↑

---

## 🧠 Final Thoughts

This design transforms Recall from a "chat app with AI" into a **"knowledge platform with conversations"**.

The UI is:
- Calm, not noisy
- Structured, not chaotic
- Memory-focused, not message-focused
- Enterprise-ready, not consumer-app

**Result:** Users trust Recall as their organization's memory.
