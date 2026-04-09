// src/components/features/kanva/components/CanvasArea.tsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKanva } from '../context/KanvaContext';
import { CanvasSortableItem } from './CanvasSortableItem';

export const CanvasArea = () => {
  const { canvasItems } = useKanva();
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
    data: {
      type: 'canvas',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-h-[500px] p-6 rounded-lg border-2 border-dashed transition-colors flex flex-col gap-4 overflow-y-auto",
        isOver ? "border-primary/50 bg-primary/5" : "border-muted bg-background",
        canvasItems.length === 0 && "items-center justify-center"
      )}
    >
      {canvasItems.length === 0 ? (
        <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
          <Layout className="w-10 h-10 opacity-20" />
          <p>Drag and drop components here to build your canvas</p>
        </div>
      ) : (
        <SortableContext 
          items={canvasItems.map(item => item.canvasId)}
          strategy={verticalListSortingStrategy}
        >
          {canvasItems.map((item) => (
            <CanvasSortableItem key={item.canvasId} item={item} />
          ))}
        </SortableContext>
      )}
    </div>
  );
};
