@echo off
title KPR Hotel Agent Launcher
echo ========================================================
echo   Starting KPR Hotel Conversational Food Agent Platform
echo ========================================================
echo.

cd /d "%~dp0backend"
start "KPR Backend Server (Port 8000)" cmd /k ".\venv\Scripts\uvicorn app.main:app --port 8000 --reload"

cd /d "%~dp0frontend"
start "KPR Frontend Web Server (Port 5500)" cmd /k "python -m http.server 5500"

echo.
echo Servers started successfully!
echo.
echo - Web App: http://localhost:5500
echo - API Docs: http://localhost:8000/docs
echo.
timeout /t 3 >nul
start http://localhost:5500
exit
