@echo off
cd backend
call venv\Scripts\activate
echo Starting Celery worker...
celery -A config worker -l info --pool=solo
