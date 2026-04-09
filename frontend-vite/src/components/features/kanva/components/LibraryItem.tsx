// src/components/features/kanva/components/LibraryItem.tsx
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableComponent } from '../types';

export const LibraryItem = ({ item }: { item: DraggableComponent }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'library-item',
      item,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-3 p-3 rounded-md border bg-card text-card-foreground shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <div className="text-muted-foreground">{item.icon}</div>
      <span className="text-sm font-medium">{item.label}</span>
      <GripVertical className="w-4 h-4 ml-auto text-muted-foreground/50" />
    </div>
  );
};
