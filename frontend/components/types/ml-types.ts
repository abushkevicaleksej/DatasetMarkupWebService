export enum ModelType {
  OBJECT_DETECTION = 'object_detection',
  CLASSIFICATION = 'classification',
  SEGMENTATION = 'segmentation',
  POSE_ESTIMATION = 'pose_estimation',
  OTHER = 'other'
}

export enum ModelFramework {
  YOLO = 'yolo',
  TORCHVISION = 'torchvision',
  TENSORFLOW = 'tensorflow',
  PYTORCH = 'pytorch',
  CUSTOM = 'custom',
  ONNX = 'onnx',
  OTHER = 'other'
}

export interface InputSize {
  width: number;
  height: number;
}

export interface ModelFormData {
  name: string;
  version: string;
  model_type: ModelType;
  framework: ModelFramework;
  description?: string;
  model_path: string;
  config_path?: string;
  supported_classes: string[];
  input_size: InputSize;
  confidence_threshold: number;
  is_active: boolean;
}