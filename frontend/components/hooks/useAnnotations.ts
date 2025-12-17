import { useContext } from 'react';
import { AnnotationsContext } from '../workspace/AnnotationsContext';

export function useAnnotations() {
  const context = useContext(AnnotationsContext);
  if (context === undefined) {
    throw new Error('useAnnotations must be used within an AnnotationsProvider');
  }
  return context;
}