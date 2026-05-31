@echo off
REM Script chạy Backend Server cho Socket.IO Realtime Chat

echo.
echo ==========================================
echo 🚀 Starting Backend Server...
echo ==========================================
echo.
echo 📋 Kiểm tra environment:
echo   - NODE_ENV: development
echo   - PORT: 3000
echo   - Socket.IO: /socket.io
echo.

cd backend

echo ⏳ Khởi động npm run dev...
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo ❌ Backend failed to start!
    echo.
    echo Troubleshooting:
    echo 1. Check if port 3000 is already in use: netstat -ano | findstr :3000
    echo 2. Check MongoDB connection in .env
    echo 3. Run: npm install (if dependencies missing)
    echo.
)

pause
