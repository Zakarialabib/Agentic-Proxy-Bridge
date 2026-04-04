#!/bin/bash
# Run performance benchmarks
# Usage: ./run_benchmarks.sh --model MODEL [--base-url URL] [--iterations N]

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
MODEL="${MODEL:-}"
ITERATIONS="${ITERATIONS:-5}"

if [ -z "$MODEL" ]; then
    echo "Error: MODEL environment variable or --model argument required"
    echo "Usage: MODEL=<model-name> ./run_benchmarks.sh"
    exit 1
fi

echo "=========================================="
echo "  Performance Benchmarks"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Model: $MODEL"
echo "Iterations: $ITERATIONS"
echo ""

echo "--- Performance Benchmark ---"
lmstudio-test benchmark --base-url "$BASE_URL" --model "$MODEL" --iterations "$ITERATIONS"

echo ""
echo "--- Stress Tests ---"
lmstudio-test stress --base-url "$BASE_URL" --model "$MODEL"

echo ""
echo "--- Test History ---"
lmstudio-test history --limit 10

echo ""
echo "=========================================="
echo "  Benchmarks Complete!"
echo "=========================================="
