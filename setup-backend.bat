@echo off
echo ============================================================
echo RECALL BACKEND SETUP
echo ============================================================
echo.

cd backend

echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment created

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment activated

echo.
echo [3/4] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo [4/4] Running migrations...
python manage.py migrate
if errorlevel 1 (
    echo [ERROR] Failed to run migrations
    pause
    exit /b 1
)
echo [OK] Migrations complete

echo.
echo ============================================================
echo SETUP COMPLETE!
echo ============================================================
echo.
echo You can now start the backend with: start-backend.bat
echo.
pause
