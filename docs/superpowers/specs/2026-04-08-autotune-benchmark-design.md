# Auto-Tuning Benchmark UI Design Plan

**Goal**: Bring the CLI's powerful hardware-aware benchmarking, "Spend Report", and Adaptive Tuning into the React frontend, while specifically addressing hardware architecture constraints (e.g., NVIDIA Maxwell/Pascal).
**Context**: The user identified that their Quadro M4000 (Maxwell) was being treated as a "HIGH" tier simply because of available RAM, leading to a painful 7.7 tokens/sec performance. We need to make the backend tuner architecture-aware, and the frontend tuner an interactive benchmark wizard.

## Architecture

### 1. Backend: Architecture-Aware Adaptive Tuner (`adaptive_tuner.py`)
- Update `generate_initial_preset` to detect pre-Volta architectures (`M4000`, `K80`, `GTX 9`, `GTX 10`).
- If pre-Volta is detected, hard-cap the `context_window` to `4096` and drop the quantization target to `Q4_K_S` or `Q3_K_M` to account for bandwidth bottlenecks.
- Update `_tune_complex_tests` to use a higher TPS threshold (e.g., if TPS < 10) for triggering a downgrade recommendation.

### 2. Frontend: Integrated Tuning Wizard (`AutoConfigTuner.tsx`)
- Transform the existing `AutoConfigTuner` from a simple static calculator into a multi-step Wizard.
- **Step 1: Hardware Analysis**: Fetch the preset from `/api/presets/generate`. Show the detected GPU, architecture warnings (if any), and the proposed baseline config.
- **Step 2: Live Benchmark**: Add a "Run Diagnostic Benchmark" button. This calls `/api/presets/run-test` (or a simulated endpoint for now) to test the model.
- **Step 3: Spend Report & Tune**: Display the results (TPS, TTFT, Total Tokens). If the TPS is low, suggest applying the adaptively tuned parameters before loading the model.

This approach directly connects the UI to the intelligence you built into the CLI, making it accessible to non-experts while solving the specific Maxwell architecture problem.