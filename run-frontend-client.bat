@echo off
REM Script chạy Frontend Client chat widget

echo.
echo ==========================================
echo 🚀 Starting Frontend Client...
echo ==========================================
echo.
echo 📋 Configuration:
echo   - URL: http://localhost:5173
echo   - Socket.IO: http://localhost:3000
echo   - Chat Widget: Enabled
echo.

cd frontend-client

echo ⏳ Khởi động npm run dev...
echo.

call npm run dev

pause
