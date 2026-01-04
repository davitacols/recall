# Recall - Quick Start Guide

## Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL (or use Neon)
- Redis (optional, for Celery)

## Setup & Run

### 1. Backend Setup (Django)

**Terminal 1 - Backend:**
```bash
cd d:\Recall\backend

# Activate virtual environment
venv\Scripts\activate

# Install dependencies (if needed)
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start Django server
python manage.py runserver
```

The backend will run on: **http://localhost:8000**

### 2. Frontend Setup (React)

**Terminal 2 - Frontend:**
```bash
cd d:\Recall\frontend

# Install dependencies (if needed)
npm install

# Start React development server
npm start
```

The frontend will run on: **http://localhost:3000**

## Verify Setup

1. **Backend Running**: Visit http://localhost:8000/api/agile/projects/ (should show JSON)
2. **Frontend Running**: Visit http://localhost:3000 (should show login page)
3. **CORS Enabled**: Check browser console for CORS errors (should be none)

## Common Issues

### CORS Error
- **Cause**: Backend not running
- **Fix**: Start Django server in Terminal 1

### Database Connection Error
- **Cause**: PostgreSQL/Neon not accessible
- **Fix**: Check DATABASE_URL in .env file
- **Fallback**: Use SQLite (change DATABASE_URL to `sqlite:///db.sqlite3`)

### Port Already in Use
- **Backend**: `python manage.py runserver 8001`
- **Frontend**: `PORT=3001 npm start`

## First Time Setup

1. Start both servers
2. Go to http://localhost:3000
3. Click "Sign up"
4. Create an organization
5. Create a project
6. Create a sprint
7. Create issues
8. Use the Kanban board

## Database Reset (if needed)

```bash
cd d:\Recall\backend

# Delete migrations (except __init__.py)
# Then run:
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

## Environment Variables

Check `.env` file in backend folder:
- `DEBUG=True` (development)
- `ALLOWED_HOSTS=localhost,127.0.0.1`
- `DATABASE_URL=postgresql://...` (or sqlite:///db.sqlite3)
- `FRONTEND_URL=http://localhost:3000`

## API Documentation

Once backend is running, visit:
- **Admin Panel**: http://localhost:8000/admin/
- **API Root**: http://localhost:8000/api/

## Troubleshooting

### "Connection refused" error
- Backend server not running
- Check Terminal 1 for errors

### "CORS request did not succeed"
- Backend server not running or not accessible
- Check firewall settings
- Verify ALLOWED_HOSTS in settings.py

### "Module not found" error
- Virtual environment not activated
- Run: `venv\Scripts\activate`

### Database errors
- Check PostgreSQL/Neon connection
- Verify DATABASE_URL in .env
- Try SQLite for development

## Next Steps

Once both servers are running:
1. Login with your credentials
2. Create a project (e.g., "ML Models for Pic2Nav")
3. Create a sprint
4. Create issues
5. Drag issues on the Kanban board
6. Test all features

Enjoy using Recall! 🚀
