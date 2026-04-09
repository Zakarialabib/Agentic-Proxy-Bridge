// src/components/features/kanva/hooks/useKanvaDragDrop.ts
import { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useKanva } from '../context/KanvaContext';
import { COMPONENT_LIBRARY } from '../constants';
import { CanvasItem, DraggableComponent } from '../types';

export const useKanvaDragDrop = () => {
  const { canvasItems, setCanvasItems, setActiveId, setActiveItem } = useKanva();

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const libraryItem = COMPONENT_LIBRARY.find(item => item.id === active.id);
    if (libraryItem) {
      setActiveItem(libraryItem);
      return;
    }
    
    const canvasItem = canvasItems.find(item => item.canvasId === active.id);
    if (canvasItem) {
      setActiveItem(canvasItem);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const isActiveLibraryItem = active.data.current?.type === 'library-item';
    if (!isActiveLibraryItem) return;

    const tempId = `${active.id}-temp`;
    const isOverCanvas = over && (over.id === 'canvas-droppable' || canvasItems.some(item => item.canvasId === over.id));

    setCanvasItems((items) => {
      const existingIndex = items.findIndex(item => item.canvasId === tempId);
      
      if (isOverCanvas) {
        const libraryItem = active.data.current?.item as DraggableComponent;
        const tempItem: CanvasItem = { ...libraryItem, canvasId: tempId };
        
        const overIndex = items.findIndex(item => item.canvasId === over.id);
        
        if (existingIndex >= 0) {
          const newIndex = overIndex >= 0 ? overIndex : items.length - 1;
          if (existingIndex !== newIndex) {
            return arrayMove(items, existingIndex, newIndex);
          }
          return items;
        } else {
          const newItems = [...items];
          const insertIndex = overIndex >= 0 ? overIndex : items.length;
          newItems.splice(insertIndex, 0, tempItem);
          return newItems;
        }
      } else {
        if (existingIndex >= 0) {
          const newItems = [...items];
          newItems.splice(existingIndex, 1);
          return newItems;
        }
        return items;
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveItem(null);

    const isActiveLibraryItem = active.data.current?.type === 'library-item';
    const tempId = `${active.id}-temp`;

    if (isActiveLibraryItem) {
      setCanvasItems((items) => {
        const existingIndex = items.findIndex(item => item.canvasId === tempId);
        if (existingIndex >= 0) {
          const isOverCanvas = over && (over.id === 'canvas-droppable' || items.some(item => item.canvasId === over.id));
          if (isOverCanvas) {
            const newItems = [...items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              canvasId: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            return newItems;
          } else {
            const newItems = [...items];
            newItems.splice(existingIndex, 1);
            return newItems;
          }
        }
        return items;
      });
      return;
    }

    if (active.id !== over?.id && over && canvasItems.some(item => item.canvasId === active.id)) {
      setCanvasItems((items) => {
        const oldIndex = items.findIndex((item) => item.canvasId === active.id);
        const newIndex = items.findIndex((item) => item.canvasId === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveItem(null);
    setCanvasItems((items) => items.filter(item => !item.canvasId.endsWith('-temp')));
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  };
};
