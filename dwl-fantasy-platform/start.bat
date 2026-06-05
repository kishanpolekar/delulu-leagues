@echo off
title DWL Fantasy League Platform
echo ========================================
echo    DWL Fantasy League Platform
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Starting Backend Server...
cd backend

:: Create virtual environment if it doesn't exist
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
)

:: Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
echo [INFO] Installing Python dependencies...
pip install -q fastapi uvicorn pandas openpyxl playwright python-multipart pydantic supabase

:: Install playwright browser
echo [INFO] Installing Playwright browser...
playwright install webkit >nul 2>&1

:: Start backend in new window
start "DWL Backend" cmd /k "cd /d %cd% && venv\Scripts\activate.bat && python api_server.py"

cd ..

:: Wait for backend to start
echo [INFO] Waiting for backend to start (5 seconds)...
timeout /t 5 /nobreak >nul

:: Start frontend
echo [INFO] Starting Frontend...
cd frontend

:: Install npm dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [INFO] Installing npm dependencies...
    call npm install
)

:: Start frontend
start "DWL Frontend" cmd /k "cd /d %cd% && npm run dev"

cd ..

echo.
echo ========================================
echo    Platform Started Successfully!
echo ========================================
echo.
echo    Backend: http://localhost:8000
echo    Frontend: http://localhost:3000
echo    API Docs: http://localhost:8000/docs
echo.
echo    Close the terminal windows to stop.
echo ========================================
echo.
pause