import { Card } from '../ui/card';
import {
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

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
  activeTool: 'select' | 'rectangle' | 'erase' | 'move';
}

export function WorkspaceCanvas({ currentFile, activeTool }: WorkspaceCanvasProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!currentFile) {
      setImageUrl(null);
      return;
    }

    const loadImage = async () => {
      setImageLoading(true);
      setImageError(null);
      
      try {
        const imageResponse = await fetch(`http://localhost:8000/api/routes/files/${currentFile.id}`);
        if (imageResponse.ok) {
          const blob = await imageResponse.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } else {
          throw new Error('Не удалось загрузить изображение');
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

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentFile]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    
    const newScale = scale * zoom;
    
    const minScale = 0.1;
    const maxScale = 10;
    const clampedScale = Math.min(Math.max(newScale, minScale), maxScale);
    
    if (containerRef.current && imageRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scaleChange = clampedScale / scale;
      const newX = mouseX - scaleChange * (mouseX - position.x);
      const newY = mouseY - scaleChange * (mouseY - position.y);
      
      setScale(clampedScale);
      setPosition({ x: newX, y: newY });
    }
  }, [scale, position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'move' || e.button !== 0) return;
    
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  }, [activeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || activeTool !== 'move') return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastMousePos, activeTool]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      if (containerRef.current) {
        containerRef.current.style.cursor = activeTool === 'move' ? 'grab' : 'default';
      }
    }
  }, [isDragging, activeTool]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = activeTool === 'move' ? 'grab' : 'default';
    }
  }, [activeTool]);

  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.2, 10);
    setScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale * 0.8, 0.1);
    setScale(newScale);
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

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
    <Card className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Масштаб: {Math.round(scale * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            title="Уменьшить (колесико мыши)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs hover:bg-accent rounded-md transition-colors"
          >
            Сброс
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            title="Увеличить (колесико мыши)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-8">
        <div 
          ref={containerRef}
          className="relative w-full h-full bg-background border-2 border-dashed rounded-lg overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Загрузка изображения...</p>
              </div>
            </div>
          ) : imageError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-destructive">
                <p>{imageError}</p>
              </div>
            </div>
          ) : imageUrl ? (
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt={currentFile.name}
              className="absolute top-0 left-0 max-w-none origin-top-left"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                cursor: activeTool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageError('Ошибка загрузки изображения')}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>Изображение недоступно</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}