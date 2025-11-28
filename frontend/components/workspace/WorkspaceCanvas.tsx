import { Card } from '../ui/card';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnnotations } from '../hooks/useAnnotations';
import { BoundingBox } from '../types/annotations';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

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

type InteractionMode = 'idle' | 'drawing' | 'moving_bbox' | 'resizing_bbox' | 'panning';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

export function WorkspaceCanvas({ currentFile, activeTool, taskId }: WorkspaceCanvasProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [startPoint, setStartPoint] = useState<{ x: number, y: number }>({ x: 0, y: 0 }); // Координаты мыши при нажатии
  const [initialBBox, setInitialBBox] = useState<BoundingBox | null>(null); // Копия бокса до начала перетаскивания
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const {
    annotations,
    currentBoundingBox,
    isDrawing,
    setIsDrawing,
    setCurrentBoundingBox,
    finishDrawing,
    selectBoundingBox,
    deleteBoundingBox,
    loadAnnotationsForFile,
    updateBoundingBox,
    selectedBoundingBox
  } = useAnnotations();

  useEffect(() => {
    if (!currentFile) {
      setImageUrl(null);
      return;
    }

    const loadImage = async () => {
      setImageLoading(true);
      try {
        const imageResponse = await fetch(`http://localhost:8000/api/routes/files/${currentFile.id}`);
        if (imageResponse.ok) {
          const blob = await imageResponse.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          const img = new Image();
          img.src = url;
          img.onload = () => {
            setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            setScale(1);
            setPosition({ x: 0, y: 0 });
          };
        }
      } catch (err) {
        console.error('Error loading image:', err);
      } finally {
        setImageLoading(false);
      }
    };
    loadImage();
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, [currentFile]);

  useEffect(() => {
    if (currentFile?.id) {
      loadAnnotationsForFile(currentFile.id);
    }
  }, [currentFile?.id, loadAnnotationsForFile]);


  const getNormalizedPoint = (clientX: number, clientY: number) => {
    if (!containerRef.current || imgDimensions.width === 0) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const imageX = (mouseX - position.x) / scale;
    const imageY = (mouseY - position.y) / scale;
    return {
      x: imageX / imgDimensions.width,
      y: imageY / imgDimensions.height
    };
  };

  const toScreen = (normX: number, normY: number) => {
    return {
      x: normX * imgDimensions.width * scale + position.x,
      y: normY * imgDimensions.height * scale + position.y
    };
  };

  const isPointInBBox = (normPoint: {x: number, y: number}, bbox: BoundingBox) => {
    return (
      normPoint.x >= bbox.x && normPoint.x <= bbox.x + bbox.width &&
      normPoint.y >= bbox.y && normPoint.y <= bbox.y + bbox.height
    );
  };

  const getHandleAtPoint = (clientX: number, clientY: number, bbox: BoundingBox): ResizeHandle | null => {
    if (!bbox.isSelected) return null;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const screenX = bbox.x * imgDimensions.width * scale + position.x;
    const screenY = bbox.y * imgDimensions.height * scale + position.y;
    const screenW = bbox.width * imgDimensions.width * scale;
    const screenH = bbox.height * imgDimensions.height * scale;
    
    const handleSize = 8;
    
    const handles: Record<ResizeHandle, {x: number, y: number}> = {
      nw: { x: screenX, y: screenY },
      ne: { x: screenX + screenW, y: screenY },
      sw: { x: screenX, y: screenY + screenH },
      se: { x: screenX + screenW, y: screenY + screenH },
      n:  { x: screenX + screenW / 2, y: screenY },
      s:  { x: screenX + screenW / 2, y: screenY + screenH },
      w:  { x: screenX, y: screenY + screenH / 2 },
      e:  { x: screenX + screenW, y: screenY + screenH / 2 },
    };

    for (const [key, val] of Object.entries(handles)) {
      if (Math.abs(mouseX - val.x) <= handleSize && Math.abs(mouseY - val.y) <= handleSize) {
        return key as ResizeHandle;
      }
    }
    return null;
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();

    const normPoint = getNormalizedPoint(e.clientX, e.clientY);
    const screenPoint = { x: e.clientX, y: e.clientY };

    if (activeTool === 'move' || e.button === 1) {
      setInteractionMode('panning');
      setStartPoint({ x: e.clientX - position.x, y: e.clientY - position.y });
      return;
    }

    if (selectedBoundingBox && activeTool === 'select') {
      const handle = getHandleAtPoint(e.clientX, e.clientY, selectedBoundingBox);
      if (handle) {
        setInteractionMode('resizing_bbox');
        setActiveHandle(handle);
        setInitialBBox({ ...selectedBoundingBox });
        setStartPoint(normPoint);
        return;
      }
    }

    if ((activeTool === 'select' || activeTool === 'erase') && e.button === 0) {
      const currentAnns = annotations.find(a => a.file_id === currentFile?.id);
      const bboxes = currentAnns?.bounding_boxes || [];
      
      const clickedBox = [...bboxes].reverse().find(b => isPointInBBox(normPoint, b));

      if (clickedBox) {
        if (activeTool === 'erase') {
          deleteBoundingBox(clickedBox.id);
          return;
        }

        selectBoundingBox(clickedBox);
        setInteractionMode('moving_bbox');
        setInitialBBox({ ...clickedBox });
        setStartPoint(normPoint);
        return;
      } else {
        selectBoundingBox(null);
      }
    }

    if (activeTool === 'rectangle' && e.button === 0) {
      setInteractionMode('drawing');
      setIsDrawing(true);
      setStartPoint(normPoint);
      setCurrentBoundingBox({
        x: normPoint.x,
        y: normPoint.y,
        width: 0,
        height: 0,
        label: 'object',
        color: '#3B82F6',
        isSelected: true
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const normPoint = getNormalizedPoint(e.clientX, e.clientY);

    if (interactionMode === 'panning') {
      setPosition({
        x: e.clientX - startPoint.x,
        y: e.clientY - startPoint.y
      });
      return;
    }

    if (interactionMode === 'drawing' && isDrawing) {
      const width = normPoint.x - startPoint.x;
      const height = normPoint.y - startPoint.y;
      
      setCurrentBoundingBox(prev => prev ? {
        ...prev,
        x: width < 0 ? normPoint.x : startPoint.x,
        y: height < 0 ? normPoint.y : startPoint.y,
        width: Math.abs(width),
        height: Math.abs(height)
      } : null);
      return;
    }

    if (interactionMode === 'moving_bbox' && initialBBox && selectedBoundingBox) {
      const deltaX = normPoint.x - startPoint.x;
      const deltaY = normPoint.y - startPoint.y;

      const newX = initialBBox.x + deltaX;
      const newY = initialBBox.y + deltaY;

      updateBoundingBox(selectedBoundingBox.id, {
        x: newX,
        y: newY
      }, false);
      return;
    }
    if (interactionMode === 'resizing_bbox' && initialBBox && selectedBoundingBox && activeHandle) {
      const deltaX = normPoint.x - startPoint.x;
      const deltaY = normPoint.y - startPoint.y;

      let { x, y, width, height } = initialBBox;

      switch (activeHandle) {
        case 'e':
          width += deltaX;
          break;
        case 'w':
          x += deltaX;
          width -= deltaX;
          break;
        case 's':
          height += deltaY;
          break;
        case 'n':
          y += deltaY;
          height -= deltaY;
          break;
        case 'se':
          width += deltaX;
          height += deltaY;
          break;
        case 'sw':
          x += deltaX;
          width -= deltaX;
          height += deltaY;
          break;
        case 'ne':
          y += deltaY;
          width += deltaX;
          height -= deltaY;
          break;
        case 'nw':
          x += deltaX;
          y += deltaY;
          width -= deltaX;
          height -= deltaY;
          break;
      }

      if (width < 0) {
        x = x + width;
        width = Math.abs(width);
      }
      if (height < 0) {
        y = y + height;
        height = Math.abs(height);
      }

      updateBoundingBox(selectedBoundingBox.id, { x, y, width, height }, false);
      return;
    }

    if (interactionMode === 'idle' && activeTool === 'select' && containerRef.current) {
      if (selectedBoundingBox) {
        const handle = getHandleAtPoint(e.clientX, e.clientY, selectedBoundingBox);
        if (handle) {
          const cursors: Record<string, string> = {
            n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
            ne: 'ne-resize', sw: 'sw-resize', nw: 'nw-resize', se: 'se-resize'
          };
          containerRef.current.style.cursor = cursors[handle] || 'default';
          return;
        }
      }
      
      const currentAnns = annotations.find(a => a.file_id === currentFile?.id);
      const bboxes = currentAnns?.bounding_boxes || [];
      const isOver = bboxes.some(b => isPointInBBox(normPoint, b));
      
      containerRef.current.style.cursor = isOver ? 'move' : 'default';
    }
  };

  const handleMouseUp = () => {
    if ((interactionMode === 'moving_bbox' || interactionMode === 'resizing_bbox') && selectedBoundingBox) {
       updateBoundingBox(selectedBoundingBox.id, {}, true);
    }

    if (interactionMode === 'drawing' && currentFile) {
      finishDrawing(currentFile.id, taskId || undefined);
    }

    setInteractionMode('idle');
    setInitialBBox(null);
    setActiveHandle(null);
    setIsDragging(false); 
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoomFactor = Math.exp(wheel * zoomIntensity);
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 10);
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newPos = {
      x: mouseX - (mouseX - position.x) * (newScale / scale),
      y: mouseY - (mouseY - position.y) * (newScale / scale)
    };
    setScale(newScale);
    setPosition(newPos);
  };

  const renderResizeHandles = (bbox: BoundingBox) => {
    if (!bbox.isSelected) return null;
    
    const handles: ResizeHandle[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];
    
    return handles.map(handle => {
      const style: React.CSSProperties = {
        position: 'absolute',
        width: '8px',
        height: '8px',
        backgroundColor: 'white',
        border: `1px solid ${bbox.color}`,
        borderRadius: '50%',
        zIndex: 20,
        pointerEvents: 'none',
      };

      if (handle.includes('n')) style.top = '-4px';
      if (handle.includes('s')) style.bottom = '-4px';
      if (handle.includes('w')) style.left = '-4px';
      if (handle.includes('e')) style.right = '-4px';
      if (handle === 'n' || handle === 's') style.left = 'calc(50% - 4px)';
      if (handle === 'e' || handle === 'w') style.top = 'calc(50% - 4px)';

      return <div key={handle} style={style} />;
    });
  };

  const renderBoundingBox = (bbox: BoundingBox | Partial<BoundingBox>, isTemp: boolean = false) => {
    if (bbox.x === undefined || bbox.y === undefined || !bbox.width || !bbox.height) return null;

    const style: React.CSSProperties = {
      left: `${bbox.x * 100}%`,
      top: `${bbox.y * 100}%`,
      width: `${bbox.width * 100}%`,
      height: `${bbox.height * 100}%`,
      position: 'absolute',
      border: `2px solid ${bbox.color || '#3B82F6'}`,
      backgroundColor: isTemp || (bbox as BoundingBox).isSelected ? `${bbox.color}40` : 'transparent',
      boxSizing: 'border-box'
    };

    return (
      <div 
        key={isTemp ? 'temp' : (bbox as BoundingBox).id} 
        style={style}
        className="group"
      >
        {!isTemp && !isDrawing && (
           renderResizeHandles(bbox as BoundingBox)
        )}
        {!isTemp && (
          <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {(bbox as BoundingBox).label}
          </div>
        )}
      </div>
    );
  };

  const currentAnnotation = annotations.find(a => a.file_id === currentFile?.id);
  const bboxes = currentAnnotation?.bounding_boxes || [];

  if (!currentFile) {
    return (
      <Card className="flex-1 flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Выберите файл для работы</p>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col bg-muted/30 overflow-hidden relative">
      <div className="flex items-center justify-between p-2 border-b bg-background z-10">
        <div className="text-xs text-muted-foreground">
          {Math.round(scale * 100)}% | {bboxes.length} boxes
        </div>
        <div className="flex gap-1">
          <button onClick={() => setScale(s => Math.max(0.1, s * 0.8))} className="p-1 hover:bg-accent rounded"><ZoomOut size={16}/></button>
          <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="p-1 hover:bg-accent rounded"><Maximize size={16}/></button>
          <button onClick={() => setScale(s => Math.min(10, s * 1.2))} className="p-1 hover:bg-accent rounded"><ZoomIn size={16}/></button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-slate-100"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: interactionMode === 'panning' ? 'grabbing' : activeTool === 'move' ? 'grab' : 'default' }}
      >
        {imageLoading && <div className="absolute inset-0 flex items-center justify-center">Загрузка...</div>}
        
        <div 
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: imgDimensions.width ? imgDimensions.width : 'auto',
            height: imgDimensions.height ? imgDimensions.height : 'auto',
            position: 'absolute'
          }}
        >
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Workspace" 
              draggable={false}
              className="select-none pointer-events-none block"
            />
          )}

          <div className="absolute inset-0 w-full h-full">
            {bboxes.map(bbox => renderBoundingBox(bbox))}
            {isDrawing && currentBoundingBox && renderBoundingBox(currentBoundingBox, true)}
          </div>
        </div>
      </div>
    </Card>
  );
}