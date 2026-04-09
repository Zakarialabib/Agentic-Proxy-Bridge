// src/components/features/kanva/types/index.ts
import { ReactNode } from 'react';

export type ComponentType = 'llm-node' | 'rag-node' | 'agent-node' | 'gateway-node' | 'tool-node';

export interface DraggableComponent {
  id: string;
  type: ComponentType;
  label: string;
  icon: ReactNode;
}

export interface CanvasItem extends DraggableComponent {
  canvasId: string;
}
