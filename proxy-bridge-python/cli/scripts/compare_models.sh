#!/bin/bash
# Compare multiple models
# Usage: ./compare_models.sh --models "model1,model2,model3" [--base-url URL]

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
MODELS="${MODELS:-}"

if [ -z "$MODELS" ]; then
    echo "Error: MODELS environment variable or --models argument required"
    echo "Usage: MODELS=model1,model2 ./compare_models.sh"
    exit 1
fi

echo "=========================================="
echo "  Model Comparison"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Models: $MODELS"
echo ""

# Run comparison
lmstudio-test compare_models --base-url "$BASE_URL" --models "$MODELS"

echo ""
echo "--- Individual Model Benchmarks ---"
IFS=',' read -ra MODEL_ARRAY <<< "$MODELS"
for model in "${MODEL_ARRAY[@]}"; do
    model=$(echo "$model" | xargs)
    echo ""
    echo "Benchmarking: $model"
    lmstudio-test benchmark --base-url "$BASE_URL" --model "$model" --iterations 3
done

echo ""
echo "--- Test History ---"
lmstudio-test history --limit 15

echo ""
echo "=========================================="
echo "  Model Comparison Complete!"
echo "=========================================="
