// src/components/features/KanvaPanel.tsx
import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Layout, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { KanvaProvider, useKanva } from './kanva/context/KanvaContext';
import { useKanvaDragDrop } from './kanva/hooks/useKanvaDragDrop';
import { COMPONENT_LIBRARY } from './kanva/constants';
import { LibraryItem } from './kanva/components/LibraryItem';
import { CanvasArea } from './kanva/components/CanvasArea';
import { renderComponentContent } from './kanva/components/ComponentRenderer';

const KanvaWorkspace = () => {
  const { canvasItems, clearCanvas, activeItem } = useKanva();
  const { handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useKanvaDragDrop();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="h-full w-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanva Workflow Builder</h1>
          <p className="text-muted-foreground">Drag and drop agentic components to design your AI pipeline.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={clearCanvas}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted/50 transition-colors"
            disabled={canvasItems.length === 0}
          >
            Clear Canvas
          </button>
          <button 
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Save Layout
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
          {/* Component Library Sidebar */}
          <Card className="w-64 shrink-0 flex flex-col overflow-hidden">
            <CardHeader className="py-4 border-b bg-muted/20">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Components
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3">
                {COMPONENT_LIBRARY.map((item) => (
                  <LibraryItem key={item.id} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-muted/10 rounded-xl border p-2 overflow-hidden shadow-inner">
            <CanvasArea />
          </div>
        </div>

        {/* Drag Overlay for smooth dragging visual */}
        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItem ? (
            'canvasId' in activeItem ? (
              // Dragging from canvas
              <div className="rounded-md border-2 border-primary bg-card text-card-foreground shadow-xl opacity-90 scale-105 transition-transform">
                <div className="p-4">
                  {renderComponentContent(activeItem.type, activeItem.label)}
                </div>
              </div>
            ) : (
              // Dragging from library
              <div className="flex items-center gap-3 p-3 rounded-md border-2 border-primary bg-card text-card-foreground shadow-xl opacity-90 scale-105 transition-transform">
                <div className="text-primary">{activeItem.icon}</div>
                <span className="text-sm font-medium">{activeItem.label}</span>
                <GripVertical className="w-4 h-4 ml-auto text-primary" />
              </div>
            )
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export const KanvaPanel = () => {
  return (
    <KanvaProvider>
      <KanvaWorkspace />
    </KanvaProvider>
  );
};
