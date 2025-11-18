import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface Annotation {
  id: string;
  label: string;
  type: string;
  visible: boolean;
  color: string;
}

export function AnnotationList() {
  const [annotations, setAnnotations] = useState<Annotation[]>([
    { id: '1', label: 'Object 1', type: 'rectangle', visible: true, color: 'bg-blue-500' },
    { id: '2', label: 'Region A', type: 'circle', visible: true, color: 'bg-green-500' },
    { id: '3', label: 'Text Label', type: 'text', visible: false, color: 'bg-yellow-500' },
    { id: '4', label: 'Area B', type: 'rectangle', visible: true, color: 'bg-red-500' },
  ]);

  const toggleVisibility = (id: string) => {
    setAnnotations(annotations.map(ann => 
      ann.id === id ? { ...ann, visible: !ann.visible } : ann
    ));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
  };

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
                <div className={`w-3 h-3 rounded-full ${annotation.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{annotation.label}</p>
                  <p className="text-muted-foreground truncate">{annotation.type}</p>
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
