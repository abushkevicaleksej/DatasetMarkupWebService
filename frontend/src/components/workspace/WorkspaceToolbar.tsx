import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  MousePointer2,
  Square,
  Circle,
  Type,
  Pencil,
  Eraser,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';

type Tool = 'select' | 'rectangle' | 'circle' | 'text' | 'draw' | 'erase' | 'move';

export function WorkspaceToolbar() {
  const [activeTool, setActiveTool] = useState<Tool>('select');

  const tools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Select' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as Tool, icon: Circle, label: 'Circle' },
    { id: 'text' as Tool, icon: Type, label: 'Text' },
    { id: 'draw' as Tool, icon: Pencil, label: 'Draw' },
    { id: 'erase' as Tool, icon: Eraser, label: 'Erase' },
    { id: 'move' as Tool, icon: Move, label: 'Move' },
  ];

  return (
    <div className="w-16 bg-card border rounded-lg p-2 flex flex-col gap-2">
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant={activeTool === tool.id ? 'default' : 'ghost'}
          size="icon"
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
        >
          <tool.icon className="w-5 h-5" />
        </Button>
      ))}
      
      <Separator className="my-2" />
      
      <Button variant="ghost" size="icon" title="Zoom In">
        <ZoomIn className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" title="Zoom Out">
        <ZoomOut className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" title="Reset">
        <RotateCcw className="w-5 h-5" />
      </Button>
    </div>
  );
}
