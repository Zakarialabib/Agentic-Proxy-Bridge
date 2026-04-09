import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Type, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  Layout, 
  MousePointerClick,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
type ComponentType = 'text' | 'image' | 'button' | 'container';

interface DraggableComponent {
  id: string;
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
}

interface CanvasItem extends DraggableComponent {
  canvasId: string;
}

// Available components in the library
const COMPONENT_LIBRARY: DraggableComponent[] = [
  { id: 'lib-text', type: 'text', label: 'Text Block', icon: <Type className="w-4 h-4" /> },
  { id: 'lib-image', type: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'lib-button', type: 'button', label: 'Button', icon: <MousePointerClick className="w-4 h-4" /> },
  { id: 'lib-container', type: 'container', label: 'Container', icon: <Layout className="w-4 h-4" /> },
];

// Helper to render component content based on type
const renderComponentContent = (type: ComponentType, label: string) => {
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

// Draggable item in the sidebar library
const LibraryItem = ({ item }: { item: DraggableComponent }) => {
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

// Sortable item in the canvas
const CanvasSortableItem = ({ item }: { item: CanvasItem }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.canvasId });

  const style = {
    transform: CSS.Transform.toString(transform),
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
        className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="p-4">
        {renderComponentContent(item.type, item.label)}
      </div>
    </div>
  );
};

// The droppable canvas area
const CanvasArea = ({ items }: { items: CanvasItem[] }) => {
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
        items.length === 0 && "items-center justify-center"
      )}
    >
      {items.length === 0 ? (
        <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
          <Layout className="w-10 h-10 opacity-20" />
          <p>Drag and drop components here to build your canvas</p>
        </div>
      ) : (
        <SortableContext 
          items={items.map(item => item.canvasId)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <CanvasSortableItem key={item.canvasId} item={item} />
          ))}
        </SortableContext>
      )}
    </div>
  );
};

export const KanvaPanel = () => {
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<DraggableComponent | CanvasItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the item being dragged (either from library or canvas)
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    // Handle dragging from library to canvas
    if (
      active.data.current?.type === 'library-item' && 
      (over.id === 'canvas-droppable' || over.data.current?.sortable)
    ) {
      const libraryItem = active.data.current.item as DraggableComponent;
      const newItem: CanvasItem = {
        ...libraryItem,
        canvasId: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      if (over.id === 'canvas-droppable') {
        // Dropped on empty canvas or bottom of canvas
        setCanvasItems((items) => [...items, newItem]);
      } else {
        // Dropped over an existing sortable item
        setCanvasItems((items) => {
          const overIndex = items.findIndex((item) => item.canvasId === over.id);
          const newIndex = overIndex >= 0 ? overIndex : items.length;
          
          const newItems = [...items];
          newItems.splice(newIndex, 0, newItem);
          return newItems;
        });
      }
      return;
    }

    // Handle reordering within canvas
    if (active.id !== over.id && canvasItems.some(item => item.canvasId === active.id)) {
      setCanvasItems((items) => {
        const oldIndex = items.findIndex((item) => item.canvasId === active.id);
        const newIndex = items.findIndex((item) => item.canvasId === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="h-full w-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanva</h1>
          <p className="text-muted-foreground">Drag and drop components to build your interface.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setCanvasItems([])}
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
        onDragEnd={handleDragEnd}
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
            <CanvasArea items={canvasItems} />
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
