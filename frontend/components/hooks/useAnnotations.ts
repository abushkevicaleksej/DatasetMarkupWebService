import { useState, useCallback } from 'react';
import { BoundingBox, Annotation } from '../types/annotations';

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedBoundingBox, setSelectedBoundingBox] = useState<BoundingBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBoundingBox, setCurrentBoundingBox] = useState<Partial<BoundingBox> | null>(null);

  const findAnnotationIdByBboxId = useCallback((bboxId: string): string | null => {
    for (const annotation of annotations) {
      for (const bbox of annotation.bounding_boxes) {
        if (bbox.id === bboxId) {
          return annotation.id;
        }
      }
    }
    return null;
  }, [annotations]);

  const findAnnotationByFileId = useCallback((fileId: string): Annotation | null => {
    return annotations.find(ann => ann.file_id === fileId) || null;
  }, [annotations]);

  const loadAnnotationsForFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/routes/annotations/file/${fileId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setAnnotations([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded annotations for file', fileId, ':', data);
      
      const formattedAnnotations: Annotation[] = data.map((item: any) => ({
        id: item.id,
        file_id: item.file_id,
        task_id: item.task_id,
        bounding_boxes: item.bounding_boxes.map((bbox: any) => ({
          id: bbox.id,
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
          label: bbox.label,
          confidence: bbox.confidence,
          color: '#3B82F6',
          isSelected: false
        })),
        created_at: item.created_at
      }));
      
      setAnnotations(formattedAnnotations);
    } catch (error) {
      console.error('Error loading annotations:', error);
      setAnnotations([]);
    }
  }, []);

  const startDrawing = useCallback((clientX: number, clientY: number, rect: DOMRect, scale: number, position: { x: number, y: number }) => {
    setIsDrawing(true);
    const x = (clientX - rect.left - position.x) / (rect.width * scale);
    const y = (clientY - rect.top - position.y) / (rect.height * scale);
    
    setCurrentBoundingBox({
      x,
      y,
      width: 0,
      height: 0,
      label: 'object',
      color: '#3B82F6',
      isSelected: true
    });
  }, []);

  const updateDrawing = useCallback((clientX: number, clientY: number, rect: DOMRect, scale: number, position: { x: number, y: number }) => {
    if (!currentBoundingBox || currentBoundingBox.x === undefined || currentBoundingBox.y === undefined) return;
    
    const currentX = (clientX - rect.left - position.x) / (rect.width * scale);
    const currentY = (clientY - rect.top - position.y) / (rect.height * scale);
    
    const width = Math.max(0, currentX - currentBoundingBox.x);
    const height = Math.max(0, currentY - currentBoundingBox.y);
    
    setCurrentBoundingBox(prev => prev ? { ...prev, width, height } : null);
  }, [currentBoundingBox]);

  const finishDrawing = useCallback(async (fileId: string, taskId?: string) => {
    if (!currentBoundingBox || 
        currentBoundingBox.x === undefined || 
        currentBoundingBox.y === undefined ||
        currentBoundingBox.width === undefined || 
        currentBoundingBox.height === undefined ||
        currentBoundingBox.width === 0 || 
        currentBoundingBox.height === 0) {
      setIsDrawing(false);
      setCurrentBoundingBox(null);
      return;
    }

    try {
      const boundingBoxData = {
        x: currentBoundingBox.x,
        y: currentBoundingBox.y,
        width: currentBoundingBox.width,
        height: currentBoundingBox.height,
        label: currentBoundingBox.label || 'object',
        confidence: 1.0
      };

      const annotationData = {
        file_id: fileId,
        task_id: taskId || null, 
        bounding_boxes: [boundingBoxData]
      };

      console.log('Saving annotation:', annotationData);

      const response = await fetch('http://localhost:8000/api/routes/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save annotation: ${errorText}`);
      }

      const savedAnnotation = await response.json();
      console.log('Annotation saved:', savedAnnotation);

      const newBoundingBox: BoundingBox = {
        id: savedAnnotation.bounding_boxes[0]?.id || Date.now().toString(),
        x: currentBoundingBox.x,
        y: currentBoundingBox.y,
        width: currentBoundingBox.width,
        height: currentBoundingBox.height,
        label: currentBoundingBox.label || 'object',
        confidence: 1.0,
        color: '#3B82F6',
        isSelected: false
      };

      setAnnotations(prev => {
      const existingAnnotationIndex = prev.findIndex(ann => ann.file_id === fileId);
      
      if (existingAnnotationIndex >= 0) {
        const updated = [...prev];
        updated[existingAnnotationIndex] = {
          ...updated[existingAnnotationIndex],
          bounding_boxes: [...updated[existingAnnotationIndex].bounding_boxes, newBoundingBox]
        };
        return updated;
      } else {
        const newAnnotation: Annotation = {
          id: savedAnnotation.id || Date.now().toString(),
          file_id: fileId,
          task_id: taskId || 'temp',
          bounding_boxes: [newBoundingBox],
          created_at: new Date().toISOString()
        };
        return [...prev, newAnnotation];
      }
    });

    } catch (error) {
      console.error('Error finishing drawing:', error);
      alert('Ошибка при сохранении аннотации: ' + error);
    } finally {
      setIsDrawing(false);
      setCurrentBoundingBox(null);
    }
  }, [currentBoundingBox, loadAnnotationsForFile]);

  const selectBoundingBox = useCallback((bbox: BoundingBox | null) => {
    setAnnotations(prev => prev.map(ann => ({
      ...ann,
      bounding_boxes: ann.bounding_boxes.map(b => ({
        ...b,
        isSelected: b.id === bbox?.id
      }))
    })));
    
    setSelectedBoundingBox(bbox);
  }, []);

  const updateBoundingBox = useCallback(async (bboxId: string, updates: Partial<BoundingBox>) => {
    try {
      if (updates.label) {
        const response = await fetch(`http://localhost:8000/api/routes/annotations/bbox/${bboxId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ label: updates.label }),
        });

        if (!response.ok) {
          throw new Error('Failed to update bounding box');
        }
      }

      setAnnotations(prev => prev.map(ann => ({
        ...ann,
        bounding_boxes: ann.bounding_boxes.map(b => 
          b.id === bboxId ? { ...b, ...updates } : b
        )
      })));

      if (selectedBoundingBox?.id === bboxId) {
        setSelectedBoundingBox(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Error updating bounding box:', error);
    }
  }, [selectedBoundingBox]);

  const deleteBoundingBox = useCallback(async (bboxId: string) => {
    try {
      let annotationId: string | null = null;
      let fileId: string | null = null;
      
      for (const annotation of annotations) {
        const bbox = annotation.bounding_boxes.find(b => b.id === bboxId);
        if (bbox) {
          annotationId = annotation.id;
          fileId = annotation.file_id;
          break;
        }
      }
      
      if (!annotationId) {
        throw new Error('Annotation not found for this bounding box');
      }

      const response = await fetch(`http://localhost:8000/api/routes/annotations/${annotationId}/bbox/${bboxId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bounding box');
      }

      setAnnotations(prev => 
        prev.map(ann => 
          ann.id === annotationId 
            ? {
                ...ann,
                bounding_boxes: ann.bounding_boxes.filter(b => b.id !== bboxId)
              }
            : ann
        ).filter(ann => ann.bounding_boxes.length > 0)
      );

      if (selectedBoundingBox?.id === bboxId) {
        setSelectedBoundingBox(null);
      }

      console.log('Bounding box deleted:', bboxId);
      
    } catch (error) {
      console.error('Error deleting bounding box:', error);
      alert('Ошибка при удалении аннотации');
    }
  }, [annotations, selectedBoundingBox]);

  const moveBoundingBox = useCallback((bboxId: string, deltaX: number, deltaY: number, rect: DOMRect, scale: number) => {
    const deltaXNormalized = deltaX / (rect.width * scale);
    const deltaYNormalized = deltaY / (rect.height * scale);

    setAnnotations(prev => prev.map(ann => ({
      ...ann,
      bounding_boxes: ann.bounding_boxes.map(b => 
        b.id === bboxId ? {
          ...b,
          x: Math.max(0, Math.min(1 - b.width, b.x + deltaXNormalized)),
          y: Math.max(0, Math.min(1 - b.height, b.y + deltaYNormalized))
        } : b
      )
    })));
  }, []);

  const resizeBoundingBox = useCallback((bboxId: string, handle: string, deltaX: number, deltaY: number, rect: DOMRect, scale: number) => {
    const deltaXNormalized = deltaX / (rect.width * scale);
    const deltaYNormalized = deltaY / (rect.height * scale);

    setAnnotations(prev => prev.map(ann => ({
      ...ann,
      bounding_boxes: ann.bounding_boxes.map(b => {
        if (b.id !== bboxId) return b;

        let { x, y, width, height } = b;

        switch (handle) {
          case 'e':
            width = Math.max(0.01, width + deltaXNormalized);
            break;
          case 'w':
            x = Math.max(0, x + deltaXNormalized);
            width = Math.max(0.01, width - deltaXNormalized);
            break;
          case 'n':
            y = Math.max(0, y + deltaYNormalized);
            height = Math.max(0.01, height - deltaYNormalized);
            break;
          case 's':
            height = Math.max(0.01, height + deltaYNormalized);
            break;
          case 'ne':
            y = Math.max(0, y + deltaYNormalized);
            height = Math.max(0.01, height - deltaYNormalized);
            width = Math.max(0.01, width + deltaXNormalized);
            break;
          case 'nw':
            x = Math.max(0, x + deltaXNormalized);
            y = Math.max(0, y + deltaYNormalized);
            width = Math.max(0.01, width - deltaXNormalized);
            height = Math.max(0.01, height - deltaYNormalized);
            break;
          case 'se':
            width = Math.max(0.01, width + deltaXNormalized);
            height = Math.max(0.01, height + deltaYNormalized);
            break;
          case 'sw':
            x = Math.max(0, x + deltaXNormalized);
            width = Math.max(0.01, width - deltaXNormalized);
            height = Math.max(0.01, height + deltaYNormalized);
            break;
        }

        return { ...b, x, y, width, height };
      })
    })));
  }, []);

  const saveAnnotations = useCallback(async (fileId: string, taskId?: string) => {
    console.log('Save annotations called for file:', fileId);
  }, []);

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
}