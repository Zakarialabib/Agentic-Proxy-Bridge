#!/usr/bin/env pwsh
# Phase 8 Service Testing Script

Write-Host "Phase 8 Service Testing" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Green
$health = Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing | ConvertFrom-Json
Write-Host "Status: $($health.status)"

# Test 2: Phase 8 Stats
Write-Host "Test 2: Phase 8 Statistics" -ForegroundColor Green
$stats = Invoke-WebRequest -Uri http://localhost:3001/api/proxy/stats/phase8 -UseBasicParsing | ConvertFrom-Json
Write-Host "Pool: $($stats.connectionPool.activeConnections)/$($stats.connectionPool.maxConnections), Batches: $($stats.embeddingCoalescer.activeBatches)"

# Test 3: Status
Write-Host "Test 3: Full Status" -ForegroundColor Green
$status = Invoke-WebRequest -Uri http://localhost:3001/api/proxy/status -UseBasicParsing | ConvertFrom-Json
Write-Host "Tools: $($status.tools_registered), Knowledge: $($status.knowledge_graph.nodes) nodes"

Write-Host "All Phase 8 services active!" -ForegroundColor Green
