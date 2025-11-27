import { Card } from '../ui/card';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnnotations } from '../hooks/useAnnotations';
import { BoundingBox } from '../types/annotations';
import {
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

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
  taskId?: string | null;
}

export function WorkspaceCanvas({ currentFile, activeTool, taskId }: WorkspaceCanvasProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isMovingBbox, setIsMovingBbox] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const {
    annotations,
    selectedBoundingBox,
    isDrawing,
    currentBoundingBox,
    startDrawing,
    updateDrawing,
    finishDrawing,
    selectBoundingBox,
    updateBoundingBox,
    deleteBoundingBox,
    moveBoundingBox,
    resizeBoundingBox,
    loadAnnotationsForFile,
    saveAnnotations,
  } = useAnnotations();

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
    if (currentFile?.id) {
      loadAnnotationsForFile(currentFile.id);
    }
  }, [currentFile?.id, loadAnnotationsForFile]);

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
    
    if (containerRef.current) {
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

  const getCurrentFileBoundingBoxes = useCallback((): BoundingBox[] => {
    if (!currentFile) return [];
    const annotation = annotations.find(ann => ann.file_id === currentFile.id);
    return annotation?.bounding_boxes || [];
  }, [currentFile, annotations]);

  const isPointInBoundingBox = useCallback((point: { x: number, y: number }, bbox: BoundingBox, containerRect: DOMRect, imageScale: number): boolean => {
    const bboxX = bbox.x * containerRect.width * imageScale + position.x;
    const bboxY = bbox.y * containerRect.height * imageScale + position.y;
    const bboxWidth = bbox.width * containerRect.width * imageScale;
    const bboxHeight = bbox.height * containerRect.height * imageScale;

    return point.x >= bboxX && 
           point.x <= bboxX + bboxWidth && 
           point.y >= bboxY && 
           point.y <= bboxY + bboxHeight;
  }, [position, scale]);

  const getResizeHandleAtPoint = useCallback((point: { x: number, y: number }, bbox: BoundingBox, containerRect: DOMRect, imageScale: number): string | null => {
    if (!bbox.isSelected) return null;

    const bboxX = bbox.x * containerRect.width * imageScale + position.x;
    const bboxY = bbox.y * containerRect.height * imageScale + position.y;
    const bboxWidth = bbox.width * containerRect.width * imageScale;
    const bboxHeight = bbox.height * containerRect.height * imageScale;

    const handleSize = 8;
    const handles = {
      'nw': { x: bboxX - handleSize/2, y: bboxY - handleSize/2 },
      'ne': { x: bboxX + bboxWidth - handleSize/2, y: bboxY - handleSize/2 },
      'sw': { x: bboxX - handleSize/2, y: bboxY + bboxHeight - handleSize/2 },
      'se': { x: bboxX + bboxWidth - handleSize/2, y: bboxY + bboxHeight - handleSize/2 },
      'n': { x: bboxX + bboxWidth/2 - handleSize/2, y: bboxY - handleSize/2 },
      's': { x: bboxX + bboxWidth/2 - handleSize/2, y: bboxY + bboxHeight - handleSize/2 },
      'w': { x: bboxX - handleSize/2, y: bboxY + bboxHeight/2 - handleSize/2 },
      'e': { x: bboxX + bboxWidth - handleSize/2, y: bboxY + bboxHeight/2 - handleSize/2 },
    };

    for (const [handle, handleRect] of Object.entries(handles)) {
      if (point.x >= handleRect.x && point.x <= handleRect.x + handleSize &&
          point.y >= handleRect.y && point.y <= handleRect.y + handleSize) {
        return handle;
      }
    }

    return null;
  }, [position, scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (activeTool === 'move' && e.button === 0) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      containerRef.current.style.cursor = 'grabbing';
      return;
    }

    if (activeTool === 'rectangle' && e.button === 0) {
      startDrawing(e.clientX, e.clientY, rect, scale);
      return;
    }

    if (activeTool === 'select' && e.button === 0) {
      const boundingBoxes = getCurrentFileBoundingBoxes();
      
      for (const bbox of boundingBoxes) {
        if (bbox.isSelected) {
          const handle = getResizeHandleAtPoint(point, bbox, rect, scale);
          if (handle) {
            setResizeHandle(handle);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
          }
        }
      }

      for (const bbox of boundingBoxes.reverse()) {
        if (isPointInBoundingBox(point, bbox, rect, scale)) {
          selectBoundingBox(bbox);
          setIsMovingBbox(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
          return;
        }
      }

      selectBoundingBox(null);
    }

    if (activeTool === 'erase' && e.button === 0) {
      const boundingBoxes = getCurrentFileBoundingBoxes();
      for (const bbox of boundingBoxes.reverse()) {
        if (isPointInBoundingBox(point, bbox, rect, scale)) {
          deleteBoundingBox(bbox.id);
          break;
        }
      }
    }
  }, [
    activeTool, scale, startDrawing, getCurrentFileBoundingBoxes,
    getResizeHandleAtPoint, isPointInBoundingBox, selectBoundingBox,
    deleteBoundingBox
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isDragging && activeTool === 'move') {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDrawing && activeTool === 'rectangle') {
      updateDrawing(e.clientX, e.clientY, rect, scale);
      return;
    }

    if (isMovingBbox && selectedBoundingBox && activeTool === 'select') {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      moveBoundingBox(selectedBoundingBox.id, deltaX, deltaY, rect, scale);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (resizeHandle && selectedBoundingBox && activeTool === 'select') {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      resizeBoundingBox(selectedBoundingBox.id, resizeHandle, deltaX, deltaY, rect, scale);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (activeTool === 'select') {
      const boundingBoxes = getCurrentFileBoundingBoxes();
      let cursor = 'default';

      for (const bbox of boundingBoxes) {
        if (bbox.isSelected) {
          const handle = getResizeHandleAtPoint(point, bbox, rect, scale);
          if (handle) {
            cursor = `${handle}-resize`;
            break;
          } else if (isPointInBoundingBox(point, bbox, rect, scale)) {
            cursor = 'move';
            break;
          }
        } else if (isPointInBoundingBox(point, bbox, rect, scale)) {
          cursor = 'pointer';
          break;
        }
      }

      containerRef.current.style.cursor = cursor;
    }
  }, [
    isDragging, activeTool, lastMousePos, isDrawing, updateDrawing,
    isMovingBbox, selectedBoundingBox, moveBoundingBox, resizeHandle,
    resizeBoundingBox, getCurrentFileBoundingBoxes, getResizeHandleAtPoint,
    isPointInBoundingBox, scale
  ]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (containerRef.current) {
        containerRef.current.style.cursor = activeTool === 'move' ? 'grab' : 'default';
      }
    }

    if (isDrawing && activeTool === 'rectangle' && currentFile) {
      finishDrawing(currentFile.id, taskId || undefined);
    }

    if (isMovingBbox) {
      setIsMovingBbox(false);
    }

    if (resizeHandle) {
      setResizeHandle(null);
    }
  }, [isDragging, activeTool, isDrawing, currentFile, finishDrawing, taskId, isMovingBbox, resizeHandle]);

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 10));
  const handleZoomOut = () => setScale(prev => Math.max(prev * 0.8, 0.1));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleSaveAnnotations = async () => {
    if (!currentFile) return;
    
    try {
      await saveAnnotations(currentFile.id, taskId || undefined);
      alert('Аннотации успешно сохранены!');
    } catch (error) {
      alert('Ошибка при сохранении аннотаций');
    }
  };

  if (!currentFile) {
    return (
      <Card className="flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
        <div className="text-center text-muted-foreground">
          <p>Выберите файл для работы</p>
        </div>
      </Card>
    );
  }

  const boundingBoxes = getCurrentFileBoundingBoxes();

  return (
    <Card className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Масштаб: {Math.round(scale * 100)}%
          </span>
          <span className="text-sm text-muted-foreground">
            • Аннотации: {boundingBoxes.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="p-1 hover:bg-accent rounded-md" title="Уменьшить">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleResetZoom} className="px-2 py-1 text-xs hover:bg-accent rounded-md">
            Сброс
          </button>
          <button onClick={handleZoomIn} className="p-1 hover:bg-accent rounded-md" title="Увеличить">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSaveAnnotations}
            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Сохранить
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
              <p>Загрузка изображения...</p>
            </div>
          ) : imageError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-destructive">{imageError}</p>
            </div>
          ) : imageUrl ? (
            <>
              <img 
                ref={imageRef}
                src={imageUrl} 
                alt={currentFile.name}
                className="absolute top-0 left-0 max-w-none origin-top-left"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                }}
              />
              
              {boundingBoxes.map(bbox => {
                const bboxX = bbox.x * (containerRef.current?.offsetWidth || 0) * scale + position.x;
                const bboxY = bbox.y * (containerRef.current?.offsetHeight || 0) * scale + position.y;
                const bboxWidth = bbox.width * (containerRef.current?.offsetWidth || 0) * scale;
                const bboxHeight = bbox.height * (containerRef.current?.offsetHeight || 0) * scale;

                return (
                  <div
                    key={bbox.id}
                    className="absolute border-2"
                    style={{
                      left: bboxX,
                      top: bboxY,
                      width: bboxWidth,
                      height: bboxHeight,
                      borderColor: bbox.color,
                      backgroundColor: `${bbox.color}40`,
                      cursor: bbox.isSelected ? 'move' : 'pointer',
                    }}
                  >
                    <div 
                      className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
                      style={{ backgroundColor: bbox.color }}
                    >
                      {bbox.label}
                    </div>

                    {bbox.isSelected && (
                      <>
                        {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map(handle => (
                          <div
                            key={handle}
                            className={`absolute w-2 h-2 bg-white border-2 rounded-full ${
                              handle === 'nw' ? 'top-0 left-0 -translate-x-1 -translate-y-1 cursor-nw-resize' :
                              handle === 'ne' ? 'top-0 right-0 translate-x-1 -translate-y-1 cursor-ne-resize' :
                              handle === 'sw' ? 'bottom-0 left-0 -translate-x-1 translate-y-1 cursor-sw-resize' :
                              handle === 'se' ? 'bottom-0 right-0 translate-x-1 translate-y-1 cursor-se-resize' :
                              handle === 'n' ? 'top-0 left-1/2 -translate-x-1 -translate-y-1 cursor-n-resize' :
                              handle === 's' ? 'bottom-0 left-1/2 -translate-x-1 translate-y-1 cursor-s-resize' :
                              handle === 'w' ? 'top-1/2 left-0 -translate-x-1 -translate-y-1 cursor-w-resize' :
                              'top-1/2 right-0 translate-x-1 -translate-y-1 cursor-e-resize'
                            }`}
                            style={{ borderColor: bbox.color }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}

              {isDrawing && currentBoundingBox && currentBoundingBox.x !== undefined && currentBoundingBox.y !== undefined && (
                <div
                  className="absolute border-2 border-dashed"
                  style={{
                    left: currentBoundingBox.x * (containerRef.current?.offsetWidth || 0) * scale + position.x,
                    top: currentBoundingBox.y * (containerRef.current?.offsetHeight || 0) * scale + position.y,
                    width: (currentBoundingBox.width || 0) * (containerRef.current?.offsetWidth || 0) * scale,
                    height: (currentBoundingBox.height || 0) * (containerRef.current?.offsetHeight || 0) * scale,
                    borderColor: currentBoundingBox.color,
                    backgroundColor: `${currentBoundingBox.color}40`,
                  }}
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p>Изображение недоступно</p>
            </div>
          )}

          {activeTool === 'move' && !isDragging && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Зажмите ЛКМ для перемещения
            </div>
          )}
          {activeTool === 'rectangle' && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Зажмите ЛКМ и протяните для создания прямоугольника
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Колесико мыши для зума
          </div>
        </div>
      </div>
    </Card>
  );
}