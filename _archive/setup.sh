#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo " Postforge + Unified Content Studio setup"
echo "========================================="
echo ""

if ! command -v node &>/dev/null; then
  echo "Node.js not found. Install Node 20+ first."
  exit 1
fi
echo "Node $(node --version)"

if ! command -v npm &>/dev/null; then
  echo "npm not found."
  exit 1
fi
echo "npm $(npm --version)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Installing dependencies..."
npm install

echo ""
echo "Prisma: migrate (dev) or push..."
if npx prisma migrate dev --name add-unified-studio; then
  echo "migrate dev OK"
else
  echo "migrate dev failed — trying db push (dev only)"
  npx prisma db push
fi

echo ""
echo "Generating Prisma client..."
npx prisma generate

echo ""
echo "========================================="
echo " Done."
echo "========================================="
echo " 1. Copy .env.local.example to .env.local"
echo " 2. Set ANTHROPIC_API_KEY for /unified chat"
echo " 3. npm run dev  →  http://localhost:3000/unified"
echo ""
