# LM Studio API Testing Script - Comprehensive Version
# Tests all critical REST API endpoints with proper error handling

$PROXY_BRIDGE = "http://localhost:3001"
$LM_STUDIO = "http://localhost:1234"

$global:LmStudioConnected = $false

Write-Host "=== LM Studio API Testing ===" -ForegroundColor Cyan
Write-Host ""

# Helper function to check LM Studio
function Test-LMStudioConnection {
    try {
        $response = Invoke-WebRequest -Uri "$LM_STUDIO/health" -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Check LM Studio first
Write-Host "Checking LM Studio connection..." -ForegroundColor Cyan
$global:LmStudioConnected = Test-LMStudioConnection
if ($global:LmStudioConnected) {
    Write-Host "LM Studio is connected at $LM_STUDIO" -ForegroundColor Green
} else {
    Write-Host "LM Studio is NOT connected at $LM_STUDIO" -ForegroundColor Yellow
    Write-Host "Some tests will be skipped or show limited results" -ForegroundColor Yellow
}
Write-Host ""

$passCount = 0
$failCount = 0
$skipCount = 0

# Test 1: Proxy Bridge Health
Write-Host "1. Testing Proxy Bridge Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$PROXY_BRIDGE/health" -ErrorAction Stop
    Write-Host "PASS: Proxy Bridge is running" -ForegroundColor Green
    Write-Host "  Response: $($health.Content)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "FAIL: Proxy Bridge NOT responding at $PROXY_BRIDGE" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    $failCount++
    exit 1
}
Write-Host ""

# Test 2: OpenAI-Compatible Models Endpoint
Write-Host "2. Testing OpenAI-Compatible /v1/models Endpoint..." -ForegroundColor Yellow
try {
    $models = Invoke-WebRequest -Uri "$PROXY_BRIDGE/v1/models" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "PASS: Models endpoint working" -ForegroundColor Green
    Write-Host "  Found $($models.data.Count) models:" -ForegroundColor Gray
    
    if ($models.data.Count -gt 0) {
        $models.data | Select-Object -First 5 | ForEach-Object {
            Write-Host "    - $($_.id)" -ForegroundColor Gray
        }
        
        $firstModel = $models.data[0]
        $requiredFields = @("id", "object", "created", "owned_by")
        $missingFields = @($requiredFields | Where-Object { -not $firstModel.PSObject.Properties.Name.Contains($_) })
        if ($missingFields.Count -eq 0) {
            Write-Host "  PASS: Response follows OpenAI spec" -ForegroundColor Green
        } else {
            Write-Host "  WARN: Missing fields: $($missingFields -join ', ')" -ForegroundColor Yellow
        }
    }
    $passCount++
} catch {
    Write-Host "FAIL: Failed to fetch models" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Test 3: LM Studio Native API
Write-Host "3. Testing LM Studio Native REST API..." -ForegroundColor Yellow
if ($global:LmStudioConnected) {
    try {
        $lmModels = Invoke-WebRequest -Uri "$LM_STUDIO/api/v1/models" -ErrorAction Stop | ConvertFrom-Json
        Write-Host "PASS: LM Studio API working" -ForegroundColor Green
        Write-Host "  Total models: $($lmModels.data.Count)" -ForegroundColor Gray
        $passCount++
    } catch {
        Write-Host "FAIL: LM Studio API error" -ForegroundColor Red
        $failCount++
    }
} else {
    Write-Host "SKIP: LM Studio not connected" -ForegroundColor Yellow
    $skipCount++
}
Write-Host ""

# Test 4: Loaded Models
Write-Host "4. Testing Get Loaded Models..." -ForegroundColor Yellow
try {
    $loaded = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/models/loaded" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "PASS: Get loaded models endpoint working" -ForegroundColor Green
    Write-Host "  Loaded: $($loaded.count) model(s)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "FAIL: Get loaded models failed" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Test 5: Chat Completions
Write-Host "5. Testing Chat Completions (/v1/chat/completions)..." -ForegroundColor Yellow

if ($global:LmStudioConnected) {
    try {
        $loadBody = @{ model = "qwen3.5-4b-claude-4.6-opus-reasoning-distilled-v2" } | ConvertTo-Json
        $null = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/models/load" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $loadBody -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    } catch { }
}

try {
    $chatBody = @{
        model = "qwen3.5-4b-claude-4.6-opus-reasoning-distilled-v2"
        messages = @(@{ role = "user"; content = "Hi" })
    } | ConvertTo-Json

    $chat = Invoke-WebRequest -Uri "$PROXY_BRIDGE/v1/chat/completions" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $chatBody -ErrorAction Stop | ConvertFrom-Json

    Write-Host "PASS: Chat endpoint working" -ForegroundColor Green
    $content = $chat.choices[0].message.content
    if ($content.Length -gt 50) { $content = $content.Substring(0, 50) + "..." }
    Write-Host "  Response: $content" -ForegroundColor Gray
    $passCount++
} catch {
    $errMsg = $_.Exception.Response.StatusCode.Value__
    if ($errMsg -eq "500") {
        Write-Host "WARN: Chat failed (LM Studio issue)" -ForegroundColor Yellow
    } else {
        Write-Host "FAIL: Chat endpoint failed" -ForegroundColor Red
    }
    $failCount++
}
Write-Host ""

# Test 6: Stateful Chat
Write-Host "6. Testing Stateful Chat..." -ForegroundColor Yellow
if ($global:LmStudioConnected) {
    try {
        $statefulBody = @{
            model = "qwen3.5-4b-claude-4.6-opus-reasoning-distilled-v2"
            input = "Hello"
            store = $true
        } | ConvertTo-Json

        $stateful = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/chat/stateful" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $statefulBody -ErrorAction Stop | ConvertFrom-Json

        if ($stateful.response_id) {
            Write-Host "PASS: Stateful chat working" -ForegroundColor Green
            Write-Host "  Response ID: $($stateful.response_id.Substring(0, 20))..." -ForegroundColor Gray
            $passCount++
        } else {
            Write-Host "FAIL: No response_id" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "FAIL: Stateful chat failed" -ForegroundColor Red
        $failCount++
    }
} else {
    Write-Host "SKIP: LM Studio not connected" -ForegroundColor Yellow
    $skipCount++
}
Write-Host ""

# Test 7: Embeddings
Write-Host "7. Testing Embeddings (/v1/embeddings)..." -ForegroundColor Yellow
if ($global:LmStudioConnected) {
    try {
        $embedBody = @{
            model = "text-embedding-qwen3-embedding-4b"
            input = "Hello world"
        } | ConvertTo-Json

        $embed = Invoke-WebRequest -Uri "$PROXY_BRIDGE/v1/embeddings" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $embedBody -ErrorAction Stop | ConvertFrom-Json

        if ($embed.data[0].embedding) {
            Write-Host "PASS: Embeddings working" -ForegroundColor Green
            Write-Host "  Dimensions: $($embed.data[0].embedding.Count)" -ForegroundColor Gray
            $passCount++
        } else {
            Write-Host "FAIL: No embedding returned" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "FAIL: Embeddings failed" -ForegroundColor Red
        $failCount++
    }
} else {
    Write-Host "SKIP: LM Studio not connected" -ForegroundColor Yellow
    $skipCount++
}
Write-Host ""

# Test 8: Reranker
Write-Host "8. Testing Reranker (/v1/rerank)..." -ForegroundColor Yellow
if ($global:LmStudioConnected) {
    try {
        $rerankBody = @{
            model = "qwen3-reranker-0.6b"
            query = "What is AI?"
            documents = @("AI is artificial intelligence", "The sky is blue", "Machine learning is AI")
            top_n = 3
        } | ConvertTo-Json

        $rerank = Invoke-WebRequest -Uri "$PROXY_BRIDGE/v1/rerank" -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $rerankBody -ErrorAction Stop | ConvertFrom-Json

        if ($rerank.results) {
            Write-Host "PASS: Reranker working" -ForegroundColor Green
            Write-Host "  Results: $($rerank.results.Count)" -ForegroundColor Gray
            $passCount++
        } else {
            Write-Host "FAIL: No rerank results" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "FAIL: Reranker failed" -ForegroundColor Red
        $failCount++
    }
} else {
    Write-Host "SKIP: LM Studio not connected" -ForegroundColor Yellow
    $skipCount++
}
Write-Host ""

# Test 9: Cache Stats
Write-Host "9. Testing Cache Stats..." -ForegroundColor Yellow
try {
    $cache = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/cache/stats" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "PASS: Cache stats working" -ForegroundColor Green
    Write-Host "  Hit rate: $($cache.hit_rate)%, Items: $($cache.size)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "FAIL: Cache stats failed" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Test 10: Performance Metrics
Write-Host "10. Testing Performance Metrics..." -ForegroundColor Yellow
try {
    $metrics = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/metrics" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "PASS: Metrics endpoint working" -ForegroundColor Green
    Write-Host "  Total requests: $($metrics.total_requests), TPS: $($metrics.tps)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "FAIL: Metrics failed" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Test 11: Status Endpoint
Write-Host "11. Testing Status Endpoint..." -ForegroundColor Yellow
try {
    $status = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/status" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "PASS: Status endpoint working" -ForegroundColor Green
    Write-Host "  Proxy status: $($status.status), LM Studio: $($status.lmstudio_connected)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "FAIL: Status failed" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Test 12: Tools Endpoint
Write-Host "12. Testing Tools Endpoint..." -ForegroundColor Yellow
try {
    $tools = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/tools" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "PASS: Tools endpoint working" -ForegroundColor Green
    Write-Host "  Registered tools: $($tools.tools.Count)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "FAIL: Tools failed" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Test 13: MCP Servers
Write-Host "13. Testing MCP Servers..." -ForegroundColor Yellow
try {
    $mcp = Invoke-WebRequest -Uri "$PROXY_BRIDGE/api/proxy/mcp/servers" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "PASS: MCP servers endpoint working" -ForegroundColor Green
    Write-Host "  Servers: $($mcp.servers.Count)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "FAIL: MCP servers failed" -ForegroundColor Red
    $failCount++
}
Write-Host ""

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "  PASSED: $passCount" -ForegroundColor Green
Write-Host "  FAILED: $failCount" -ForegroundColor Red
Write-Host "  SKIPPED: $skipCount" -ForegroundColor Yellow
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Check LM Studio connection for full functionality." -ForegroundColor Yellow
}
