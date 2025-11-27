import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { BoundingBox, Annotation } from '../types/annotations';

interface AnnotationsContextType {
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  selectedBoundingBox: BoundingBox | null;
  setSelectedBoundingBox: (bbox: BoundingBox | null) => void;
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  currentBoundingBox: Partial<BoundingBox> | null;
  setCurrentBoundingBox: React.Dispatch<React.SetStateAction<Partial<BoundingBox> | null>>;
  
  loadAnnotationsForFile: (fileId: string) => Promise<void>;
  finishDrawing: (fileId: string, taskId?: string) => Promise<void>;
  updateBoundingBox: (bboxId: string, updates: Partial<BoundingBox>) => Promise<void>;
  deleteBoundingBox: (bboxId: string) => Promise<void>;
  selectBoundingBox: (bbox: BoundingBox | null) => void;
}

export const AnnotationsContext = createContext<AnnotationsContextType | undefined>(undefined);

export function AnnotationsProvider({ children }: { children: ReactNode }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedBoundingBox, setSelectedBoundingBox] = useState<BoundingBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBoundingBox, setCurrentBoundingBox] = useState<Partial<BoundingBox> | null>(null);

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

  const finishDrawing = useCallback(async (fileId: string, taskId?: string) => {
    if (!currentBoundingBox || 
        currentBoundingBox.x === undefined || 
        currentBoundingBox.y === undefined ||
        !currentBoundingBox.width || 
        !currentBoundingBox.height) {
      setIsDrawing(false);
      setCurrentBoundingBox(null);
      return;
    }

    try {
      const finalX = currentBoundingBox.width < 0 ? currentBoundingBox.x + currentBoundingBox.width : currentBoundingBox.x;
      const finalY = currentBoundingBox.height < 0 ? currentBoundingBox.y + currentBoundingBox.height : currentBoundingBox.y;
      const finalW = Math.abs(currentBoundingBox.width);
      const finalH = Math.abs(currentBoundingBox.height);

      const boundingBoxData = {
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
        label: currentBoundingBox.label || 'object',
        confidence: 1.0
      };

      const annotationData = {
        file_id: fileId,
        task_id: taskId || null, 
        bounding_boxes: [boundingBoxData]
      };

      const response = await fetch('http://localhost:8000/api/routes/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const savedAnnotation = await response.json();

      const newBoundingBox: BoundingBox = {
        id: savedAnnotation.bounding_boxes[0]?.id || Date.now().toString(),
        x: boundingBoxData.x,
        y: boundingBoxData.y,
        width: boundingBoxData.width,
        height: boundingBoxData.height,
        label: boundingBoxData.label,
        confidence: 1.0,
        color: '#3B82F6',
        isSelected: false
      };

      setAnnotations(prev => {
        const existingIndex = prev.findIndex(ann => ann.file_id === fileId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            bounding_boxes: [...updated[existingIndex].bounding_boxes, newBoundingBox]
          };
          return updated;
        } else {
          return [...prev, {
            id: savedAnnotation.id,
            file_id: fileId,
            task_id: taskId || 'temp',
            bounding_boxes: [newBoundingBox],
            created_at: new Date().toISOString()
          }];
        }
      });

    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Ошибка сохранения: ' + error);
    } finally {
      setIsDrawing(false);
      setCurrentBoundingBox(null);
    }
  }, [currentBoundingBox]);

  const updateBoundingBox = useCallback(async (bboxId: string, updates: Partial<BoundingBox>) => {
    try {
      if (updates.label) {
        await fetch(`http://localhost:8000/api/routes/annotations/bbox/${bboxId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: updates.label }),
        });
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
      console.error('Error updating bbox:', error);
    }
  }, [selectedBoundingBox]);

  const deleteBoundingBox = useCallback(async (bboxId: string) => {
    try {
      let annotationId: string | null = null;
      for (const ann of annotations) {
        if (ann.bounding_boxes.some(b => b.id === bboxId)) {
          annotationId = ann.id;
          break;
        }
      }

      if (annotationId) {
        await fetch(`http://localhost:8000/api/routes/annotations/${annotationId}/bbox/${bboxId}`, {
          method: 'DELETE',
        });
      }

      setAnnotations(prev => 
        prev.map(ann => ({
          ...ann,
          bounding_boxes: ann.bounding_boxes.filter(b => b.id !== bboxId)
        })).filter(ann => ann.bounding_boxes.length > 0)
      );

      if (selectedBoundingBox?.id === bboxId) {
        setSelectedBoundingBox(null);
      }
    } catch (error) {
      console.error('Error deleting bbox:', error);
    }
  }, [annotations, selectedBoundingBox]);

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

  return (
    <AnnotationsContext.Provider value={{
      annotations,
      setAnnotations,
      selectedBoundingBox,
      setSelectedBoundingBox,
      isDrawing,
      setIsDrawing,
      currentBoundingBox,
      setCurrentBoundingBox,
      loadAnnotationsForFile,
      finishDrawing,
      updateBoundingBox,
      deleteBoundingBox,
      selectBoundingBox
    }}>
      {children}
    </AnnotationsContext.Provider>
  );
}