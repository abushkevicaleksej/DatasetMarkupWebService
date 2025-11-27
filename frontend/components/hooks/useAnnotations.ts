import { useState, useCallback } from 'react';
import { BoundingBox, Annotation, AnnotationCreateRequest } from '../types/annotations';

export const useAnnotations = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedBoundingBox, setSelectedBoundingBox] = useState<BoundingBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBoundingBox, setCurrentBoundingBox] = useState<Partial<BoundingBox> | null>(null);

  const generateRandomColor = useCallback(() => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const startDrawing = useCallback((x: number, y: number, containerRect: DOMRect, imageScale: number) => {
    setIsDrawing(true);
    const relativeX = (x - containerRect.left) / (containerRect.width * imageScale);
    const relativeY = (y - containerRect.top) / (containerRect.height * imageScale);
    
    setCurrentBoundingBox({
      x: relativeX,
      y: relativeY,
      width: 0,
      height: 0,
      label: 'Object',
      color: generateRandomColor(),
    });
  }, [generateRandomColor]);

  const updateDrawing = useCallback((x: number, y: number, containerRect: DOMRect, imageScale: number) => {
    if (!isDrawing || !currentBoundingBox || currentBoundingBox.x === undefined || currentBoundingBox.y === undefined) return;

    const relativeX = (x - containerRect.left) / (containerRect.width * imageScale);
    const relativeY = (y - containerRect.top) / (containerRect.height * imageScale);
    
    const width = relativeX - currentBoundingBox.x;
    const height = relativeY - currentBoundingBox.y;

    setCurrentBoundingBox(prev => ({
      ...prev,
      width: Math.max(0, width),
      height: Math.max(0, height),
    }));
  }, [isDrawing, currentBoundingBox]);

  const finishDrawing = useCallback((fileId: string, taskId?: string) => {
    if (!isDrawing || !currentBoundingBox || 
        !currentBoundingBox.x || !currentBoundingBox.y ||
        !currentBoundingBox.width || !currentBoundingBox.height) {
      setIsDrawing(false);
      setCurrentBoundingBox(null);
      return;
    }

    const newBoundingBox: BoundingBox = {
      id: `bbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: currentBoundingBox.x,
      y: currentBoundingBox.y,
      width: currentBoundingBox.width,
      height: currentBoundingBox.height,
      label: currentBoundingBox.label || 'Object',
      color: currentBoundingBox.color || generateRandomColor(),
      isSelected: true,
    };

    setAnnotations(prev => {
      const existingAnnotation = prev.find(ann => ann.file_id === fileId);
      
      if (existingAnnotation) {
        return prev.map(ann => 
          ann.file_id === fileId 
            ? { ...ann, bounding_boxes: [...ann.bounding_boxes, newBoundingBox] }
            : ann
        );
      } else {
        return [...prev, {
          id: `ann-${Date.now()}`,
          file_id: fileId,
          task_id: taskId,
          bounding_boxes: [newBoundingBox],
          created_at: new Date().toISOString(),
        }];
      }
    });

    setSelectedBoundingBox(newBoundingBox);
    setIsDrawing(false);
    setCurrentBoundingBox(null);
  }, [isDrawing, currentBoundingBox, generateRandomColor]);

  const selectBoundingBox = useCallback((bbox: BoundingBox | null) => {
    setSelectedBoundingBox(bbox);
    
    setAnnotations(prev => prev.map(annotation => ({
      ...annotation,
      bounding_boxes: annotation.bounding_boxes.map(bbox => ({
        ...bbox,
        isSelected: false,
        isEditing: false,
      }))
    })));

    if (bbox) {
      setAnnotations(prev => prev.map(annotation => ({
        ...annotation,
        bounding_boxes: annotation.bounding_boxes.map(existingBbox => 
          existingBbox.id === bbox.id 
            ? { ...existingBbox, isSelected: true }
            : existingBbox
        )
      })));
    }
  }, []);

  const updateBoundingBox = useCallback((bboxId: string, updates: Partial<BoundingBox>) => {
    setAnnotations(prev => prev.map(annotation => ({
      ...annotation,
      bounding_boxes: annotation.bounding_boxes.map(bbox => 
        bbox.id === bboxId ? { ...bbox, ...updates } : bbox
      )
    })));

    if (selectedBoundingBox?.id === bboxId) {
      setSelectedBoundingBox(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedBoundingBox]);

  const deleteBoundingBox = useCallback((bboxId: string) => {
    setAnnotations(prev => 
      prev.map(annotation => ({
        ...annotation,
        bounding_boxes: annotation.bounding_boxes.filter(bbox => bbox.id !== bboxId)
      })).filter(annotation => annotation.bounding_boxes.length > 0)
    );

    if (selectedBoundingBox?.id === bboxId) {
      setSelectedBoundingBox(null);
    }
  }, [selectedBoundingBox]);

  const moveBoundingBox = useCallback((bboxId: string, deltaX: number, deltaY: number, containerRect: DOMRect, imageScale: number) => {
    const relativeDeltaX = deltaX / (containerRect.width * imageScale);
    const relativeDeltaY = deltaY / (containerRect.height * imageScale);

    setAnnotations(prev => prev.map(annotation => ({
      ...annotation,
      bounding_boxes: annotation.bounding_boxes.map(bbox => 
        bbox.id === bboxId 
          ? {
              ...bbox,
              x: Math.max(0, Math.min(1 - bbox.width, bbox.x + relativeDeltaX)),
              y: Math.max(0, Math.min(1 - bbox.height, bbox.y + relativeDeltaY)),
            }
          : bbox
      )
    })));
  }, []);

  const resizeBoundingBox = useCallback((bboxId: string, handle: string, deltaX: number, deltaY: number, containerRect: DOMRect, imageScale: number) => {
    const relativeDeltaX = deltaX / (containerRect.width * imageScale);
    const relativeDeltaY = deltaY / (containerRect.height * imageScale);

    setAnnotations(prev => prev.map(annotation => ({
      ...annotation,
      bounding_boxes: annotation.bounding_boxes.map(bbox => {
        if (bbox.id !== bboxId) return bbox;

        let newX = bbox.x;
        let newY = bbox.y;
        let newWidth = bbox.width;
        let newHeight = bbox.height;

        switch (handle) {
          case 'nw':
            newX = Math.max(0, bbox.x + relativeDeltaX);
            newY = Math.max(0, bbox.y + relativeDeltaY);
            newWidth = Math.max(0.01, bbox.width - relativeDeltaX);
            newHeight = Math.max(0.01, bbox.height - relativeDeltaY);
            break;
          case 'ne':
            newY = Math.max(0, bbox.y + relativeDeltaY);
            newWidth = Math.max(0.01, bbox.width + relativeDeltaX);
            newHeight = Math.max(0.01, bbox.height - relativeDeltaY);
            break;
          case 'sw':
            newX = Math.max(0, bbox.x + relativeDeltaX);
            newWidth = Math.max(0.01, bbox.width - relativeDeltaX);
            newHeight = Math.max(0.01, bbox.height + relativeDeltaY);
            break;
          case 'se':
            newWidth = Math.max(0.01, bbox.width + relativeDeltaX);
            newHeight = Math.max(0.01, bbox.height + relativeDeltaY);
            break;
          case 'n':
            newY = Math.max(0, bbox.y + relativeDeltaY);
            newHeight = Math.max(0.01, bbox.height - relativeDeltaY);
            break;
          case 's':
            newHeight = Math.max(0.01, bbox.height + relativeDeltaY);
            break;
          case 'w':
            newX = Math.max(0, bbox.x + relativeDeltaX);
            newWidth = Math.max(0.01, bbox.width - relativeDeltaX);
            break;
          case 'e':
            newWidth = Math.max(0.01, bbox.width + relativeDeltaX);
            break;
        }

        return {
          ...bbox,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        };
      })
    })));
  }, []);

  const loadAnnotationsForFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/routes/annotations/file/${fileId}`);
      if (response.ok) {
        const annotations = await response.json();
        setAnnotations(annotations);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  }, []);

  const saveAnnotations = useCallback(async (fileId: string, taskId?: string) => {
    try {
      const annotation = annotations.find(ann => ann.file_id === fileId);
      
      if (!annotation) return;

      const response = await fetch('http://localhost:8000/api/routes/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
          task_id: taskId,
          bounding_boxes: annotation.bounding_boxes.map(bbox => ({
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            label: bbox.label,
            confidence: 1.0,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save annotations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving annotations:', error);
      throw error;
    }
  }, [annotations]);

  return {
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
  };
};