

import { Server, Settings, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProxyStatus } from '@/lib/types'
import { PROXY_PORT } from '@/lib/types'

interface HeaderProps {
  status: ProxyStatus | null
  uptime: number
  onSettingsClick: () => void
  onRefresh: () => void
}

function StatusPill({ status, label, pulse = false }: { status: 'connected' | 'degraded' | 'disconnected', label: string, pulse?: boolean }) {
  const colors = {
    connected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    degraded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    disconnected: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  
  const dots = {
    connected: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    disconnected: 'bg-red-400'
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[status]} ${pulse && status === 'connected' ? 'animate-pulse' : ''}`} />
      {label}
    </div>
  )
}

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function Header({ status, uptime, onSettingsClick, onRefresh }: HeaderProps) {
  return (
    <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Server className="w-5 h-5 text-slate-900" />
              </div>
              {status?.status === 'running' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">LMStudio Proxy Bridge</h1>
              <p className="text-xs text-slate-400">MCP/A2A • Knowledge Graph • Orchestration</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            {status ? (
              <>
                <StatusPill 
                  status={status.lmstudio_connected ? 'connected' : 'disconnected'} 
                  label={status.lmstudio_connected ? 'LM Studio' : 'Disconnected'}
                  pulse 
                />
                <StatusPill 
                  status={status.status === 'running' ? 'connected' : 'disconnected'} 
                  label={`Proxy ${formatUptime(uptime)}`}
                  pulse 
                />
              </>
            ) : (
              <StatusPill status="disconnected" label="Connecting..." />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/5">
              :{PROXY_PORT}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={onRefresh}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-400 hover:text-white"
              onClick={onSettingsClick}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
