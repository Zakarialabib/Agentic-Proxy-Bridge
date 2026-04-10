import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wrench, Shield, Zap, GitBranch, Terminal, ExternalLink, Activity, Network, Plus, Trash2, Power, PowerOff } from 'lucide-react'
import { useChatStore } from '@/stores/useChatStore'
import { useMCP } from '@/hooks/use-mcp'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export function AgenticToolbar() {
  const { 
    availableTools, 
    enabledTools, 
    toggleTool, 
    fetchTools, 
    orchestrationMode, 
    setParams,
    maxSteps,
    toolBudget,
    requireApproval
  } = useChatStore()

  const {
    servers,
    tools: mcpTools,
    addServer,
    removeServer,
    connectServer,
    disconnectServer,
    refresh: refreshMCP
  } = useMCP()

  useEffect(() => {
    fetchTools()
  }, [fetchTools, servers]) // Re-fetch when servers change

  const handleAddPreset = (type: 'filesystem' | 'search') => {
    if (type === 'filesystem') {
      addServer({
        id: 'local-files',
        name: 'Filesystem MCP',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
      })
    } else if (type === 'search') {
      addServer({
        id: 'brave-search',
        name: 'Brave Search MCP',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'],
        env: { BRAVE_API_KEY: '' } // Needs user key
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-purple-400" />
                MCP Servers
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400">
                Extend capabilities via external protocols.
              </CardDescription>
            </div>
            <div className="flex gap-1">
               <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => handleAddPreset('filesystem')}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {servers.length === 0 ? (
            <div className="text-[11px] text-slate-500 text-center py-2 italic border border-dashed border-slate-700 rounded-md">
              No MCP servers registered
            </div>
          ) : (
            servers.map((server: any) => (
              <div key={server.id} className="p-2 rounded-md bg-slate-900/40 border border-slate-700/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-200">{server.name}</span>
                    <Badge className={cn(
                      "text-[8px] h-3.5 px-1 uppercase",
                      server.status === 'connected' ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                    )}>
                      {server.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {server.status === 'connected' ? (
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-amber-400 hover:bg-amber-500/10" onClick={() => disconnectServer(server.id)}>
                        <PowerOff className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-emerald-400 hover:bg-emerald-500/10" onClick={() => connectServer(server.id)}>
                        <Power className="w-3 h-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-500 hover:text-rose-400" onClick={() => removeServer(server.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <Terminal className="w-2.5 h-2.5" />
                  <span className="truncate">{server.error || `${server.tools_count || 0} tools available`}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                Tool Management
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400">
                Enable/disable tools for the agentic loop.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 max-h-[250px] overflow-y-auto custom-scrollbar">
          <div className="grid gap-2">
            {availableTools.length === 0 ? (
              <div className="text-[11px] text-slate-500 text-center py-2 italic">
                No tools registered in proxy
              </div>
            ) : (
              availableTools.map((tool) => (
                <div key={tool.function.name} className="flex items-center justify-between p-2 rounded-md bg-slate-900/40 border border-slate-700/30 hover:bg-slate-900/60 transition-colors">
                   <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-200">{tool.function.name}</span>
                      <Badge variant="outline" className="text-[8px] h-3 px-1 border-slate-700 text-slate-500">
                        {tool.source || 'builtin'}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-slate-500 truncate max-w-[150px]">{tool.function.description}</span>
                  </div>
                  <Switch 
                    checked={enabledTools.includes(tool.function.name)} 
                    onCheckedChange={() => toggleTool(tool.function.name)}
                    className="scale-75 data-[state=checked]:bg-cyan-500"
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3 px-4">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Orchestration Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <Tabs 
            value={orchestrationMode} 
            onValueChange={(v) => setParams({ orchestrationMode: v as 'adaptive' | 'mcp_only' | 'a2a_only' | 'local_only' })}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 bg-slate-900/50 h-8 p-1 gap-1 border border-slate-700/50">
              <TabsTrigger value="adaptive" className="text-[10px] data-[state=active]:bg-cyan-500 data-[state=active]:text-white">Adaptive</TabsTrigger>
              <TabsTrigger value="local_only" className="text-[10px] data-[state=active]:bg-slate-700 data-[state=active]:text-slate-200">Local Only</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] text-slate-300">Max Iterations (Hops)</Label>
                <span className="text-[11px] font-mono text-cyan-400">{maxSteps}</span>
              </div>
              <Slider 
                value={[maxSteps]} 
                min={1} 
                max={10} 
                step={1} 
                onValueChange={([v]) => setParams({ maxSteps: v })}
                className="[&_.relative]:bg-slate-700 [&_.absolute]:bg-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] text-slate-300">Tool Call Budget</Label>
                <span className="text-[11px] font-mono text-amber-400">{toolBudget}</span>
              </div>
              <Slider 
                value={[toolBudget]} 
                min={1} 
                max={20} 
                step={1} 
                onValueChange={([v]) => setParams({ toolBudget: v })}
                className="[&_.relative]:bg-slate-700 [&_.absolute]:bg-amber-500"
              />
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <Label className="text-[11px] text-slate-300 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                Require Tool Approval
              </Label>
              <Switch 
                checked={requireApproval}
                onCheckedChange={(v) => setParams({ requireApproval: v })}
                className="scale-75 data-[state=checked]:bg-rose-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3 px-4">
          <CardTitle className="text-[11px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Live Observability
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="flex justify-between text-[11px] items-center text-slate-400">
            <span className="flex items-center gap-1.5"><Network className="w-3 h-3 text-cyan-400" /> MCP Status</span>
            <Badge variant="outline" className="h-5 text-[9px] text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Synced</Badge>
          </div>
          <div className="flex justify-between text-[11px] items-center text-slate-400">
            <span className="flex items-center gap-1.5"><Terminal className="w-3 h-3 text-purple-400" /> Runtime</span>
            <span className="font-mono text-[10px]">Python 3.11 / FastAPI</span>
          </div>
          <div className="flex justify-between text-[11px] items-center text-slate-400">
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-amber-400" /> Mode</span>
            <span className="text-[10px]">Supervised Autonomy</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="px-1">
        <Button variant="ghost" size="sm" className="w-full justify-start text-[10px] text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 gap-2">
          <ExternalLink className="w-3 h-3" />
          Open Full Telemetry Dashboard
        </Button>
      </div>
    </div>
  )
}
