// src/components/features/kanva/types/index.ts
import { ReactNode } from 'react';

export type ComponentType = 'text' | 'image' | 'button' | 'container';

export interface DraggableComponent {
  id: string;
  type: ComponentType;
  label: string;
  icon: ReactNode;
}

export interface CanvasItem extends DraggableComponent {
  canvasId: string;
}
