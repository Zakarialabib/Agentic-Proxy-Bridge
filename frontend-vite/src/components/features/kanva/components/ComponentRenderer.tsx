// src/components/features/kanva/components/ComponentRenderer.tsx
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { ComponentType } from '../types';

export const renderComponentContent = (type: ComponentType, label: string) => {
  switch (type) {
    case 'text':
      return <div className="p-4 bg-muted/50 rounded border border-dashed border-muted-foreground/30 text-center text-sm text-muted-foreground">Text Block Placeholder</div>;
    case 'button':
      return <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium w-full">Button</button>;
    case 'image':
      return <div className="p-8 bg-muted/50 rounded border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground gap-2"><ImageIcon className="w-6 h-6" /><span className="text-xs">Image Placeholder</span></div>;
    case 'container':
      return <div className="min-h-[100px] p-4 bg-muted/10 rounded border border-dashed border-muted-foreground/50">Container Area</div>;
    default:
      return <div>{label}</div>;
  }
};
