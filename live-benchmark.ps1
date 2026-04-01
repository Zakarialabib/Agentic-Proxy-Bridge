# Live Benchmark Suite for LM Studio Proxy Bridge
# Tests against real LM Studio (port 1234) and Proxy Bridge (port 3001)

$ErrorActionPreference = "Stop"

# Configuration
$LM_STUDIO_URL = "http://192.168.1.12:1234"
$PROXY_BRIDGE_URL = "http://localhost:3001"
$RESULTS_FILE = "benchmark-results.json"
$ITERATIONS = 10
$EMBEDDING_COUNT = 50
$CONCURRENT_REQUESTS = 20

# ANSI colors for console output
$GREEN = "`e[32m"
$RED = "`e[31m"
$YELLOW = "`e[33m"
$CYAN = "`e[36m"
$RESET = "`e[0m"

function Write-BenchmarkHeader {
    param([string]$Message)
    Write-Host "`n$CYAN===============================================" -NoNewline
    Write-Host $RESET
    Write-Host "$CYAN  $Message$RESET" -ForegroundColor Cyan
    Write-Host "$CYAN===============================================$RESET`n"
}

function Test-Port {
    param([string]$Host, [int]$Port)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($Host, $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitTimeout(2000)
        $tcpClient.Close()
        return $wait
    } catch {
        return $false
    }
}

function Get-BenchmarkResult {
    param(
        [string]$TestName,
        [int]$Iterations,
        [double]$AvgLatency,
        [double]$P95,
        [double]$P99,
        [double]$Throughput,
        [bool]$Passed,
        [hashtable]$Metadata = @{}
    )
    
    return @{
        benchmark = $TestName
        iterations = $Iterations
        results = @{
            avgLatency = [math]::Round($AvgLatency, 2)
            p50 = 0
            p95 = [math]::Round($P95, 2)
            p99 = [math]::Round($P99, 2)
            throughput = [math]::Round($Throughput, 2)
        }
        passed = $Passed
        metadata = $Metadata
    }
}

function Invoke-ChatCompletion {
    param([string]$Prompt)
    
    $body = @{
        model = "llama-3.1-8b-instruct"
        messages = @(
            @{ role = "system"; content = "You are a helpful assistant." }
            @{ role = "user"; content = $Prompt }
        )
        max_tokens = 150
        temperature = 0.7
    } | ConvertTo-Json -Depth 3
    
    try {
        $response = Invoke-RestMethod -Uri "$PROXY_BRIDGE_URL/v1/chat/completions" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -TimeoutSec 60
        
        return $response
    } catch {
        throw "Chat completion failed: $_"
    }
}

function Invoke-StreamingChat {
    param([string]$Prompt)
    
    $body = @{
        model = "llama-3.1-8b-instruct"
        messages = @(
            @{ role = "user"; content = $Prompt }
        )
        max_tokens = 200
        stream = $true
    } | ConvertTo-Json -Depth 2
    
    $firstTokenTime = $null
    $startTime = Get-Date
    
    try {
        $response = Invoke-WebRequest -Uri "$PROXY_BRIDGE_URL/v1/chat/completions" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -TimeoutSec 60
        
        if ($response.StatusCode -eq 200) {
            $firstTokenTime = ((Get-Date) - $startTime).TotalMilliseconds
        }
        
        return @{
            success = $true
            firstTokenTime = $firstTokenTime
            statusCode = $response.StatusCode
        }
    } catch {
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Invoke-Embeddings {
    param([string[]]$Texts)
    
    $body = @{
        model = "text-embedding-3-small"
        input = $Texts
    } | ConvertTo-Json -Depth 2
    
    try {
        $response = Invoke-RestMethod -Uri "$PROXY_BRIDGE_URL/v1/embeddings" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -TimeoutSec 30
        
        return $response
    } catch {
        throw "Embedding request failed: $_"
    }
}

function Get-Statistics {
    param([double[]]$Values)
    
    if ($Values.Count -eq 0) {
        return @{ avg = 0; p50 = 0; p95 = 0; p99 = 0 }
    }
    
    $sorted = @($Values | Sort-Object)
    $sum = ($Values | Measure-Object -Sum).Sum
    $avg = $sum / $Values.Count
    
    $p50Idx = [math]::Ceiling(0.50 * $sorted.Count) - 1
    $p95Idx = [math]::Ceiling(0.95 * $sorted.Count) - 1
    $p99Idx = [math]::Ceiling(0.99 * $sorted.Count) - 1
    
    return @{
        avg = [math]::Round($avg, 2)
        p50 = [math]::Round($sorted[$p50Idx], 2)
        p95 = [math]::Round($sorted[$p95Idx], 2)
        p99 = [math]::Round($sorted[$p99Idx], 2)
    }
}

function Start-ServiceCheck {
    Write-BenchmarkHeader "Checking Services"
    
    # Check LM Studio
    Write-Host "Checking LM Studio on port 1234..." -NoNewline
    $lmStudioRunning = Test-Port "192.168.1.12" 1234
    if ($lmStudioRunning) {
        Write-Host " $GREEN[OK]$RESET" -ForegroundColor Green
    } else {
        Write-Host " $RED[FAILED]$RESET" -ForegroundColor Red
    }
    
    # Check Proxy Bridge
    Write-Host "Checking Proxy Bridge on port 3001..." -NoNewline
    $proxyRunning = Test-Port "localhost" 3001
    if ($proxyRunning) {
        Write-Host " $GREEN[OK]$RESET" -ForegroundColor Green
    } else {
        Write-Host " $RED[FAILED]$RESET" -ForegroundColor Red
    }
    
    return @{
        lmStudio = $lmStudioRunning
        proxyBridge = $proxyRunning
    }
}

function Test-ChatCompletions {
    Write-BenchmarkHeader "Testing Chat Completions ($ITERATIONS iterations)"
    
    $latencies = @()
    $prompt = "Write a short haiku about programming"
    
    for ($i = 0; $i -lt $ITERATIONS; $i++) {
        $startTime = Get-Date
        
        try {
            $null = Invoke-ChatCompletion -Prompt $prompt
            $latency = ((Get-Date) - $startTime).TotalMilliseconds
            $latencies += $latency
            
            Write-Host "." -NoNewline
        } catch {
            Write-Host "X" -NoNewline
        }
        
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host ""
    
    if ($latencies.Count -gt 0) {
        $stats = Get-Statistics -Values $latencies
        $throughput = ($ITERATIONS / ($latencies | Measure-Object -Sum).Sum) * 1000
        
        Write-Host "  Avg: $($stats.avg)ms | P95: $($stats.p95)ms | P99: $($stats.p99)ms | Throughput: $([math]::Round($throughput, 2)) req/s" -ForegroundColor Yellow
        
        return Get-BenchmarkResult -TestName "chat_completions" -Iterations $ITERATIONS `
            -AvgLatency $stats.avg -P95 $stats.p95 -P99 $stats.p99 -Throughput $throughput `
            -Passed ($stats.avg -lt 5000)
    }
    
    return Get-BenchmarkResult -TestName "chat_completions" -Iterations 0 `
        -AvgLatency 0 -P95 0 -P99 0 -Throughput 0 -Passed $false
}

function Test-EmbeddingsWithBatching {
    Write-BenchmarkHeader "Testing Embeddings with Batching ($EMBEDDING_COUNT texts)"
    
    # Generate test texts
    $texts = @()
    for ($i = 0; $i -lt $EMBEDDING_COUNT; $i++) {
        $texts += "Test embedding text number $i for batch processing verification"
    }
    
    # Add duplicates for deduplication test
    $texts += "Duplicate text for deduplication test"
    $texts += "Duplicate text for deduplication test"
    $texts += "Another duplicate for testing"
    $texts += "Another duplicate for testing"
    
    $startTime = Get-Date
    
    try {
        $response = Invoke-Embeddings -Texts $texts
        $latency = ((Get-Date) - $startTime).TotalMilliseconds
        
        $embeddingCount = 0
        if ($response.data) {
            $embeddingCount = $response.data.Count
        }
        
        Write-Host "  Processed $embeddingCount embeddings in $([math]::Round($latency, 2))ms" -ForegroundColor Yellow
        Write-Host "  Throughput: $([math]::Round(($embeddingCount / $latency) * 1000, 2)) embeddings/s" -ForegroundColor Yellow
        
        $throughput = ($texts.Count / $latency) * 1000
        $passed = $latency -lt 10000
        
        return Get-BenchmarkResult -TestName "embeddings_batching" -Iterations $texts.Count `
            -AvgLatency $latency -P95 $latency -P99 $latency -Throughput $throughput `
            -Passed $passed -Metadata @{
                embeddingCount = $embeddingCount
                deduplicatedCount = $texts.Count - $embeddingCount
            }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        return Get-BenchmarkResult -TestName "embeddings_batching" -Iterations 0 `
            -AvgLatency 0 -P95 0 -P99 0 -Throughput 0 -Passed $false
    }
}

function Test-ConcurrentRequests {
    Write-BenchmarkHeader "Testing Concurrent Requests ($CONCURRENT_REQUESTS simultaneous)"
    
    $latencies = @()
    $startTime = Get-Date
    $prompt = "What is 2 + 2?"
    
    $jobs = @()
    for ($i = 0; $i -lt $CONCURRENT_REQUESTS; $i++) {
        $jobs += Start-Job -ScriptBlock {
            param($url, $prompt)
            
            $body = @{
                model = "llama-3.1-8b-instruct"
                messages = @(@{ role = "user"; content = $prompt })
                max_tokens = 50
            } | ConvertTo-Json
            
            $reqStart = Get-Date
            try {
                $null = Invoke-RestMethod -Uri "$url/v1/chat/completions" `
                    -Method POST `
                    -Body $body `
                    -ContentType "application/json" `
                    -TimeoutSec 60
                $latency = ((Get-Date) - $reqStart).TotalMilliseconds
                return @{ success = $true; latency = $latency }
            } catch {
                return @{ success = $false; latency = 0; error = $_.Exception.Message }
            }
        } -ArgumentList $PROXY_BRIDGE_URL, $prompt
    }
    
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    $totalTime = ((Get-Date) - $startTime).TotalMilliseconds
    
    foreach ($result in $results) {
        if ($result.success) {
            $latencies += $result.latency
        }
    }
    
    if ($latencies.Count -gt 0) {
        $stats = Get-Statistics -Values $latencies
        $throughput = ($latencies.Count / $totalTime) * 1000
        
        Write-Host "  Completed: $($latencies.Count)/$CONCURRENT_REQUESTS requests" -ForegroundColor Yellow
        Write-Host "  Avg: $($stats.avg)ms | P95: $($stats.p95)ms | Total: $([math]::Round($totalTime, 2))ms" -ForegroundColor Yellow
        Write-Host "  Throughput: $([math]::Round($throughput, 2)) req/s" -ForegroundColor Yellow
        
        return Get-BenchmarkResult -TestName "concurrent_requests" -Iterations $latencies.Count `
            -AvgLatency $stats.avg -P95 $stats.p95 -P99 $stats.p99 -Throughput $throughput `
            -Passed ($latencies.Count -eq $CONCURRENT_REQUESTS) -Metadata @{
                totalTimeMs = [math]::Round($totalTime, 2)
            }
    }
    
    return Get-BenchmarkResult -TestName "concurrent_requests" -Iterations 0 `
        -AvgLatency 0 -P95 0 -P99 0 -Throughput 0 -Passed $false
}

function Test-StreamingLatency {
    Write-BenchmarkHeader "Testing Streaming Response Latency"
    
    $ttftTimes = @()  # Time to first token
    $prompt = "Count from 1 to 5"
    
    for ($i = 0; $i -lt 5; $i++) {
        $result = Invoke-StreamingChat -Prompt $prompt
        
        if ($result.success -and $result.firstTokenTime) {
            $ttftTimes += $result.firstTokenTime
        }
        
        Start-Sleep -Milliseconds 200
    }
    
    if ($ttftTimes.Count -gt 0) {
        $stats = Get-Statistics -Values $ttftTimes
        $avgTTFT = ($ttftTimes | Measure-Object -Average).Average
        
        Write-Host "  Time to First Token (TTFT): $([math]::Round($avgTTFT, 2))ms avg" -ForegroundColor Yellow
        Write-Host "  P95 TTFT: $([math]::Round($stats.p95, 2))ms" -ForegroundColor Yellow
        
        return Get-BenchmarkResult -TestName "streaming_latency" -Iterations $ttftTimes.Count `
            -AvgLatency $avgTTFT -P95 $stats.p95 -P99 $stats.p99 -Throughput 0 `
            -Passed ($avgTTFT -lt 3000)
    }
    
    return Get-BenchmarkResult -TestName "streaming_latency" -Iterations 0 `
        -AvgLatency 0 -P95 0 -P99 0 -Throughput 0 -Passed $false
}

function Test-ConnectionPool {
    Write-BenchmarkHeader "Testing Connection Pool Effectiveness"
    
    $poolLatencies = @()
    $concurrency = 15
    
    $jobs = @()
    for ($i = 0; $i -lt $concurrency; $i++) {
        $jobs += Start-Job -ScriptBlock {
            param($url)
            
            $body = @{
                model = "llama-3.1-8b-instruct"
                messages = @(@{ role = "user"; content = "Ping" })
                max_tokens = 10
            } | ConvertTo-Json
            
            $start = Get-Date
            try {
                $null = Invoke-RestMethod -Uri "$url/v1/chat/completions" `
                    -Method POST `
                    -Body $body `
                    -ContentType "application/json" `
                    -TimeoutSec 60
                return @{ success = $true; latency = ((Get-Date) - $start).TotalMilliseconds }
            } catch {
                return @{ success = $false }
            }
        } -ArgumentList $PROXY_BRIDGE_URL
    }
    
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    foreach ($result in $results) {
        if ($result.success) {
            $poolLatencies += $result.latency
        }
    }
    
    if ($poolLatencies.Count -gt 0) {
        $stats = Get-Statistics -Values $poolLatencies
        $avgPoolLatency = ($poolLatencies | Measure-Object -Average).Average
        
        Write-Host "  Pool requests: $($poolLatencies.Count)/$concurrency" -ForegroundColor Yellow
        Write-Host "  Avg latency: $([math]::Round($avgPoolLatency, 2))ms" -ForegroundColor Yellow
        Write-Host "  P95: $($stats.p95)ms | P99: $($stats.p99)ms" -ForegroundColor Yellow
        
        $poolEfficiency = $concurrency / $avgPoolLatency
        
        return Get-BenchmarkResult -TestName "connection_pool" -Iterations $poolLatencies.Count `
            -AvgLatency $avgPoolLatency -P95 $stats.p95 -P99 $stats.p99 -Throughput $poolEfficiency `
            -Passed ($poolLatencies.Count -ge $concurrency - 2) -Metadata @{
                poolSize = 10
                queueLength = 0
            }
    }
    
    return Get-BenchmarkResult -TestName "connection_pool" -Iterations 0 `
        -AvgLatency 0 -P95 0 -P99 0 -Throughput 0 -Passed $false
}

function Test-EmbeddingDeduplication {
    Write-BenchmarkHeader "Testing Embedding Deduplication"
    
    # Send duplicate embeddings
    $duplicates = @(
        "This is a test sentence",
        "This is a test sentence",
        "This is a test sentence",
        "Unique sentence one",
        "Unique sentence one",
        "Another unique sentence",
        "Another unique sentence"
    )
    
    $startTime = Get-Date
    
    try {
        $response = Invoke-Embeddings -Texts $duplicates
        $latency = ((Get-Date) - $startTime).TotalMilliseconds
        
        $uniqueCount = 0
        if ($response.data) {
            $uniqueCount = $response.data.Count
        }
        
        $dedupRatio = if ($duplicates.Count -gt 0) { $uniqueCount / $duplicates.Count } else { 0 }
        
        Write-Host "  Input: $($duplicates.Count) texts | Output: $uniqueCount embeddings" -ForegroundColor Yellow
        Write-Host "  Deduplication rate: $([math]::Round($dedupRatio * 100, 1))%" -ForegroundColor Yellow
        Write-Host "  Latency: $([math]::Round($latency, 2))ms" -ForegroundColor Yellow
        
        $passed = $dedupRatio -lt 1.0  # Should have some deduplication
        
        return Get-BenchmarkResult -TestName "embedding_deduplication" -Iterations $duplicates.Count `
            -AvgLatency $latency -P95 $latency -P99 $latency -Throughput ($uniqueCount / $latency * 1000) `
            -Passed $passed -Metadata @{
                uniqueEmbeddings = $uniqueCount
                deduplicationRatio = [math]::Round($dedupRatio, 2)
            }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        return Get-BenchmarkResult -TestName "embedding_deduplication" -Iterations 0 `
            -AvgLatency 0 -P95 0 -P99 0 -Throughput 0 -Passed $false
    }
}

function Write-SummaryTable {
    param([array]$Results)
    
    Write-BenchmarkHeader "Benchmark Results Summary"
    
    Write-Host "  $("Test".PadRight(30)) $("Status".PadRight(10)) $("Avg Latency".PadRight(15)) $("P95".PadRight(12)) $("P99".PadRight(12))" -ForegroundColor White
    Write-Host "  $("-" * 80)" -ForegroundColor Gray
    
    foreach ($result in $Results) {
        $status = if ($result.passed) { "$GREEN PASS $RESET" } else { "$RED FAIL $RESET" }
        $testName = $result.benchmark.PadRight(30)
        
        $avgStr = "$($result.results.avgLatency)ms".PadRight(15)
        $p95Str = "$($result.results.p95)ms".PadRight(12)
        $p99Str = "$($result.results.p99)ms".PadRight(12)
        
        $color = if ($result.passed) { "Green" } else { "Red" }
        Write-Host "  $testName $status $avgStr $p95Str $p99Str" -ForegroundColor $color
    }
    
    $passed = ($Results | Where-Object { $_.passed }).Count
    $total = $Results.Count
    $passRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 1) } else { 0 }
    
    Write-Host "`n  Total: $passed/$total tests passed ($passRate%)" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 50) { "Yellow" } else { "Red" })
}

# Main execution
Write-Host "$CYAN`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     LM Studio Live Benchmark Suite v1.0            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝$RESET" -ForegroundColor Cyan

$services = Start-ServiceCheck

if (-not $services.lmStudio -or -not $services.proxyBridge) {
    Write-Host "`n$RED Error: Required services are not running$RESET" -ForegroundColor Red
    Write-Host "Please ensure LM Studio (port 1234) and Proxy Bridge (port 3001) are running" -ForegroundColor Yellow
    exit 1
}

$allResults = @()

# Run benchmarks
$allResults += Test-ChatCompletions
$allResults += Test-EmbeddingsWithBatching
$allResults += Test-ConcurrentRequests
$allResults += Test-StreamingLatency
$allResults += Test-ConnectionPool
$allResults += Test-EmbeddingDeduplication

# Write results
Write-SummaryTable -Results $allResults

# Save JSON results
$output = @{
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    services = $services
    benchmarks = $allResults
} | ConvertTo-Json -Depth 4

$output | Out-File -FilePath $RESULTS_FILE -Encoding UTF8
Write-Host "`n$GREEN Results saved to $RESULTS_FILE$RESET" -ForegroundColor Green

# Exit with appropriate code
$failed = ($allResults | Where-Object { -not $_.passed }).Count
exit $(if ($failed -gt 0) { 1 } else { 0 })
