'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings as SettingsIcon, Activity, MessageSquare, Brain, Network, Wrench, Eye, BookOpen, Sparkles, Zap, Send, Loader2 } from 'lucide-react'

import { Dashboard, DashboardHeader, ConnectionMatrix, PerformanceCards, SystemStats, VRAMDisplay, StatusPill } from '@/components/dashboard'
import { useInference, useEmbeddingPresets, useStreamingChat } from '@/hooks/use-inference'
import * as api from '@/lib/api'
import type { ProxyStatus, Tool, ModelInfo, KnowledgeNode, MCPServer, A2AAgent, AsyncTask } from '@/lib/types'

const PROXY_PORT = 3001

export default function ProxyBridgeDashboard() {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([])
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [a2aAgents, setA2aAgents] = useState<A2AAgent[]>([])
  const [asyncTasks, setAsyncTasks] = useState<AsyncTask[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uptime, setUptime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  
  const { currentModel, setCurrentModel, metrics, cacheStats, sendMessage, loadModels, loadModel, unloadModel } = useInference({
    defaultModel: 'qwen3.5-4b'
  })
  
  const { isStreaming, streamedContent, startStream } = useStreamingChat(currentModel)
  const { presets, mrlPresets, rerankerConfigs } = useEmbeddingPresets()

  const fetchStatus = useCallback(async () => {
    const data = await api.fetchStatus()
    setStatus(data)
  }, [])

  const fetchTools = useCallback(async () => {
    const data = await api.fetchTools()
    if (data) setTools(data)
  }, [])

  const fetchKnowledge = useCallback(async () => {
    const data = await api.fetchKnowledgeNodes()
    if (data) setKnowledgeNodes(data)
  }, [])

  const fetchMCPServers = useCallback(async () => {
    const data = await api.fetchMCPServers()
    if (data) setMcpServers(data)
  }, [])

  const fetchA2AAgents = useCallback(async () => {
    const data = await api.fetchA2AAgents()
    if (data) setA2aAgents(data)
  }, [])

  const fetchAsyncTasks = useCallback(async () => {
    const data = await api.fetchAsyncTasks()
    if (data) setAsyncTasks(data)
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchTools()
    fetchKnowledge()
    fetchMCPServers()
    fetchA2AAgents()
    fetchAsyncTasks()
    loadModels()
    
    const interval = setInterval(() => {
      fetchStatus()
      fetchAsyncTasks()
      setUptime(prev => prev + 1)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [fetchStatus, fetchTools, fetchKnowledge, fetchMCPServers, fetchA2AAgents, fetchAsyncTasks, loadModels])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    
    setIsLoading(true)
    const userMessage = inputMessage
    setInputMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      const response = await sendMessage(userMessage, messages)
      const assistantContent = response.choices?.[0]?.message?.content || 'No response'
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }])
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { value: 'dashboard', icon: Activity, label: 'Dashboard' },
    { value: 'chat', icon: MessageSquare, label: 'Chat' },
    { value: 'knowledge', icon: Brain, label: 'Knowledge' },
    { value: 'gateway', icon: Zap, label: 'Gateway' },
    { value: 'protocols', icon: Network, label: 'Protocols' },
    { value: 'tools', icon: Wrench, label: 'Tools' },
    { value: 'observability', icon: Eye, label: 'Observability' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      <DashboardHeader status={status} uptime={uptime} proxyPort={PROXY_PORT} />
      
      <nav className="border-b border-slate-700/50 bg-slate-800/30">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-12 p-0 gap-1">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-cyan-500/20 data-[state=active]:to-emerald-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 px-4 h-12 rounded-none text-slate-400 hover:text-slate-200 transition-all"
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-72 shrink-0 space-y-4">
            <ConnectionMatrix status={status} />
            <PerformanceCards metrics={metrics} cacheStats={cacheStats} />
            <SystemStats status={status} />
            <VRAMDisplay used={8.5} />
          </aside>

          <div className="flex-1">
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <Card className="bg-slate-800/30 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Orchestrate
                    </Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Brain className="w-4 h-4 mr-2" />
                      Query Knowledge
                    </Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Zap className="w-4 h-4 mr-2" />
                      Gateway Search
                    </Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Index Document
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/30 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Active Models</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {models.length === 0 ? (
                      <p className="text-slate-400 text-sm">No models loaded. Connect LM Studio to load models.</p>
                    ) : (
                      <div className="space-y-2">
                        {models.filter(m => m.loaded).map(model => (
                          <div key={model.modelKey} className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                            <span className="text-sm text-white">{model.displayName}</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400">Loaded</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'chat' && (
              <Card className="bg-slate-800/30 border-slate-700/50 h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                    Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 mb-4 pr-4">
                    <div className="space-y-4">
                      {messages.map((msg, i) => (
                        <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-500/10 ml-8' : 'bg-slate-900/50 mr-8'}`}>
                          <p className="text-sm text-slate-200">{msg.content}</p>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Type your message..."
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading} className="bg-cyan-500 hover:bg-cyan-600">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'knowledge' && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Knowledge Graph
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">{knowledgeNodes.length} nodes indexed</p>
                  <div className="grid grid-cols-2 gap-2">
                    {knowledgeNodes.slice(0, 6).map(node => (
                      <div key={node.id} className="p-2 rounded bg-slate-900/50">
                        <p className="text-xs text-white truncate">{node.name}</p>
                        <p className="text-[10px] text-slate-500">{node.type}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'protocols' && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-800/30 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Network className="w-5 h-5 text-blue-400" />
                      MCP Servers ({mcpServers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mcpServers.map(server => (
                      <div key={server.name} className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-300">{server.name}</span>
                        <Badge variant="outline">{server.tools_count} tools</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/30 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      A2A Agents ({a2aAgents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {a2aAgents.map(agent => (
                      <div key={agent.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-300">{agent.name}</span>
                        <Badge variant="outline">{agent.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'tools' && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-amber-400" />
                    Available Tools ({tools.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {tools.map(tool => (
                      <div key={tool.name} className="p-2 rounded bg-slate-900/50">
                        <p className="text-sm text-white">{tool.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{tool.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'gateway' && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Gateway Search
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Search query..."
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                  <div className="flex gap-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400">code_search</Badge>
                    <Badge variant="outline">doc_search</Badge>
                    <Badge variant="outline">bug_search</Badge>
                  </div>
                  <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                    Search
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'observability' && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-400" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded bg-slate-900/50">
                      <p className="text-2xl font-bold text-white">{status?.active_sessions || 0}</p>
                      <p className="text-xs text-slate-400">Sessions</p>
                    </div>
                    <div className="text-center p-4 rounded bg-slate-900/50">
                      <p className="text-2xl font-bold text-white">{asyncTasks.filter(t => t.status === 'pending').length}</p>
                      <p className="text-xs text-slate-400">Pending Tasks</p>
                    </div>
                    <div className="text-center p-4 rounded bg-slate-900/50">
                      <p className="text-2xl font-bold text-white">{metrics?.success_rate?.toFixed(0) || 100}%</p>
                      <p className="text-xs text-slate-400">Success Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
