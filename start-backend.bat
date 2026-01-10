@echo off
echo ========================================
echo PDF Summarizer - Backend Startup Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
echo [OK] Python is installed
echo.

REM Navigate to server directory
cd /d "%~dp0server"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing Node.js dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    echo [OK] Node.js dependencies installed
    echo.
)

REM Check Python dependencies
echo [INFO] Checking Python dependencies...
python -c "import torch, transformers, sentence_transformers, langchain, faiss, pypdf" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Some Python dependencies are missing
    echo [INFO] Installing Python dependencies...
    pip install torch transformers sentence-transformers langchain faiss-cpu pypdf langchain-text-splitters
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install Python dependencies
        echo Please install manually: pip install torch transformers sentence-transformers langchain faiss-cpu pypdf langchain-text-splitters
        pause
        exit /b 1
    )
)
echo [OK] Python dependencies are installed
echo.

REM Start the backend server
echo ========================================
echo Starting Backend Server...
echo ========================================
echo.
echo Server will start on http://localhost:3000
echo.
echo After the server starts, run ngrok in another terminal:
echo   ngrok http 3000
echo.
echo Then update client/config.js with your ngrok URL
echo.
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

node index.js

pause