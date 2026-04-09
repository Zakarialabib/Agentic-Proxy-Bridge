// src/components/features/kanva/components/ComponentRenderer.tsx
import React from 'react';
import { BrainCircuit, Database, Network, Zap, Wrench } from 'lucide-react';
import { ComponentType } from '../types';

export const renderComponentContent = (type: ComponentType, label: string) => {
  switch (type) {
    case 'llm-node':
      return (
        <div className="p-4 bg-slate-900/80 rounded-md border border-purple-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-slate-200">LLM Provider</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Configures model parameters and routing.</div>
          <div className="mt-3 p-2 bg-slate-950 rounded text-xs text-slate-500 flex justify-between">
            <span>Model: GPT-4o</span>
            <span className="text-emerald-400">Ready</span>
          </div>
        </div>
      );
    case 'rag-node':
      return (
        <div className="p-4 bg-slate-900/80 rounded-md border border-emerald-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-slate-200">Knowledge Base</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Connects to vector stores for document retrieval.</div>
          <div className="mt-3 p-2 bg-slate-950 rounded text-xs text-slate-500">
            <span>Index: internal-docs-v2</span>
          </div>
        </div>
      );
    case 'agent-node':
      return (
        <div className="p-4 bg-slate-900/80 rounded-md border border-cyan-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-slate-200">Agent Supervisor</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Orchestrates multiple sub-agents and tools.</div>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] rounded border border-cyan-500/20">Planning</span>
            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] rounded border border-cyan-500/20">Reflection</span>
          </div>
        </div>
      );
    case 'gateway-node':
      return (
        <div className="p-4 bg-slate-900/80 rounded-md border border-amber-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-slate-200">API Gateway</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Handles intent routing, embedding, and security.</div>
        </div>
      );
    case 'tool-node':
      return (
        <div className="p-4 bg-slate-900/80 rounded-md border border-blue-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-slate-200">Tool Executor</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Executes external API calls and scripts.</div>
          <div className="mt-2 text-xs text-slate-500 bg-slate-950 p-2 rounded">
            Connected: 3 tools
          </div>
        </div>
      );
    default:
      return <div className="p-4 bg-slate-800 text-white rounded">{label}</div>;
  }
};
