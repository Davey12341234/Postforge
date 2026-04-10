#!/usr/bin/env bash
# Generate a new Prisma migration from prisma/schema.prisma
# Usage: bash scripts/generate-migration.sh my_migration_name
# Requires: DATABASE_URL in .env (PostgreSQL)
#
# Note: `prisma migrate dev` is interactive. In CI/non-interactive shells, use:
#   npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script
#   (advanced) or run this script from a real terminal with TTY.

set -euo pipefail

NAME="${1:-init_unified_studio}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "📝 Prisma migrate dev — name: ${NAME}"
echo ""

if [[ ! -f prisma/schema.prisma ]]; then
  echo "❌ prisma/schema.prisma not found"
  exit 1
fi

npx prisma migrate dev --name "${NAME}"

echo ""
echo "✅ Done. Review: prisma/migrations/*/migration.sql"
echo "   Then: npx tsc --noEmit && npm run build"
