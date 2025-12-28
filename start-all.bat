@echo off
echo ================================================
echo RECALL - COMPLETE SYSTEM STARTUP
echo ================================================
echo.

REM Check Docker
echo [1/4] Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop.
    pause
    exit /b 1
)
echo ✅ Docker installed

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo ✅ Docker running

echo.
echo [2/4] Starting Redis...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Failed to start Redis
    pause
    exit /b 1
)
echo ✅ Redis started

echo.
echo [3/4] Testing system components...
cd backend
call venv\Scripts\activate
python test_system.py
if %errorlevel% neq 0 (
    echo ⚠️  Some components failed. Check output above.
    echo.
    echo Continue anyway? (Y/N)
    set /p continue=
    if /i not "%continue%"=="Y" exit /b 1
)

echo.
echo [4/4] Starting services...
echo.
echo ================================================
echo NEXT STEPS:
echo ================================================
echo.
echo Open 3 new terminals and run:
echo.
echo   Terminal 1: start-backend.bat
echo   Terminal 2: start-celery.bat
echo   Terminal 3: start-frontend.bat
echo.
echo Then open: http://localhost:3000
echo.
pause
