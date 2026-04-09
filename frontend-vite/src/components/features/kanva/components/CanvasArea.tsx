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
        <div className="text-center text-muted-foreground flex flex-col items-center gap-2 justify-center h-full">
          <Layout className="w-12 h-12 opacity-20 mb-2" />
          <p className="text-lg font-medium text-slate-300">Drag and drop components to build your AI workflow</p>
          <p className="text-sm text-slate-500">Start by dragging an LLM Node or Agent Supervisor from the library</p>
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
