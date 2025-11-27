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

export function WorkspaceCanvas({ currentFile, activeTool, taskId }: WorkspaceCanvasProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);

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

  const isPointInBBox = (clientX: number, clientY: number, bbox: BoundingBox) => {
    const p = getNormalizedPoint(clientX, clientY);
    return (
      p.x >= bbox.x && p.x <= bbox.x + bbox.width &&
      p.y >= bbox.y && p.y <= bbox.y + bbox.height
    );
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();

    if (activeTool === 'move' || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      return;
    }

    if (activeTool === 'rectangle' && e.button === 0) {
      setIsDrawing(true);
      const startPoint = getNormalizedPoint(e.clientX, e.clientY);
      setDrawStart(startPoint);
      
      setCurrentBoundingBox({
        x: startPoint.x,
        y: startPoint.y,
        width: 0,
        height: 0,
        label: 'object',
        color: '#3B82F6',
        isSelected: true
      });
      return;
    }

    if ((activeTool === 'select' || activeTool === 'erase') && e.button === 0) {
      const currentAnns = annotations.find(a => a.file_id === currentFile?.id);
      if (!currentAnns) return;

      const clickedBox = [...currentAnns.bounding_boxes].reverse().find(bbox => 
        isPointInBBox(e.clientX, e.clientY, bbox)
      );

      if (clickedBox) {
        if (activeTool === 'erase') {
          deleteBoundingBox(clickedBox.id);
        } else {
          selectBoundingBox(clickedBox);
        }
      } else {
        selectBoundingBox(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (isDrawing && drawStart && activeTool === 'rectangle') {
      const currentPoint = getNormalizedPoint(e.clientX, e.clientY);
      
      const width = currentPoint.x - drawStart.x;
      const height = currentPoint.y - drawStart.y;
      
      setCurrentBoundingBox(prev => prev ? {
        ...prev,
        x: width < 0 ? currentPoint.x : drawStart.x,
        y: height < 0 ? currentPoint.y : drawStart.y,
        width: Math.abs(width),
        height: Math.abs(height)
      } : null);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }

    if (isDrawing && currentFile) {
      finishDrawing(currentFile.id, taskId || undefined);
      setDrawStart(null);
    }
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
      cursor: 'pointer',
      boxSizing: 'border-box'
    };

    return (
      <div 
        key={isTemp ? 'temp' : (bbox as BoundingBox).id} 
        style={style}
        className="group"
      >
        {!isTemp && (
          <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {bbox.label}
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
        className="flex-1 overflow-hidden relative bg-slate-100 cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: activeTool === 'move' || isDragging ? 'grab' : 'default' }}
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