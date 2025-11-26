import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  MousePointer2,
  Square,
  Eraser,
  Move,
  ZoomIn,
  ZoomOut,
  Save,
  Eye,
} from 'lucide-react';

type Tool = 'select' | 'rectangle' | 'erase' | 'move';

interface WorkspaceToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onSaveClick: () => void;
  hasFiles: boolean;
  isTaskView?: boolean;
}

export function WorkspaceToolbar({ 
  activeTool, 
  setActiveTool, 
  onSaveClick, 
  hasFiles, 
  isTaskView = false 
}: WorkspaceToolbarProps) {
  const tools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Выделение' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Ограничивающая рамка' },
    { id: 'erase' as Tool, icon: Eraser, label: 'Стереть' },
    { id: 'move' as Tool, icon: Move, label: 'Навигация' },
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
      
      {isTaskView ? (
        <Button 
          variant="ghost" 
          size="icon" 
          title="Режим просмотра задачи"
          disabled
        >
          <Eye className="w-5 h-5" />
        </Button>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          title="Сохранить задачу"
          onClick={onSaveClick}
          disabled={!hasFiles}
        >
          <Save className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}