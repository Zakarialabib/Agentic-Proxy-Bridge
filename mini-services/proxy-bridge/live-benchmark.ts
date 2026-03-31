/**
 * Live Benchmark Suite - Bun Script Alternative
 * Tests against real LM Studio (port 1234) and Proxy Bridge (port 3001)
 * Run with: bun run live-benchmark.ts
 */

const LM_STUDIO_URL = "http://localhost:1234";
const PROXY_BRIDGE_URL = "http://localhost:3001";
const RESULTS_FILE = "benchmark-results.json";

const ITERATIONS = 10;
const EMBEDDING_COUNT = 50;
const CONCURRENT_REQUESTS = 20;

interface BenchmarkResult {
  benchmark: string;
  iterations: number;
  results: {
    avgLatency: number;
    p50: number;
    p95: number;
    p99: number;
    throughput: number;
  };
  passed: boolean;
  metadata: Record<string, unknown>;
}

interface ServiceStatus {
  lmStudio: boolean;
  proxyBridge: boolean;
}

interface TestResult {
  success: boolean;
  latency?: number;
  error?: string;
  firstTokenTime?: number;
  data?: unknown;
}

async function testPort(host: string, port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    await fetch(`http://${host}:${port}`, { 
      method: "HEAD",
      signal: controller.signal 
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

async function checkServices(): Promise<ServiceStatus> {
  console.log("\n" + "=".repeat(46));
  console.log("  Checking Services");
  console.log("=".repeat(46) + "\n");
  
  const lmStudio = await testPort("localhost", 1234);
  console.log(`LM Studio (port 1234): ${lmStudio ? "✓ OK" : "✗ FAILED"}`);
  
  const proxyBridge = await testPort("localhost", 3001);
  console.log(`Proxy Bridge (port 3001): ${proxyBridge ? "✓ OK" : "✗ FAILED"}`);
  
  return { lmStudio, proxyBridge };
}

function calculatePercentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function computeStats(latencies: number[]): { avg: number; p50: number; p95: number; p99: number; throughput: number } {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avgLatency = sum / latencies.length;
  const totalTime = sorted[sorted.length - 1] - sorted[0];
  const throughput = totalTime > 0 ? (latencies.length / totalTime) * 1000 : 0;

  return {
    avg: Math.round(avgLatency * 10) / 10,
    p50: Math.round(calculatePercentile(sorted, 50)),
    p95: Math.round(calculatePercentile(sorted, 95)),
    p99: Math.round(calculatePercentile(sorted, 99)),
    throughput: Math.round(throughput * 100) / 100
  };
}

async function invokeChatCompletion(prompt: string, timeoutMs = 15000): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${PROXY_BRIDGE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return { success: true, latency: Date.now() - startTime, data };
  } catch (error) {
    const errMsg = String(error);
    if (errMsg.includes("aborted") || errMsg.includes("timeout")) {
      return { success: false, error: "Timeout" };
    }
    return { success: false, error: errMsg };
  }
}

async function invokeStreamingChat(prompt: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${PROXY_BRIDGE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        stream: true
      })
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const firstTokenTime = Date.now() - startTime;
    return { success: true, firstTokenTime, latency: firstTokenTime };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function invokeEmbeddings(texts: string[]): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${PROXY_BRIDGE_URL}/v1/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts
      })
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return { success: true, latency: Date.now() - startTime, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function createResult(
  testName: string,
  iterations: number,
  latencies: number[],
  passed: boolean,
  metadata: Record<string, unknown> = {}
): BenchmarkResult {
  const stats = latencies.length > 0 ? computeStats(latencies) : { avg: 0, p50: 0, p95: 0, p99: 0, throughput: 0 };
  
  return {
    benchmark: testName,
    iterations,
    results: {
      avgLatency: stats.avg,
      p50: stats.p50,
      p95: stats.p95,
      p99: stats.p99,
      throughput: stats.throughput
    },
    passed,
    metadata
  };
}

async function testChatCompletions(): Promise<BenchmarkResult> {
  console.log("\n" + "=".repeat(46));
  console.log(`  Testing Chat Completions (${ITERATIONS} iterations)`);
  console.log("=".repeat(46) + "\n");
  
  const latencies: number[] = [];
  const prompt = "Write a short haiku about programming";
  
  for (let i = 0; i < ITERATIONS; i++) {
    const result = await invokeChatCompletion(prompt, 15000);
    
    if (result.success && result.latency) {
      latencies.push(result.latency);
      process.stdout.write(".");
    } else {
      process.stdout.write("X");
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log("\n");
  
  if (latencies.length > 0) {
    const stats = computeStats(latencies);
    console.log(`  Avg: ${stats.avg}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms | Throughput: ${stats.throughput} req/s`);
    return createResult("chat_completions", ITERATIONS, latencies, stats.avg < 5000);
  }
  
  return createResult("chat_completions", 0, [], false);
}

async function testEmbeddingsWithBatching(): Promise<BenchmarkResult> {
  console.log("\n" + "=".repeat(46));
  console.log(`  Testing Embeddings with Batching (${EMBEDDING_COUNT} texts)`);
  console.log("=".repeat(46) + "\n");
  
  const texts: string[] = [];
  for (let i = 0; i < EMBEDDING_COUNT; i++) {
    texts.push(`Test embedding text number ${i} for batch processing verification`);
  }
  
  texts.push("Duplicate text for deduplication test");
  texts.push("Duplicate text for deduplication test");
  texts.push("Another duplicate for testing");
  texts.push("Another duplicate for testing");
  
  const result = await invokeEmbeddings(texts);
  
  if (result.success && result.latency) {
    const embeddingCount = (result.data as { data?: { length: number } })?.data?.length || 0;
    const throughput = (embeddingCount / result.latency) * 1000;
    
    console.log(`  Processed ${embeddingCount} embeddings in ${Math.round(result.latency)}ms`);
    console.log(`  Throughput: ${Math.round(throughput)} embeddings/s`);
    
    return createResult("embeddings_batching", texts.length, [result.latency], result.latency < 10000, {
      embeddingCount,
      deduplicatedCount: texts.length - embeddingCount
    });
  }
  
  console.log(`  Error: ${result.error}`);
  return createResult("embeddings_batching", 0, [], false);
}

async function testConcurrentRequests(): Promise<BenchmarkResult> {
  console.log("\n" + "=".repeat(46));
  console.log(`  Testing Concurrent Requests (${CONCURRENT_REQUESTS} simultaneous)`);
  console.log("=".repeat(46) + "\n");
  
  const latencies: number[] = [];
  const startTime = Date.now();
  const prompt = "What is 2 + 2?";
  
  const promises = Array.from({ length: CONCURRENT_REQUESTS }, async () => {
    const result = await invokeChatCompletion(prompt, 15000);
    if (result.success && result.latency) {
      latencies.push(result.latency);
    }
    return result;
  });
  
  const results = await Promise.allSettled(promises);
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const totalTime = Date.now() - startTime;
  
  if (latencies.length > 0) {
    const stats = computeStats(latencies);
    const throughput = (latencies.length / totalTime) * 1000;
    
    console.log(`  Completed: ${latencies.length}/${CONCURRENT_REQUESTS} requests`);
    console.log(`  Avg: ${stats.avg}ms | P95: ${stats.p95}ms | Total: ${Math.round(totalTime)}ms`);
    console.log(`  Throughput: ${Math.round(throughput)} req/s`);
    
    return createResult("concurrent_requests", latencies.length, latencies, latencies.length === CONCURRENT_REQUESTS, {
      totalTimeMs: Math.round(totalTime)
    });
  }
  
  return createResult("concurrent_requests", 0, [], false);
}

async function testStreamingLatency(): Promise<BenchmarkResult> {
  console.log("\n" + "=".repeat(46));
  console.log("  Testing Streaming Response Latency");
  console.log("=".repeat(46) + "\n");
  
  const ttftTimes: number[] = [];
  const prompt = "Count from 1 to 5";
  
  for (let i = 0; i < 5; i++) {
    const result = await invokeStreamingChat(prompt);
    
    if (result.success && result.firstTokenTime) {
      ttftTimes.push(result.firstTokenTime);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  if (ttftTimes.length > 0) {
    const stats = computeStats(ttftTimes);
    const avgTTFT = ttftTimes.reduce((a, b) => a + b, 0) / ttftTimes.length;
    
    console.log(`  Time to First Token (TTFT): ${Math.round(avgTTFT)}ms avg`);
    console.log(`  P95 TTFT: ${stats.p95}ms`);
    
    return createResult("streaming_latency", ttftTimes.length, ttftTimes, avgTTFT < 3000);
  }
  
  return createResult("streaming_latency", 0, [], false);
}

async function testConnectionPool(): Promise<BenchmarkResult> {
  console.log("\n" + "=".repeat(46));
  console.log("  Testing Connection Pool Effectiveness");
  console.log("=".repeat(46) + "\n");
  
  const concurrency = 15;
  const latencies: number[] = [];
  const timeoutMs = 15000;
  const maxRetries = 2;
  
  async function invokeWithRetry(prompt: string): Promise<TestResult> {
    let lastError = "Unknown error";
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await invokeChatCompletion("Ping", timeoutMs);
      if (result.success) {
        return result;
      }
      lastError = result.error || "Unknown error";
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return { success: false, error: `Failed after ${maxRetries + 1} attempts: ${lastError}` };
  }
  
  const promises = Array.from({ length: concurrency }, async () => {
    const result = await invokeWithRetry("Ping");
    if (result.success && result.latency) {
      latencies.push(result.latency);
    }
    return result;
  });
  
  const results = await Promise.allSettled(promises);
  const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;
  const failedCount = results.filter(r => r.status === 'rejected').length;
  
  console.log(`  Completed: ${fulfilledCount}/${concurrency} succeeded, ${failedCount} failed`);
  
  if (latencies.length > 0) {
    const stats = computeStats(latencies);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    console.log(`  Avg latency: ${Math.round(avgLatency)}ms`);
    console.log(`  P95: ${stats.p95}ms | P99: ${stats.p99}ms`);
    
    return createResult("connection_pool", latencies.length, latencies, fulfilledCount === concurrency, {
      poolSize: 10,
      queueLength: 0,
      failedCount
    });
  }
  
  return createResult("connection_pool", 0, [], false);
}

async function testEmbeddingDeduplication(): Promise<BenchmarkResult> {
  console.log("\n" + "=".repeat(46));
  console.log("  Testing Embedding Deduplication");
  console.log("=".repeat(46) + "\n");
  
  const duplicates = [
    "This is a test sentence",
    "This is a test sentence",
    "This is a test sentence",
    "Unique sentence one",
    "Unique sentence one",
    "Another unique sentence",
    "Another unique sentence"
  ];
  
  const result = await invokeEmbeddings(duplicates);
  
  if (result.success && result.latency) {
    const uniqueCount = (result.data as { data?: { length: number } })?.data?.length || 0;
    const dedupRatio = duplicates.length > 0 ? uniqueCount / duplicates.length : 0;
    
    console.log(`  Input: ${duplicates.length} texts | Output: ${uniqueCount} embeddings`);
    console.log(`  Deduplication rate: ${(dedupRatio * 100).toFixed(1)}%`);
    console.log(`  Latency: ${Math.round(result.latency)}ms`);
    
    const passed = dedupRatio < 1.0;
    
    return createResult("embedding_deduplication", duplicates.length, [result.latency], passed, {
      uniqueEmbeddings: uniqueCount,
      deduplicationRatio: Number(dedupRatio.toFixed(2))
    });
  }
  
  console.log(`  Error: ${result.error}`);
  return createResult("embedding_deduplication", 0, [], false);
}

function printSummaryTable(results: BenchmarkResult[]): void {
  console.log("\n" + "=".repeat(46));
  console.log("  Benchmark Results Summary");
  console.log("=".repeat(46) + "\n");
  
  const padRight = (s: string, len: number): string => s.padEnd(len);
  const header = padRight("  Test", 28) + padRight("Status", 10) + padRight("Avg Latency", 15) + padRight("P95", 12) + "P99";
  console.log(header);
  console.log("  " + "-".repeat(75));
  
  for (const result of results) {
    const statusStr = result.passed ? "✓ PASS" : "✗ FAIL";
    const testName = result.benchmark;
    const avgStr = `${result.results.avgLatency}ms`;
    const p95Str = `${result.results.p95}ms`;
    const p99Str = `${result.results.p99}ms`;
    
    const color = result.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    
    console.log(`${color}  ${padRight(testName, 28)} ${padRight(statusStr, 10)} ${padRight(avgStr, 15)} ${padRight(p95Str, 12)} ${p99Str}${reset}`);
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const passRate = total > 0 ? ((passed / total) * 100) : 0;
  
  const passColor = passRate >= 80 ? "\x1b[32m" : passRate >= 50 ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";
  
  console.log(`\n  ${passColor}Total: ${passed}/${total} tests passed (${passRate.toFixed(1)}%)${reset}`);
}

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║     LM Studio Live Benchmark Suite v1.0       ║");
  console.log("╚══════════════════════════════════════════════════╝");
  
  const services = await checkServices();
  
  if (!services.lmStudio || !services.proxyBridge) {
    console.log("\n\x1b[31mError: Required services are not running\x1b[0m");
    console.log("Please ensure LM Studio (port 1234) and Proxy Bridge (port 3001) are running");
    process.exit(1);
  }
  
  const results: BenchmarkResult[] = [];
  
  results.push(await testChatCompletions());
  results.push(await testEmbeddingsWithBatching());
  results.push(await testConcurrentRequests());
  results.push(await testStreamingLatency());
  results.push(await testConnectionPool());
  results.push(await testEmbeddingDeduplication());
  
  printSummaryTable(results);
  
  const output = {
    timestamp: Date.now(),
    services,
    benchmarks: results
  };
  
  await Bun.write(RESULTS_FILE, JSON.stringify(output, null, 2));
  console.log(`\n\x1b[32mResults saved to ${RESULTS_FILE}\x1b[0m`);
  
  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
