/**
 * Comprehensive Benchmark Suite for Proxy-Bridge
 * Tests: Presets, Embeddings, Reranking, Context Engineering, RAG
 */
export {}

const PROXY_BRIDGE_URL = "http://localhost:3001";
const TIMEOUT_MS = 20000;

interface TestResult {
  success: boolean;
  testName: string;
  latencyMs?: number;
  error?: string;
  data?: any;
}

async function runTest(testName: string, fn: () => Promise<any>): Promise<TestResult> {
  console.log(`\n[Running] ${testName}...`);
  const start = Date.now();
  try {
    const data = await fn();
    const latencyMs = Date.now() - start;
    console.log(`[Success] ${testName} in ${latencyMs}ms`);
    return { success: true, testName, latencyMs, data };
  } catch (error) {
    const latencyMs = Date.now() - start;
    console.log(`[Failed] ${testName} in ${latencyMs}ms. Error: ${error}`);
    return { success: false, testName, latencyMs, error: String(error) };
  }
}

async function testEmbeddingWithMRLSlicing() {
  const response = await fetch(`${PROXY_BRIDGE_URL}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "text-embedding-qwen3-embedding-4b",
      input: ["How does MRL slicing work in Qwen3?"],
      dimensions: 1024
    })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const dim = data.data[0].embedding.length;
  if (dim !== 1024) throw new Error(`Expected dimension 1024, got ${dim}`);
  return { dim, sample: data.data[0].embedding.slice(0, 3) };
}

async function testRerankingStandalone() {
  const response = await fetch(`${PROXY_BRIDGE_URL}/v1/rerank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "Next.js server components",
      documents: [
        "Vue is a great frontend framework.",
        "React server components allow rendering on the server, a key feature in Next.js App Router.",
        "Bun is a fast JavaScript runtime."
      ],
      top_n: 1
    })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data;
}

async function testChatWithRAG() {
  // Sending a prompt that triggers RAG (intent pipeline should catch this)
  const response = await fetch(`${PROXY_BRIDGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instruct", // This doesn't matter much for the bridge, but acts as dummy
      messages: [
        { role: "user", content: "How is the proxy-bridge index.ts implemented? Show me the code." }
      ],
      max_tokens: 150
    })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content?.substring(0, 100) + "..."
  };
}

async function testContextEngineeringAndTools() {
  // Test a simple system prompt and tool usage if proxy-bridge supports intercepting it
  const response = await fetch(`${PROXY_BRIDGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instruct",
      messages: [
        { role: "system", content: "You are a highly capable coding assistant. You strictly output JSON." },
        { role: "user", content: "Write a function that adds two numbers." }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "execute_code",
            description: "Executes javascript code",
            parameters: { type: "object", properties: { code: { type: "string" } } }
          }
        }
      ],
      tool_choice: "auto",
      max_tokens: 200
    })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return {
    finish_reason: data.choices?.[0]?.finish_reason,
    message: data.choices?.[0]?.message
  };
}

async function testPresetsEndpoint() {
  const response = await fetch(`${PROXY_BRIDGE_URL}/presets/embedding`);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return {
    presetsCount: Object.keys(data.presets || {}).length,
    mrlCount: Object.keys(data.mrl_presets || {}).length,
    rerankerCount: Object.keys(data.reranker_configs || {}).length
  };
}

async function main() {
  console.log("==========================================");
  console.log("  Comprehensive Proxy-Bridge Benchmark    ");
  console.log("==========================================\n");

  // Wait a second for proxy bridge to be fully up if just started
  await new Promise(r => setTimeout(r, 1000));

  const results: TestResult[] = [];

  results.push(await runTest("Presets Configuration API", testPresetsEndpoint));
  results.push(await runTest("Embedding with MRL Slicing (1024 dims)", testEmbeddingWithMRLSlicing));
  results.push(await runTest("Standalone Reranking", testRerankingStandalone));
  results.push(await runTest("Chat Completion with RAG Intent", testChatWithRAG));
  results.push(await runTest("Context Engineering & Tool Calls", testContextEngineeringAndTools));

  console.log("\n==========================================");
  console.log("  Benchmark Summary                       ");
  console.log("==========================================");
  let passed = 0;
  for (const r of results) {
    const status = r.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} | ${r.testName.padEnd(40)} | ${r.latencyMs}ms`);
    if (r.success) {
      passed++;
      console.log(`   Result Data: ${JSON.stringify(r.data)}`);
    } else {
      console.log(`   Error: ${r.error}`);
    }
  }
  console.log(`\nTotal Passed: ${passed}/${results.length}`);
}

main().catch(console.error);