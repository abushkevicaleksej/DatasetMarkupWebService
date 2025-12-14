export interface MLModel {
  id: string;
  name: string;
  version: string;
  model_type: string;
  framework: string;
  description?: string;
  supported_classes: string[];
  confidence_threshold: number;
  is_active: boolean;
}

export interface PredictionRequest {
  file_ids: string[];
  model_id: string;
  confidence_threshold: number;
  max_predictions: number;
  task_id?: string | null;
}

export interface PredictionResponse {
  file_id: string;
  predictions: any[];
  processing_time: number;
  total_predictions: number;
}

// Используем тот же базовый URL, что и в Workspace.tsx
const API_BASE_URL = 'http://localhost:8000/api/routes'; 

export const mlApi = {
  async getModels(): Promise<MLModel[]> {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) throw new Error('Failed to fetch models');
    return response.json();
  },

  async predict(data: PredictionRequest): Promise<PredictionResponse[]> {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Prediction failed');
    }

    return response.json();
  }
};