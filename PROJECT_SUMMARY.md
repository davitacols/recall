# Recall - Project Summary

## Overview
Recall is a modern team collaboration and knowledge management platform built with React (frontend) and Django (backend). The application helps teams capture conversations, make decisions, and build organizational knowledge.

## Tech Stack

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **HTTP Client**: Axios
- **Deployment**: Vercel
- **URL**: https://recall-three-plum.vercel.app

### Backend
- **Framework**: Django 4.2.7
- **API**: Django REST Framework
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT (djangorestframework-simplejwt)
- **File Storage**: Cloudinary
- **Email**: Resend
- **Task Queue**: Celery + Redis
- **AI Integration**: Anthropic Claude
- **Deployment**: Render
- **URL**: https://recall-backend-4hok.onrender.com

## Core Features Implemented

### 1. Authentication & Authorization
- JWT-based authentication
- Email/password login
- Organization-based multi-tenancy
- Role-based access control (Admin, Manager, Contributor)
- Protected routes with role validation
- Session management

### 2. Organization Management
- Organization creation with company email validation
- Organization branding (logo upload, primary color)
- Organization settings page
- Team member management
- User invitation system with email notifications
- Organization statistics dashboard

### 3. Conversations
- Create, read, update, delete conversations
- Post types: Update, Question, Decision, Proposal
- Rich text content with @mentions and #tags
- Threaded replies with nested comments
- File attachments (upload/download with comments)
- Reactions (agree, unsure, concern)
- Bookmarking with private notes
- Status labels (Open, Good Example, Needs Follow-up, Resolved, In Progress)
- Edit history tracking
- Conversation timeline
- Share links generation
- Crisis mode flagging
- Convert to decision functionality

### 4. Decisions
- Decision tracking and management
- Impact levels (Low, Medium, High, Critical)
- Decision maker assignment
- Decision status workflow
- Convert conversations to decisions
- Decision analytics

### 5. Knowledge Base
- Search functionality across conversations
- Tag-based organization
- Keyword extraction
- AI-powered summaries
- Document management
- Knowledge statistics

### 6. Notifications
- Real-time notification system
- Email notifications via Resend
- Notification types: Mentions, Replies, Decisions, System
- Notification preferences (per type)
- Digest frequency settings (Realtime, Hourly, Daily, Weekly, Never)
- Mark as read/unread
- Delete notifications
- Unread count badge
- Notifications page with filtering

### 7. User Profile
- Profile management (name, bio, timezone)
- Avatar upload with Cloudinary
- Password change
- Activity statistics
- Profile images displayed throughout app

### 8. Settings
- Security settings (password management)
- Notification preferences
- User preferences (quiet mode, muted topics)
- Organization settings (admin only)
- Team management (invite, role changes, remove members)
- Data export (JSON format)
- Privacy controls

### 9. Staff Invitations
- Generate invitation links with tokens
- Email invitations with Resend
- Role assignment (Admin, Manager, Contributor)
- Invitation expiration (7 days)
- Invitation management (list, revoke)
- Token-based registration

### 10. Email System
- Welcome emails for new users
- Invitation emails with clickable links
- Notification emails (mentions, replies, decisions)
- User preference controls
- Async email sending via Celery

### 11. AI Features
- Conversation complexity detection
- Simple explanations for complex content
- AI-powered summaries
- Action item extraction
- Keyword extraction
- Developer insights

### 12. File Management
- Profile image upload
- Organization logo upload
- Document attachments to conversations
- Cloudinary integration for media storage
- File preview and download
- File size validation (max 10MB)

## Design System

### Visual Design
- **Color Scheme**: Clean black and white design
- **Typography**: League Spartan font family
- **Font Sizes**: 
  - Headers: 5xl/6xl
  - Titles: 2xl/3xl
  - Body: lg/xl
- **Buttons**: Square corners, black/white color scheme
- **Forms**: Square inputs, black borders
- **Cards**: Border-based design, no shadows
- **Spacing**: Generous padding and margins

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Collapsible sidebar on mobile
- Hamburger menu for mobile navigation
- Responsive grids and layouts
- Touch-friendly button sizes

### Components
- Reusable button classes (recall-btn-primary, recall-btn-secondary)
- Toast notification system
- Modal dialogs
- Dropdown menus
- Form inputs with validation
- Loading states
- Empty states

## Key Technical Implementations

### Frontend Architecture
- Component-based structure
- Custom hooks (useAuth)
- Context API for global state (Toast, Auth)
- Protected routes with role checking
- API service layer with interceptors
- Environment-based configuration

### Backend Architecture
- Django apps structure:
  - organizations (users, orgs, invitations)
  - conversations (posts, replies, documents)
  - decisions (decision tracking)
  - knowledge (search, tags)
  - notifications (notification system)
  - users (auth, profile)
- RESTful API design
- JWT authentication
- CORS configuration
- Media file handling
- Celery task queue
- Database optimization with indexes

### Security Features
- JWT token authentication
- Password hashing
- CORS protection
- CSRF protection
- Role-based access control
- Company email validation
- Invitation token expiration
- Secure file uploads

### Performance Optimizations
- Database query optimization
- Pagination (20 items per page)
- Lazy loading
- Image optimization via Cloudinary
- Async task processing with Celery
- Connection pooling

## Deployment

### Frontend (Vercel)
- Automatic deployments from GitHub
- Environment variables configured
- Custom domain support
- HTTPS enabled

### Backend (Render)
- Automatic deployments from GitHub
- Environment variables:
  - Database (PostgreSQL via Neon)
  - Redis (for Celery)
  - Cloudinary (media storage)
  - Resend (email service)
  - AWS (AI services)
- Static files served
- Media files via Cloudinary
- HTTPS enabled

## Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=https://recall-backend-4hok.onrender.com
```

### Backend (.env)
```
SECRET_KEY=<django-secret>
DEBUG=False
DATABASE_URL=<postgresql-url>
REDIS_URL=<redis-url>
CLOUDINARY_CLOUD_NAME=<cloudinary-name>
CLOUDINARY_API_KEY=<cloudinary-key>
CLOUDINARY_API_SECRET=<cloudinary-secret>
RESEND_API_KEY=<resend-key>
DEFAULT_FROM_EMAIL=Recall <onboarding@resend.dev>
FRONTEND_URL=https://recall-three-plum.vercel.app
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_REGION=us-east-1
ANTHROPIC_API_KEY=<anthropic-key>
```

## Database Schema

### Core Models
- **User**: Extended Django user with organization, role, avatar, preferences
- **Organization**: Multi-tenant organizations with branding
- **Invitation**: Token-based invitations with expiration
- **Conversation**: Main content model with posts
- **ConversationReply**: Threaded replies
- **Document**: File attachments
- **Decision**: Decision tracking
- **Notification**: User notifications
- **Tag**: Content tagging

## API Endpoints

### Authentication
- POST /api/auth/login/
- POST /api/auth/register/
- GET /api/auth/profile/
- PUT /api/auth/profile/update/
- POST /api/auth/password/change/

### Conversations
- GET /api/conversations/
- POST /api/conversations/
- GET /api/conversations/{id}/
- PUT /api/conversations/{id}/
- DELETE /api/conversations/{id}/
- GET /api/conversations/{id}/replies/
- POST /api/conversations/{id}/replies/
- POST /api/conversations/{id}/documents/upload/
- GET /api/conversations/{id}/documents/

### Notifications
- GET /api/notifications/
- POST /api/notifications/{id}/read/
- POST /api/notifications/mark-all-read/
- DELETE /api/notifications/{id}/

### Organizations
- GET /api/organizations/settings/organization/
- PUT /api/organizations/settings/organization/
- GET /api/organizations/settings/members/
- POST /api/organizations/settings/members/invite/
- PUT /api/organizations/settings/members/{id}/role/
- DELETE /api/organizations/settings/members/{id}/remove/

### Invitations
- POST /api/invitations/invite/
- GET /api/invitations/verify/{token}/
- GET /api/invitations/list/
- DELETE /api/invitations/{id}/revoke/

## Testing & Quality Assurance
- Manual testing across all features
- Cross-browser testing (Chrome, Firefox)
- Mobile responsiveness testing
- API endpoint testing
- Authentication flow testing
- File upload testing
- Email delivery testing

## Known Limitations
- No real-time WebSocket updates (uses polling)
- No offline mode
- No mobile native apps
- Limited AI features (requires API credits)
- No video/audio attachments
- No advanced search filters

## Future Enhancements
- Real-time updates with WebSockets
- Advanced search with filters
- Mobile apps (iOS/Android)
- Video conferencing integration
- Advanced analytics dashboard
- Custom workflows
- API webhooks
- Third-party integrations (Slack, Teams)
- Advanced AI features
- Multi-language support

## Project Statistics
- **Total Files**: 100+
- **Lines of Code**: ~15,000+
- **Components**: 30+
- **API Endpoints**: 50+
- **Database Tables**: 15+
- **Development Time**: Multiple weeks
- **Git Commits**: 100+

## Success Metrics
✅ Fully functional authentication system
✅ Complete CRUD operations for all entities
✅ Responsive design across all devices
✅ Production deployment on Vercel + Render
✅ Email notifications working
✅ File uploads working with Cloudinary
✅ Clean, modern UI design
✅ Role-based access control
✅ Multi-tenant architecture
✅ Comprehensive settings management

## Conclusion
Recall is a production-ready team collaboration platform with a clean, modern design and comprehensive feature set. The application successfully combines conversation management, decision tracking, and knowledge building into a unified platform that helps teams work more effectively.
