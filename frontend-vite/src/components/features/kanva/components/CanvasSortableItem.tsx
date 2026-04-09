// src/components/features/kanva/components/CanvasSortableItem.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CanvasItem } from '../types';
import { useKanva } from '../context/KanvaContext';
import { renderComponentContent } from './ComponentRenderer';

export const CanvasSortableItem = ({ item }: { item: CanvasItem }) => {
  const { removeItem } = useKanva();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.canvasId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden",
        isDragging && "opacity-50 z-50 shadow-md ring-2 ring-primary"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 right-10 p-1.5 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <button
        onClick={() => removeItem(item.canvasId)}
        className="absolute top-2 right-2 p-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground backdrop-blur-sm rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <div className="p-4 relative">
        {renderComponentContent(item.type, item.label)}
      </div>
    </div>
  );
};
