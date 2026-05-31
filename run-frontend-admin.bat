@echo off
REM Script chạy Frontend Admin cho Socket.IO Realtime Chat Support Page

echo.
echo ==========================================
echo 🚀 Starting Frontend Admin...
echo ==========================================
echo.
echo 📋 Configuration:
echo   - URL: http://localhost:5174
echo   - Socket.IO: http://localhost:3000
echo.

cd frontend-admin

echo ⏳ Khởi động npm run dev...
echo.

call npm run dev

pause
