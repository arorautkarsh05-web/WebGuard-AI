@echo off
echo Starting WebGuard AI Backend on http://127.0.0.1:8000...
.\backend\venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

