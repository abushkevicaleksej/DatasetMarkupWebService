import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, Image, FileVideo, Loader2, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image';
  size: string;
  active: boolean;
}

interface ApiFile {
  id: string;
  original_filename: string;
  file_size: number;
  file_path: string;
  mime_type: string;
}

const fileIcons = {
  image: Image,
};

const getFileType = (mimeType: string): 'image' => {
  if (mimeType.startsWith('image/')) return 'image';
  return 'image';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function FileList() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFiles = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:8000/api/routes/files');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiFiles: ApiFile[] = await response.json();
      
      const workspaceFiles: WorkspaceFile[] = apiFiles.map((apiFile, index) => ({
        id: apiFile.id,
        name: apiFile.original_filename,
        type: getFileType(apiFile.mime_type),
        size: formatFileSize(apiFile.file_size),
        active: index === 0
      }));
      
      setFiles(workspaceFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файлов');
      console.error('Fetch files error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshFiles = () => {
    setRefreshing(true);
    fetchFiles();
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const selectFile = (id: string) => {
    setFiles(files.map(file => ({
      ...file,
      active: file.id === id,
    })));
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

  if (error) {
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
            <p className="text-destructive mb-2">Ошибка загрузки</p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button 
              onClick={refreshFiles}
              className="text-primary hover:underline text-sm"
            >
              Попробовать снова
            </button>
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
              onClick={refreshFiles}
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
                onClick={refreshFiles}
                className="text-primary hover:underline text-sm mt-2"
              >
                Обновить
              </button>
            </div>
          ) : (
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