// src/components/features/kanva/constants/index.tsx
import React from 'react';
import { Type, Image as ImageIcon, MousePointerClick, Layout } from 'lucide-react';
import { DraggableComponent } from '../types';

export const COMPONENT_LIBRARY: DraggableComponent[] = [
  { id: 'lib-text', type: 'text', label: 'Text Block', icon: <Type className="w-4 h-4" /> },
  { id: 'lib-image', type: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'lib-button', type: 'button', label: 'Button', icon: <MousePointerClick className="w-4 h-4" /> },
  { id: 'lib-container', type: 'container', label: 'Container', icon: <Layout className="w-4 h-4" /> },
];
