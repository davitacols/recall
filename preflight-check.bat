@echo off
echo ================================================
echo RECALL - PRE-FLIGHT CHECK
echo ================================================
echo.

set ERRORS=0

REM Check Python
echo [1/8] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found
    set /a ERRORS+=1
) else (
    echo ✅ Python installed
)

REM Check Node
echo [2/8] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    set /a ERRORS+=1
) else (
    echo ✅ Node.js installed
)

REM Check Docker
echo [3/8] Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found
    set /a ERRORS+=1
) else (
    echo ✅ Docker installed
)

REM Check Docker running
echo [4/8] Checking Docker status...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Docker Desktop not running
    echo    Please start Docker Desktop
    set /a ERRORS+=1
) else (
    echo ✅ Docker running
)

REM Check backend venv
echo [5/8] Checking backend virtual environment...
if exist "backend\venv\Scripts\activate.bat" (
    echo ✅ Virtual environment exists
) else (
    echo ❌ Virtual environment not found
    echo    Run: cd backend ^&^& python -m venv venv
    set /a ERRORS+=1
)

REM Check backend dependencies
echo [6/8] Checking backend dependencies...
if exist "backend\venv\Lib\site-packages\django" (
    echo ✅ Django installed
) else (
    echo ❌ Dependencies not installed
    echo    Run: cd backend ^&^& venv\Scripts\activate ^&^& pip install -r requirements.txt
    set /a ERRORS+=1
)

REM Check frontend dependencies
echo [7/8] Checking frontend dependencies...
if exist "frontend\node_modules" (
    echo ✅ Node modules installed
) else (
    echo ❌ Node modules not installed
    echo    Run: cd frontend ^&^& npm install
    set /a ERRORS+=1
)

REM Check .env file
echo [8/8] Checking configuration...
if exist "backend\.env" (
    echo ✅ .env file exists
) else (
    echo ⚠️  .env file not found
    echo    Copy backend\.env.example to backend\.env
)

echo.
echo ================================================
echo RESULTS
echo ================================================

if %ERRORS% equ 0 (
    echo.
    echo 🎉 ALL CHECKS PASSED!
    echo.
    echo Ready to start. Run: start-all.bat
    echo.
) else (
    echo.
    echo ❌ %ERRORS% issue(s) found
    echo.
    echo Please fix the issues above before starting.
    echo.
)

pause
