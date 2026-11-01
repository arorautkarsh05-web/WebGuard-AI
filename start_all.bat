@echo off
echo Starting WebGuard AI Full Stack...
start "WebGuard AI Backend" cmd /k ".\backend\venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak >nul
cd frontend
start "WebGuard AI Frontend" cmd /k "npm run dev"
echo Backend running on http://127.0.0.1:8000
echo Frontend running on http://localhost:5173

