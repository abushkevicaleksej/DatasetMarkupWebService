export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  isSelected?: boolean;
  isEditing?: boolean;
}

export interface Annotation {
  id: string;
  file_id: string;
  task_id?: string;
  bounding_boxes: BoundingBox[];
  created_at?: string;
}

export interface AnnotationCreateRequest {
  file_id: string;
  task_id?: string;
  bounding_boxes: Omit<BoundingBox, 'id'>[];
}