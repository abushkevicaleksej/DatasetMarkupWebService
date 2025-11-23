import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, Image, Loader2, RefreshCw } from 'lucide-react';
import { useState  } from 'react';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image';
  size: string;
  active: boolean;
}

interface FileListProps {
  files: WorkspaceFile[];
  currentFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const fileIcons = {
  image: Image,
};

export function FileList({ files, currentFileId, onFileSelect, onRefresh, loading }: FileListProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleFileClick = (fileId: string) => {
    onFileSelect(fileId);
  };

  if (loading) {
    return (
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Файлы</CardTitle>
            <Badge variant="secondary">0</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка файлов...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Файлы</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{files.length}</Badge>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3">
        <ScrollArea className="h-full pr-3">
          {files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Нет файлов</p>
              <button 
                onClick={handleRefresh}
                className="text-primary hover:underline text-sm mt-2"
              >
                Обновить
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const Icon = fileIcons[file.type];
                const isActive = file.id === currentFileId;
                
                return (
                  <div
                    key={file.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isActive 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-card hover:bg-accent/50'
                    }`}
                    onClick={() => handleFileClick(file.id)}
                  >
                    <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{file.size}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}