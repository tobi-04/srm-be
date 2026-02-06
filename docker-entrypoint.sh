#!/bin/sh
set -e

echo "🚀 Starting SRM Backend..."

# Auto seed admin user nếu chưa tồn tại
# Docker Compose đã đảm bảo MongoDB healthy rồi
echo "🌱 Auto-seeding default admin user..."
node dist/database/auto-seed.js || echo "⚠️  Auto-seed skipped"

# Start application
echo "✅ Starting main application..."
exec node dist/main.js
