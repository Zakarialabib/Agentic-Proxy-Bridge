// src/components/features/kanva/constants/index.tsx
import React from 'react';
import { BrainCircuit, Database, Network, Zap, Wrench } from 'lucide-react';
import { DraggableComponent } from '../types';

export const COMPONENT_LIBRARY: DraggableComponent[] = [
  { id: 'lib-llm', type: 'llm-node', label: 'LLM Node', icon: <BrainCircuit className="w-4 h-4 text-purple-400" /> },
  { id: 'lib-rag', type: 'rag-node', label: 'RAG Knowledge Base', icon: <Database className="w-4 h-4 text-emerald-400" /> },
  { id: 'lib-agent', type: 'agent-node', label: 'Agent Supervisor', icon: <Network className="w-4 h-4 text-cyan-400" /> },
  { id: 'lib-gateway', type: 'gateway-node', label: 'API Gateway', icon: <Zap className="w-4 h-4 text-amber-400" /> },
  { id: 'lib-tool', type: 'tool-node', label: 'Tool Executor', icon: <Wrench className="w-4 h-4 text-blue-400" /> },
];
