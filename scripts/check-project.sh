#!/bin/bash

echo "=== Docker containers ==="
docker ps

echo ""
echo "=== Git status ==="
git status

echo ""
echo "=== Playwright test ==="
docker exec competitor_playwright npm run check -- https://example.com
