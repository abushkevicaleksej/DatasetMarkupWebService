import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, Image, FileVideo } from 'lucide-react';
import { useState } from 'react';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  size: string;
  active: boolean;
}

const fileIcons = {
  image: Image,
  video: FileVideo,
  document: FileText,
};

export function FileList() {
  const [files, setFiles] = useState<WorkspaceFile[]>([
    { id: '1', name: 'sample_image.jpg', type: 'image', size: '2.4 MB', active: true },
    { id: '2', name: 'document.pdf', type: 'document', size: '1.8 MB', active: false },
    { id: '3', name: 'video_clip.mp4', type: 'video', size: '15.3 MB', active: false },
    { id: '4', name: 'photo_002.png', type: 'image', size: '3.1 MB', active: false },
  ]);

  const selectFile = (id: string) => {
    setFiles(files.map(file => ({
      ...file,
      active: file.id === id,
    })));
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Файлы</CardTitle>
          <Badge variant="secondary">{files.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = fileIcons[file.type];
              
              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    file.active 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-card hover:bg-accent/50'
                  }`}
                  onClick={() => selectFile(file.id)}
                >
                  <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{file.name}</p>
                    <p className="text-muted-foreground truncate">{file.size}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
