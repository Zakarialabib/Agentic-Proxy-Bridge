#!/bin/bash
# Run simple tests only - quick connectivity check
# Usage: ./run_simple.sh [--base-url URL]

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "=========================================="
echo "  Simple Tests - Quick Connectivity Check"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

echo "--- Health & Endpoints ---"
lmstudio-test endpoints --base-url "$BASE_URL"

echo ""
echo "--- Model Management ---"
lmstudio-test models --base-url "$BASE_URL"

echo ""
echo "--- Test History ---"
lmstudio-test history --limit 5

echo ""
echo "=========================================="
echo "  Simple Tests Complete!"
echo "=========================================="
