import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Trash2, Edit3, Save, X } from 'lucide-react';
import { useState } from 'react';
import { useAnnotations } from '../hooks/useAnnotations';
import { BoundingBox } from '../types/annotations';

interface AnnotationListProps {
  taskId?: string | null;
  currentFileId?: string | null;
}

export function AnnotationList({ taskId, currentFileId }: AnnotationListProps) {
  const { 
    annotations, 
    selectBoundingBox, 
    updateBoundingBox, 
    deleteBoundingBox,
    selectedBoundingBox
  } = useAnnotations();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const currentAnnotation = annotations.find(ann => ann.file_id === currentFileId);
  const boxes = currentAnnotation?.bounding_boxes || [];

  const startEditing = (bbox: BoundingBox) => {
    setEditingId(bbox.id);
    setEditLabel(bbox.label);
  };

  const saveEdit = async (id: string) => {
    await updateBoundingBox(id, { label: editLabel });
    setEditingId(null);
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Аннотации</CardTitle>
          <Badge variant="secondary">{boxes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-2">
            {boxes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Нет аннотаций</p>
            )}
            {boxes.map((bbox) => (
              <div
                key={bbox.id}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                  bbox.isSelected || selectedBoundingBox?.id === bbox.id
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-card hover:bg-accent/50'
                }`}
                onClick={() => selectBoundingBox(bbox)}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bbox.color }}
                />
                
                <div className="flex-1 min-w-0">
                  {editingId === bbox.id ? (
                    <input
                      className="w-full text-sm border rounded px-1"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if(e.key === 'Enter') saveEdit(bbox.id);
                      }}
                      autoFocus
                    />
                  ) : (
                    <p className="truncate text-sm font-medium">{bbox.label}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    conf: {bbox.confidence?.toFixed(2) || '1.0'}
                  </p>
                </div>

                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {editingId === bbox.id ? (
                    <>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(bbox.id)}>
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditing(bbox)}>
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteBoundingBox(bbox.id)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}