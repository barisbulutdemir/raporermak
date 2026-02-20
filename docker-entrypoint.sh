#!/bin/sh
set -e

echo "==> Running prisma db push..."
node /app/prisma-push.js

echo "==> Starting Next.js server..."
exec node server.js
