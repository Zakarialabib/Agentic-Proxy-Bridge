// src/components/features/kanva/context/KanvaContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { CanvasItem, DraggableComponent } from '../types';

interface KanvaContextType {
  canvasItems: CanvasItem[];
  setCanvasItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>;
  activeId: string | null;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  activeItem: DraggableComponent | CanvasItem | null;
  setActiveItem: React.Dispatch<React.SetStateAction<DraggableComponent | CanvasItem | null>>;
  removeItem: (id: string) => void;
  clearCanvas: () => void;
}

const KanvaContext = createContext<KanvaContextType | undefined>(undefined);

export const KanvaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<DraggableComponent | CanvasItem | null>(null);

  const removeItem = (id: string) => {
    setCanvasItems((items) => items.filter((item) => item.canvasId !== id));
  };

  const clearCanvas = () => setCanvasItems([]);

  return (
    <KanvaContext.Provider
      value={{
        canvasItems,
        setCanvasItems,
        activeId,
        setActiveId,
        activeItem,
        setActiveItem,
        removeItem,
        clearCanvas,
      }}
    >
      {children}
    </KanvaContext.Provider>
  );
};

export const useKanva = () => {
  const context = useContext(KanvaContext);
  if (context === undefined) {
    throw new Error('useKanva must be used within a KanvaProvider');
  }
  return context;
};
