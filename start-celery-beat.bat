@echo off
cd backend
call venv\Scripts\activate
celery -A config beat -l info --pool=solo
