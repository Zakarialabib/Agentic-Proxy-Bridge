# Hardware-Aware Configuration UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dynamic hardware profile component that intelligently updates VRAM capacity and visualizes system stats.
**Architecture:** Add a new `HardwareProfile.tsx` component to the dashboard that fetches from `/api/hardware/profile`. Feed the real total VRAM into the existing `VRAMDisplay`. Provide UI hints if the model is too large for the detected hardware.
**Tech Stack:** React, TailwindCSS, `lucide-react`, FastAPI hardware endpoints.

---

### Task 1: Create the Hardware Profile Component

**Files:**
- Create: `/workspace/frontend-vite/src/components/dashboard/HardwareProfileCard.tsx`
- Modify: `/workspace/frontend-vite/src/components/dashboard/index.ts`

- [ ] **Step 1: Write HardwareProfileCard**

```tsx
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cpu, Monitor, HardDrive } from 'lucide-react'
import * as api from '@/lib/api'
import type { HardwareProfile } from '@/lib/types'

interface HardwareProfileCardProps {
  onVramUpdate: (vram: number) => void
}

export function HardwareProfileCard({ onVramUpdate }: HardwareProfileCardProps) {
  const [profile, setProfile] = useState<HardwareProfile | null>(null)

  useEffect(() => {
    api.fetchHardwareProfile().then(p => {
      if (p) {
        setProfile(p)
        if (p.gpu_vram_gb) {
          onVramUpdate(p.gpu_vram_gb)
        } else if (p.apple_silicon) {
          // Estimate unified memory
          onVramUpdate(p.system_ram_gb * 0.75)
        }
      }
    })
  }, [onVramUpdate])

  if (!profile) return null

  return (
    <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          Detected Hardware
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Cpu className="w-3 h-3" />
            CPU Cores
          </div>
          <span className="text-sm font-semibold text-white">{profile.cpu_cores} ({profile.platform})</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HardDrive className="w-3 h-3" />
            System RAM
          </div>
          <span className="text-sm font-semibold text-white">{profile.system_ram_gb} GB</span>
        </div>

        {profile.gpu_name && (
          <div className="flex flex-col gap-1 mt-2 p-2 bg-slate-900/50 rounded-md border border-slate-700">
             <span className="text-[10px] text-slate-400 uppercase tracking-wider">GPU / Accelerator</span>
             <span className="text-xs font-semibold text-cyan-400 truncate">{profile.gpu_name}</span>
             {profile.gpu_vram_gb && (
               <span className="text-xs text-slate-300">{profile.gpu_vram_gb} GB VRAM</span>
             )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Export it**
```typescript
// in frontend-vite/src/components/dashboard/index.ts
export * from './Dashboard'
export * from './DashboardHeader'
export * from './ConnectionMatrix'
export * from './PerformanceCards'
export * from './SystemStats'
export * from './VRAMDisplay'
export * from './HardwareProfileCard'
```

### Task 2: Integrate Real Hardware Data into Dashboard

**Files:**
- Modify: `/workspace/frontend-vite/src/components/dashboard/Dashboard.tsx`
- Modify: `/workspace/proxy-bridge-python/app/routers/hardware.py` (if necessary to align types)

- [ ] **Step 1: Update Dashboard.tsx**

```tsx
import { useState, useEffect } from 'react'
import * as api from '@/lib/api'
import { MetricsDisplay } from '@/components/inference/MetricsDisplay'
import type { ProxyStatus, PerformanceMetrics, CacheStats } from '@/lib/types'

import { ConnectionMatrix } from './ConnectionMatrix'
import { SystemStats } from './SystemStats'
import { VRAMDisplay } from './VRAMDisplay'
import { HardwareProfileCard } from './HardwareProfileCard'

export function Dashboard() {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [totalVram, setTotalVram] = useState<number>(12) // Default fallback
  const [uptime, setUptime] = useState(0)
  
  useEffect(() => {
    const loadData = async () => {
      const [statusData, metricsData, cacheData] = await Promise.all([
        api.fetchStatus(),
        api.fetchPerformanceMetrics(),
        api.fetchCacheStats(),
      ])
      setStatus(statusData)
      setMetrics(metricsData)
      setCacheStats(cacheData)
    }
    
    loadData()
    
    const interval = setInterval(() => {
      loadData()
      setUptime(prev => prev + 1)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Calculate mock used VRAM based on active sessions or models (placeholder logic)
  const usedVram = status?.active_sessions ? Math.min(status.active_sessions * 2.5 + 4, totalVram) : 4.5;
  
  return (
    <div className="space-y-4">
      <ConnectionMatrix status={status} />
      <MetricsDisplay status={status} performanceMetrics={metrics} cacheStats={cacheStats} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SystemStats status={status} />
        <HardwareProfileCard onVramUpdate={setTotalVram} />
      </div>
      <VRAMDisplay used={usedVram} total={totalVram} />
    </div>
  )
}
```

- [ ] **Step 2: Fix `HardwareProfile` type in `types.ts`**
Update `src/lib/types.ts` to match the Python backend's output exactly.

```typescript
// Replace the old HardwareProfile interface with this:
export interface HardwareProfile {
  platform: string
  cpu_cores: int
  system_ram_gb: number
  gpu_name: string | null
  gpu_vram_gb: number | null
  apple_silicon: boolean
}
```
