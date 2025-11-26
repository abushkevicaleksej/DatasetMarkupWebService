import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Annotation {
  id: string;
  label: string;
  type: string;
  visible: boolean;
  color: string;
}

interface AnnotationListProps {
  taskId?: string | null;
}

export function AnnotationList({ taskId }: AnnotationListProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskAnnotations(taskId);
    } else {
      setAnnotations([]);
    }
  }, [taskId]);

  const fetchTaskAnnotations = async (taskId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/routes/api/tasks/${taskId}/annotations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const taskAnnotations = await response.json();
      setAnnotations(taskAnnotations);
    } catch (err) {
      console.error('Error fetching task annotations:', err);
      setAnnotations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (id: string) => {
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, visible: !ann.visible } : ann
    ));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
  };

  if (loading) {
    return (
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Аннотации</CardTitle>
            <Badge variant="secondary">0</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Аннотации</CardTitle>
          <Badge variant="secondary">{annotations.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-2">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div 
                  className={`w-3 h-3 rounded-full`}
                  style={{ backgroundColor: annotation.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{annotation.label}</p>
                  <p className="text-muted-foreground text-xs truncate">{annotation.type}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleVisibility(annotation.id)}
                  >
                    {annotation.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteAnnotation(annotation.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}