#!/bin/sh
set -e

echo "🚀 Starting SRM Backend..."

# Auto seed admin user nếu chưa tồn tại
# Docker Compose đã đảm bảo MongoDB healthy rồi
echo "🌱 Auto-seeding default admin user (background)..."
# Run auto-seed in background so it cannot block main app startup
node dist/database/auto-seed.js >/dev/null 2>&1 || echo "⚠️  Auto-seed skipped" &

# Start application
echo "✅ Starting main application..."
exec node dist/main.js
