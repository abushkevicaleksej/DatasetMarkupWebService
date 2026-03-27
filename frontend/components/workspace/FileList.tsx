import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { FileText, Image, Loader2, RefreshCw, Eye, Trash2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image';
  size: string;
  active: boolean;
  original_filename?: string;
  mime_type?: string;
}

interface FileListProps {
  files: WorkspaceFile[];
  currentFileId: string | null;
  onFileSelect: (fileId: string | null) => void;
  onRefresh: () => void;
  loading: boolean;
  isTaskView?: boolean;
  allowDelete?: boolean;
  onFileDelete?: (fileId: string) => Promise<void>;
}

const fileIcons = {
  image: Image,
};

export function FileList({ 
  files, 
  currentFileId, 
  onFileSelect, 
  onRefresh, 
  loading, 
  isTaskView = false,
  allowDelete = true,
  onFileDelete 
}: FileListProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleFileClick = (fileId: string) => {
    onFileSelect(fileId);
  };

const handleDeleteFile = async (fileId: string, fileName: string) => {
  try {
    setDeletingFiles(prev => new Set(prev).add(fileId));
    
    if (onFileDelete) {
      await onFileDelete(fileId);
    } else {
      const response = await fetch(`http://localhost:8000/api/routes/files/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при удалении файла');
      }
      toast.success(`Файл "${fileName}" успешно удален`);
      await onRefresh();
    }
  } catch (error) {
    console.error('Delete file error:', error);
    toast.error(error instanceof Error ? error.message : 'Ошибка при удалении файла');
  } finally {
    setDeletingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }
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
          <CardTitle>
            {isTaskView ? 'Файлы задачи' : 'Доступные файлы'}
          </CardTitle>
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
        {isTaskView && (
          <p className="text-xs text-muted-foreground">
            Файлы, привязанные к этой задаче
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-3">
        <ScrollArea className="h-full pr-3">
          {files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {isTaskView ? 'В задаче нет файлов' : 'Нет доступных файлов'}
              </p>
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
                const isDeleting = deletingFiles.has(file.id);
                
                return (
                  <div
                    key={file.id}
                    className={`group flex flex-col p-2 rounded-lg border cursor-pointer transition-colors ${
                      isActive 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-card hover:bg-accent/50'
                    } ${isDeleting ? 'opacity-50' : ''}`}
                    onClick={() => !isDeleting && handleFileClick(file.id)}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-muted-foreground text-xs">{file.size}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-2">
                          {isTaskView && isActive && (
                            <div 
                              className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded"
                              title="Активный файл в режиме задачи"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Активен</span>
                            </div>
                          )}
                          
                          {allowDelete && !isDeleting && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  title="Удалить файл"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Удалить
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удаление файла</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Вы уверены, что хотите удалить файл "{file.name}"?
                                    <br />
                                    <span className="text-red-500 font-medium">
                                      Это действие нельзя отменить.
                                    </span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                                    Отмена
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFile(file.id, file.name);
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          
                          {allowDelete && isDeleting && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Удаление...
                            </div>
                          )}
                        </div>
                      </div>
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

function toastSuccess(message: string) {
  alert(message);
}

function toastError(message: string) {
  alert(`Ошибка: ${message}`); 
}