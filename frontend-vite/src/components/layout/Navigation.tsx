

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, BookOpen, Zap, Sparkles, Brain, Network, Wrench, Eye, MessageSquare, Layout } from 'lucide-react'

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { value: 'dashboard', icon: Activity, label: 'Dashboard' },
  { value: 'kanva', icon: Layout, label: 'Kanva Workflow' },
  { value: 'worklog', icon: BookOpen, label: 'Worklog' },
  { value: 'gateway', icon: Zap, label: 'Gateway' },
  { value: 'orchestrate', icon: Sparkles, label: 'Orchestrate' },
  { value: 'knowledge', icon: Brain, label: 'Knowledge' },
  { value: 'protocols', icon: Network, label: 'Protocols' },
  { value: 'tools', icon: Wrench, label: 'Tools' },
  { value: 'observability', icon: Eye, label: 'Observability' },
  { value: 'chat', icon: MessageSquare, label: 'Chat' },
]

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="border-b border-slate-700/50 bg-slate-800/30">
      <div className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="bg-transparent h-12 p-0 gap-1">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-cyan-500/20 data-[state=active]:to-emerald-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/10 px-4 h-12 rounded-none text-slate-400 hover:text-slate-200 transition-all duration-200"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </nav>
  )
}
