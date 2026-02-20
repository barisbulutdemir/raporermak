#!/bin/sh

echo "==> Running schema migration (if needed)..."
node /app/prisma-push.js || echo "==> Migration skipped (module not available, likely already applied)"

echo "==> Starting Next.js server..."
exec node server.js
