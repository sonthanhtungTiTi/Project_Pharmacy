#!/bin/bash

# Script chạy Backend Server cho Socket.IO Realtime Chat

cd backend

echo "=========================================="
echo "🚀 Starting Backend Server..."
echo "=========================================="
echo ""
echo "📋 Kiểm tra environment variables:"
grep -E "^PORT|^NODE_ENV|^MONGO_URL" .env | head -3
echo ""
echo "⏳ Khởi động server..."
echo ""

npm run dev
