import { Card } from '../ui/card';
import { useState, useEffect } from 'react';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image';
  size: string;
  active: boolean;
  file_path?: string;
}

interface WorkspaceCanvasProps {
  currentFile: WorkspaceFile | null;
}

export function WorkspaceCanvas({ currentFile }: WorkspaceCanvasProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFile) {
      setImageUrl(null);
      return;
    }

    const loadImage = async () => {
      setImageLoading(true);
      setImageError(null);
      
      try {
        if (currentFile.file_path) {
          const imageResponse = await fetch(`http://localhost:8000/api/routes/files/${currentFile.id}`);
          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
          } else {
            throw new Error('Не удалось загрузить изображение');
          }
        } else {
          setImageUrl(null);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        setImageError('Не удалось загрузить изображение');
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [currentFile]);

  if (!currentFile) {
    return (
      <Card className="flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <div className="relative w-full max-w-4xl aspect-video bg-background border-2 border-dashed rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Выберите файл для работы</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center p-8">
        <div className="relative w-full max-w-4xl aspect-video bg-background border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden">
          {imageLoading ? (
            <div className="text-center text-muted-foreground">
              <p>Загрузка изображения...</p>
            </div>
          ) : imageError ? (
            <div className="text-center text-destructive">
              <p>{imageError}</p>
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={currentFile.name}
              className="max-w-full max-h-full object-contain"
              onLoad={() => setImageLoading(false)}
              onError={() => setImageError('Ошибка загрузки изображения')}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Изображение недоступно</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}