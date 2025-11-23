import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image';
  size: string;
  active: boolean;
}

interface WorkspaceNavigationProps {
  files: WorkspaceFile[];
  currentFileId: string | null;
  onFileChange: (fileId: string) => void;
}

export function WorkspaceNavigation({ files, currentFileId, onFileChange }: WorkspaceNavigationProps) {
  const currentIndex = files.findIndex(file => file.id === currentFileId);
  const totalFiles = files.length;

  const goToPrevious = () => {
    if (files.length === 0) return;
    
    const newIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
    onFileChange(files[newIndex].id);
  };

  const goToNext = () => {
    if (files.length === 0) return;
    
    const newIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
    onFileChange(files[newIndex].id);
  };

  if (files.length === 0) {
    return (
      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" disabled className="min-w-24">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          
          <div className="flex items-center gap-2 min-w-32 justify-center">
            <span className="text-muted-foreground">Нет файлов</span>
          </div>
          
          <Button variant="outline" disabled className="min-w-24">
            Вперед
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const currentFile = files[currentIndex];

  return (
    <div className="border-t bg-card px-4 py-3">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={files.length === 0}
          className="min-w-24"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Назад
        </Button>
        
        <div className="flex items-center gap-2 min-w-32 justify-center">
          <span className="text-muted-foreground">Файл</span>
          <span>{currentIndex + 1}</span>
          <span className="text-muted-foreground">из</span>
          <span>{totalFiles}</span>
        </div>

        <div className="flex items-center gap-2 mx-4 min-w-0 flex-1 max-w-md">
          <span className="text-sm truncate" title={currentFile.name}>
            {currentFile.name}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            ({currentFile.size})
          </span>
        </div>
        
        <Button
          variant="outline"
          onClick={goToNext}
          disabled={files.length === 0}
          className="min-w-24"
        >
          Вперед
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {files.length > 1 && (
        <div className="flex justify-center mt-2">
          <div className="flex gap-1">
            {files.map((_, index) => (
              <button
                key={index}
                onClick={() => onFileChange(files[index].id)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                } hover:bg-primary/70`}
                title={`Перейти к файлу ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}