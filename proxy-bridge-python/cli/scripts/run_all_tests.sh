#!/bin/bash
# Run all tests - comprehensive test suite
# Usage: ./run_all_tests.sh [--base-url URL] [--model MODEL]

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
MODEL="${MODEL:-}"

echo "=========================================="
echo "  LMStudio Proxy Bridge - Full Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Model: ${MODEL:-Not specified}"
echo ""

# Tier 1: Simple Tests
echo ""
echo "=========================================="
echo "  TIER 1: Simple Tests"
echo "=========================================="

echo ""
echo "--- Health & Endpoints ---"
lmstudio-test endpoints --base-url "$BASE_URL"

echo ""
echo "--- Model Management ---"
lmstudio-test models --base-url "$BASE_URL"

if [ -n "$MODEL" ]; then
    echo ""
    echo "--- Streaming Tests ---"
    lmstudio-test streaming --base-url "$BASE_URL" --model "$MODEL"
fi

# Tier 2: Medium Tests
if [ -n "$MODEL" ]; then
    echo ""
    echo "=========================================="
    echo "  TIER 2: Medium Tests"
    echo "=========================================="

    echo ""
    echo "--- Scenario Tests ---"
    lmstudio-test scenarios --base-url "$BASE_URL" --model "$MODEL"

    echo ""
    echo "--- Parameter Sweep ---"
    lmstudio-test paramsweep --base-url "$BASE_URL" --model "$MODEL"

    echo ""
    echo "--- Tool Execution ---"
    lmstudio-test tools --base-url "$BASE_URL" --model "$MODEL"
fi

# Tier 3: Complex Tests
if [ -n "$MODEL" ]; then
    echo ""
    echo "=========================================="
    echo "  TIER 3: Complex Tests"
    echo "=========================================="

    echo ""
    echo "--- Performance Benchmark ---"
    lmstudio-test benchmark --base-url "$BASE_URL" --model "$MODEL" --iterations 3

    echo ""
    echo "--- Stress Tests ---"
    lmstudio-test stress --base-url "$BASE_URL" --model "$MODEL"
fi

# Tier 4: Full-Stack Tests
if [ -n "$MODEL" ]; then
    echo ""
    echo "=========================================="
    echo "  TIER 4: Full-Stack Tests"
    echo "=========================================="

    echo ""
    echo "--- End-to-End Tests ---"
    lmstudio-test e2e --base-url "$BASE_URL" --model "$MODEL"

    echo ""
    echo "--- RAG Pipeline Tests ---"
    lmstudio-test rag --base-url "$BASE_URL" --model "$MODEL"

    echo ""
    echo "--- Agentic Workflow Tests ---"
    lmstudio-test agents --base-url "$BASE_URL" --model "$MODEL"

    echo ""
    echo "--- MCP Integration Tests ---"
    lmstudio-test mcp --base-url "$BASE_URL" --model "$MODEL"
fi

echo ""
echo "=========================================="
echo "  Test History"
echo "=========================================="
lmstudio-test history --limit 20

echo ""
echo "=========================================="
echo "  All Tests Complete!"
echo "=========================================="
