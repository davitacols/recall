@echo off
cd backend
call venv\Scripts\activate
echo Starting Django server...
python manage.py runserver
