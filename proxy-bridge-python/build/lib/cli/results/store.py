"""Results storage and comparison."""

import json
import uuid
from datetime import datetime
from pathlib import Path


class ResultStore:
    """Persistent storage for test results."""

    def __init__(self, storage_dir: str | None = None):
        if storage_dir:
            self._dir = Path(storage_dir)
        else:
            self._dir = Path(__file__).parent.parent.parent / "cli" / "results" / "data"
        self._dir.mkdir(parents=True, exist_ok=True)

    def save(self, test_type: str, results: dict) -> str:
        """Save test results and return the run ID."""
        run_id = str(uuid.uuid4())
        data = {
            "id": run_id,
            "type": test_type,
            "timestamp": datetime.now().isoformat(),
            "results": results,
            "passed": sum(1 for v in results.values() if isinstance(v, dict) and v.get("ok")),
            "failed": sum(1 for v in results.values() if isinstance(v, dict) and not v.get("ok")),
            "duration_ms": self._calc_duration(results),
        }

        filepath = self._dir / f"{run_id}.json"
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

        return run_id

    def get(self, run_id: str) -> dict | None:
        """Get a specific test run by ID."""
        filepath = self._dir / f"{run_id}.json"
        if not filepath.exists():
            for f in self._dir.glob("*.json"):
                if f.stem.startswith(run_id):
                    filepath = f
                    break
            else:
                return None

        with open(filepath) as f:
            return json.load(f)

    def list_recent(self, limit: int = 10) -> list[dict]:
        """List recent test runs."""
        files = sorted(self._dir.glob("*.json"), key=lambda f: f.stat().st_mtime, reverse=True)
        results = []
        for f in files[:limit]:
            with open(f) as fh:
                results.append(json.load(fh))
        return results

    def compare(self, run_id_1: str, run_id_2: str) -> dict | None:
        """Compare two test runs."""
        r1 = self.get(run_id_1)
        r2 = self.get(run_id_2)
        if not r1 or not r2:
            return None

        comparison = {
            "run_1": {"id": r1["id"][:8], "type": r1["type"], "timestamp": r1["timestamp"][:19]},
            "run_2": {"id": r2["id"][:8], "type": r2["type"], "timestamp": r2["timestamp"][:19]},
            "differences": {},
        }

        for key in set(list(r1.get("results", {}).keys()) + list(r2.get("results", {}).keys())):
            t1 = r1.get("results", {}).get(key, {})
            t2 = r2.get("results", {}).get(key, {})
            if t1.get("ok") != t2.get("ok"):
                comparison["differences"][key] = {
                    "run_1": "PASS" if t1.get("ok") else "FAIL",
                    "run_2": "PASS" if t2.get("ok") else "FAIL",
                }
            d1 = t1.get("latency_ms", 0)
            d2 = t2.get("latency_ms", 0)
            if d1 and d2 and abs(d1 - d2) > 10:
                comparison["differences"][f"{key}_latency"] = {
                    "run_1": f"{d1:.0f}ms",
                    "run_2": f"{d2:.0f}ms",
                    "delta": f"{d2 - d1:+.0f}ms",
                }

        return comparison

    def _calc_duration(self, results: dict) -> float:
        """Calculate total duration from results."""
        total = 0.0
        for v in results.values():
            if isinstance(v, dict):
                total += v.get("latency_ms", 0)
                for sub in v.values():
                    if isinstance(sub, dict):
                        total += sub.get("latency_ms", 0)
        return total
