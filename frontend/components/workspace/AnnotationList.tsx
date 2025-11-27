import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Trash2, Eye, EyeOff, Edit3, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAnnotations } from '../hooks/useAnnotations';
import { BoundingBox } from '../types/annotations';

interface AnnotationListProps {
  taskId?: string | null;
  currentFileId?: string | null;
}

export function AnnotationList({ taskId, currentFileId }: AnnotationListProps) {
  const { annotations, selectedBoundingBox, updateBoundingBox, deleteBoundingBox, selectBoundingBox } = useAnnotations();
  const [editingBbox, setEditingBbox] = useState<BoundingBox | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const getCurrentFileAnnotations = () => {
    if (!currentFileId) return [];
    return annotations.filter(ann => ann.file_id === currentFileId);
  };

  const currentAnnotations = getCurrentFileAnnotations();
  const currentBoundingBoxes = currentAnnotations.flatMap(ann => ann.bounding_boxes);

  useEffect(() => {
    console.log('Annotations updated:', currentBoundingBoxes.length);
  }, [currentBoundingBoxes]);

  useEffect(() => {
    console.log('Current file changed:', currentFileId);
  }, [currentFileId]);

  const startEditing = (bbox: BoundingBox) => {
    setEditingBbox(bbox);
    setEditLabel(bbox.label);
  };

  const saveEdit = () => {
    if (editingBbox) {
      updateBoundingBox(editingBbox.id, { label: editLabel });
      setEditingBbox(null);
      setEditLabel('');
    }
  };

  const cancelEdit = () => {
    setEditingBbox(null);
    setEditLabel('');
  };

  const toggleVisibility = (bboxId: string) => {
    const bbox = currentBoundingBoxes.find(b => b.id === bboxId);
    if (bbox) {
      if (bbox.isSelected) {
        selectBoundingBox(null);
      } else {
        selectBoundingBox(bbox);
      }
    }
  };

  const handleBboxClick = (bbox: BoundingBox) => {
    selectBoundingBox(bbox);
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Аннотации</CardTitle>
          <Badge variant="secondary">{currentBoundingBoxes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-2">
            {currentBoundingBoxes.map((bbox) => (
              <div
                key={bbox.id}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                  bbox.isSelected 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card hover:bg-accent/50'
                }`}
                onClick={() => handleBboxClick(bbox)}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bbox.color }}
                />
                <div className="flex-1 min-w-0">
                  {editingBbox?.id === bbox.id ? (
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full text-sm border rounded px-1 py-0.5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <p className="truncate text-sm font-medium">{bbox.label}</p>
                      <p className="text-muted-foreground text-xs truncate">
                        {Math.round(bbox.width * 100)}% × {Math.round(bbox.height * 100)}%
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {editingBbox?.id === bbox.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={saveEdit}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={cancelEdit}
                      >
                        <span className="text-xs">×</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEditing(bbox)}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleVisibility(bbox.id)}
                      >
                        {bbox.isSelected ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteBoundingBox(bbox.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
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