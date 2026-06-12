import apiClient from '../../src/client';
import { API_ROUTES_URL } from '../../src/config';

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

export interface OnlineLearningRequest {
  model_id: string;
  task_id: string;
  epochs: number;
  batch_size: number;
  learning_rate: number;
}

export interface OnlineLearningResponse {
  session_id: string;
  status: string;
}

export const mlApi = {
  async getModels(): Promise<MLModel[]> {
    const response = await apiClient.get(`${API_ROUTES_URL}/models`);
    if (!response.status) throw new Error('Failed to fetch models');
    return response.data;
  },

  async predict(data: PredictionRequest): Promise<PredictionResponse[]> {
    const response = await apiClient.post(`${API_ROUTES_URL}/predict`, data);

    if (!response.status) {
      const error = await response.data;
      throw new Error(error.detail || 'Prediction failed');
    }

    return response.data;
  },
   async train (data: OnlineLearningRequest): Promise<OnlineLearningResponse> {
    const response = await apiClient.post('/api/routes/online-learning', data);

    if (!response.status) {
      const error = await response.data;
      throw new Error(error.detail || 'Training request failed');
    }
    return response.data;
  }
};