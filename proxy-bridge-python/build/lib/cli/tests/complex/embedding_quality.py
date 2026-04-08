"""Embedding quality tests - tests embedding generation and quality metrics."""

import time
import math
import httpx
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

console = Console()


async def run_embedding_quality_tests(base_url: str, model: str) -> dict:
    """Run embedding quality tests."""
    results = {
        "ok": True,
        "tests": {},
        "detail": "",
        "summary": {},
    }

    tests = [
        ("basic_embedding", _test_basic_embedding),
        ("batch_embedding", _test_batch_embedding),
        ("semantic_similarity", _test_semantic_similarity),
        ("embedding_dimensions", _test_embedding_dimensions),
        ("embedding_performance", _test_embedding_performance),
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running embedding quality tests...", total=len(tests))

        for name, test_func in tests:
            progress.update(task, description=f"Testing {name}...")
            result = await test_func(base_url, model)
            results["tests"][name] = result
            progress.advance(task)

    passed = sum(1 for t in results["tests"].values() if t.get("ok"))
    total = len(results["tests"])
    results["ok"] = passed == total
    results["detail"] = f"{passed}/{total} embedding tests passed"
    results["summary"] = {"passed": passed, "total": total, "failed": total - passed}

    return results


async def _test_basic_embedding(base_url: str, model: str) -> dict:
    """Test basic embedding generation."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/v1/embeddings",
                json={
                    "model": model,
                    "input": "Hello, world!",
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                embedding_data = data.get("data", [])
                if embedding_data:
                    embedding = embedding_data[0].get("embedding", [])
                    return {
                        "ok": True,
                        "dimensions": len(embedding),
                        "latency_ms": round(duration_ms, 2),
                        "model_used": data.get("model", model),
                        "object_type": data.get("object", ""),
                    }
                return {"ok": False, "detail": "No embedding data returned"}
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_batch_embedding(base_url: str, model: str) -> dict:
    """Test batch embedding generation."""
    inputs = [
        "The cat sat on the mat.",
        "A feline rested on a rug.",
        "The dog barked loudly.",
        "Python is a programming language.",
        "I love writing code in Python.",
    ]

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/embeddings",
                json={
                    "model": model,
                    "input": inputs,
                },
            )
            duration_ms = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                embedding_data = data.get("data", [])
                return {
                    "ok": len(embedding_data) == len(inputs),
                    "inputs_count": len(inputs),
                    "embeddings_generated": len(embedding_data),
                    "latency_ms": round(duration_ms, 2),
                    "avg_latency_per_input_ms": round(duration_ms / len(inputs), 2) if inputs else 0,
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_semantic_similarity(base_url: str, model: str) -> dict:
    """Test semantic similarity using cosine similarity."""
    pairs = [
        ("The cat sat on the mat", "A feline rested on a rug", True),
        ("The cat sat on the mat", "The dog barked loudly", False),
        ("I love programming in Python", "Python is my favorite language", True),
        ("The weather is nice today", "It's raining outside", False),
    ]

    embeddings = []
    texts = []
    for text1, text2, _ in pairs:
        texts.extend([text1, text2])

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/v1/embeddings",
                json={
                    "model": model,
                    "input": texts,
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                embedding_data = data.get("data", [])
                embeddings = [e.get("embedding", []) for e in embedding_data]

                if len(embeddings) < len(texts):
                    return {"ok": False, "detail": "Not all embeddings returned"}

                similarity_results = []
                correct_predictions = 0

                for i, (text1, text2, should_be_similar) in enumerate(pairs):
                    idx1 = i * 2
                    idx2 = i * 2 + 1
                    similarity = cosine_similarity(embeddings[idx1], embeddings[idx2])

                    predicted_similar = similarity > 0.7
                    is_correct = predicted_similar == should_be_similar
                    if is_correct:
                        correct_predictions += 1

                    similarity_results.append({
                        "text1": text1[:30],
                        "text2": text2[:30],
                        "similarity": round(similarity, 4),
                        "should_be_similar": should_be_similar,
                        "predicted_similar": predicted_similar,
                        "correct": is_correct,
                    })

                accuracy = correct_predictions / len(pairs) if pairs else 0

                return {
                    "ok": accuracy >= 0.5,
                    "pairs_tested": len(pairs),
                    "correct_predictions": correct_predictions,
                    "accuracy": round(accuracy, 2),
                    "results": similarity_results,
                }
            return {"ok": False, "status_code": resp.status_code}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_embedding_dimensions(base_url: str, model: str) -> dict:
    """Test embedding dimension consistency."""
    inputs = [
        "Short text.",
        "A slightly longer text with more words to analyze.",
        "This is a much longer text that contains multiple sentences. It should still produce an embedding of the same dimensions as the shorter texts.",
    ]

    dimensions = []
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            for i, text in enumerate(inputs):
                resp = await client.post(
                    f"{base_url}/v1/embeddings",
                    json={
                        "model": model,
                        "input": text,
                    },
                )

                if resp.status_code == 200:
                    data = resp.json()
                    embedding_data = data.get("data", [])
                    if embedding_data:
                        embedding = embedding_data[0].get("embedding", [])
                        dimensions.append(len(embedding))

        consistent = len(set(dimensions)) == 1 if dimensions else False
        return {
            "ok": consistent,
            "inputs_tested": len(inputs),
            "dimensions": dimensions,
            "consistent_dimensions": consistent,
            "dimension_value": dimensions[0] if dimensions else None,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _test_embedding_performance(base_url: str, model: str) -> dict:
    """Test embedding generation performance."""
    iterations = 5
    latencies = []

    for i in range(iterations):
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/v1/embeddings",
                    json={
                        "model": model,
                        "input": f"Test text number {i} for performance measurement.",
                    },
                )
                duration_ms = (time.time() - start) * 1000
                if resp.status_code == 200:
                    latencies.append(duration_ms)
        except Exception:
            continue

    if not latencies:
        return {"ok": False, "detail": "All embedding requests failed"}

    return {
        "ok": True,
        "iterations": len(latencies),
        "avg_latency_ms": round(sum(latencies) / len(latencies), 2),
        "min_latency_ms": round(min(latencies), 2),
        "max_latency_ms": round(max(latencies), 2),
        "embeddings_per_second": round(len(latencies) / (sum(latencies) / 1000), 2),
    }


def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))

    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0

    return dot_product / (magnitude1 * magnitude2)


def print_embedding_quality_summary(results: dict):
    """Print a formatted summary of embedding quality test results."""
    table = Table(title="Embedding Quality Test Summary")
    table.add_column("Test", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Metric", style="yellow")
    table.add_column("Value", style="magenta")

    for name, result in results.get("tests", {}).items():
        status = "PASS" if result.get("ok") else "FAIL"

        if name == "basic_embedding":
            metric = "Dimensions"
            value = str(result.get("dimensions", "N/A"))
        elif name == "batch_embedding":
            metric = "Embeddings"
            value = f"{result.get('embeddings_generated', 0)}/{result.get('inputs_count', 0)}"
        elif name == "semantic_similarity":
            metric = "Accuracy"
            value = f"{result.get('accuracy', 'N/A')}"
        elif name == "embedding_dimensions":
            metric = "Consistent"
            value = str(result.get("consistent_dimensions", "N/A"))
        elif name == "embedding_performance":
            metric = "Embeddings/sec"
            value = f"{result.get('embeddings_per_second', 'N/A')}"
        else:
            metric = "Detail"
            value = str(result.get("detail", "N/A"))[:30]

        table.add_row(name, status, metric, str(value))

    console.print(table)
    console.print(f"\n[bold]Summary: {results.get('summary', {}).get('passed', 0)}/{results.get('summary', {}).get('total', 0)} embedding tests passed[/bold]")
