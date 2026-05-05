import { useState, useEffect, createContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Box, CheckCircle2, Loader2, Trash2, Power, PowerOff, FileText, Settings } from 'lucide-react';
import { AddModelForm } from './AddModelForm';
import { ModelType, ModelFramework, InputSize } from './types/ml-types';
import apiClient from '../src/client';

interface Model {
  id: string;
  name: string;
  version: string;
  model_type: string;
  framework: string;
  description: string;
  supported_classes: string[];
  input_size: InputSize;
  confidence_threshold: number;
  is_active: boolean;
  is_pretrained: boolean;
  accuracy?: number;
  created_at: string;
  updated_at: string;
}

const ModelsContext = createContext<{
  models: Model[];
  fetchModels: () => void;
}>({
  models: [],
  fetchModels: () => {},
});

export function ModelList() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set());
  const [togglingModels, setTogglingModels] = useState<Set<string>>(new Set());

  const fetchModels = async () => {
    try {
      console.log('Начинаем загрузку моделей...');
      setError(null);
      setLoading(true);
      
      const response = await apiClient.get("/api/routes/models");
      console.log('Ответ сервера:', response.status, response.statusText);
      
      if (!response.status) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.data;
      console.log('Полученные данные:', data);
      
      if (Array.isArray(data)) {
        setModels(data);
      } else if (data.models && Array.isArray(data.models)) {
        setModels(data.models);
      } else if (data.data && Array.isArray(data.data)) {
        setModels(data.data);
      } else {
        console.warn('Неизвестный формат данных:', data);
        setModels([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при загрузке моделей';
      setError(errorMessage);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteModel = async (modelId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту модель?')) {
      return;
    }

    try {
      setDeletingModels(prev => new Set(prev).add(modelId));
      
      const response = await apiClient.delete(`/api/routes/models/${modelId}`);
      
      if (!response.status) {
        throw new Error(`Ошибка при удалении: ${response.status}`);
      }
      
      setModels(prev => prev.filter(model => model.id !== modelId));
      alert('Модель успешно удалена');
      
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Ошибка при удалении модели');
    } finally {
      setDeletingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    }
  };

  const toggleModelStatus = async (modelId: string, currentStatus: boolean) => {
    try {
      setTogglingModels(prev => new Set(prev).add(modelId));
      
      const endpoint = currentStatus ? 'deactivate' : 'activate';
      const response = await apiClient.post(`/api/routes/models/${modelId}/${endpoint}`);
      
      if (!response.data) {
        throw new Error(`Ошибка при изменении статуса: ${response.status}`);
      }
      
      setModels(prev =>
        prev.map(model =>
          model.id === modelId
            ? { ...model, is_active: !currentStatus }
            : model
        )
      );
      
      const action = currentStatus ? 'деактивирована' : 'активирована';
      alert(`Модель успешно ${action}`);
      
    } catch (err) {
      console.error('Toggle status error:', err);
      alert(err instanceof Error ? err.message : 'Ошибка при изменении статуса модели');
    } finally {
      setTogglingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const getModelTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      [ModelType.OBJECT_DETECTION]: 'Детекция',
      [ModelType.CLASSIFICATION]: 'Классификация',
      [ModelType.SEGMENTATION]: 'Сегментация',
      [ModelType.POSE_ESTIMATION]: 'Поза',
      [ModelType.OTHER]: 'Другое',
    };
    return typeMap[type] || type;
  };

  const getFrameworkLabel = (framework: string) => {
    const frameworkMap: Record<string, string> = {
      [ModelFramework.YOLO]: 'YOLO',
      [ModelFramework.TORCHVISION]: 'TorchVision',
      [ModelFramework.TENSORFLOW]: 'TensorFlow',
      [ModelFramework.PYTORCH]: 'PyTorch',
      [ModelFramework.ONNX]: 'ONNX',
      [ModelFramework.OTHER]: 'Другое',
    };
    return frameworkMap[framework] || framework;
  };

  const getBadgeVariant = (model: Model) => {
    return model.is_active ? 'default' : 'secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка моделей...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-red-500">Ошибка: {error}</div>
        <Button onClick={fetchModels}>Повторить попытку</Button>
      </div>
    );
  }

  return (
    <ModelsContext.Provider value={{ models, fetchModels }}>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Список моделей</h1>
              <p className="text-muted-foreground">
                Доступные модели для полуавтоматической разметки
              </p>
            </div>
            <AddModelForm onModelAdded={fetchModels} />
          </div>

          {models.length === 0 ? (
            <div className="text-center py-12">
              <Box className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Модели не найдены</p>
              <Button onClick={fetchModels} className="mt-4">
                Обновить список
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-8">
              {models.map((model) => {
                const isDeleting = deletingModels.has(model.id);
                const isToggling = togglingModels.has(model.id);
                
                return (
                  <Card key={model.id} className={isDeleting || isToggling ? 'opacity-50' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Box className="w-5 h-5" />
                          <div>
                            <CardTitle>{model.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">v{model.version}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleModelStatus(model.id, model.is_active)}
                            disabled={isDeleting || isToggling}
                            title={model.is_active ? 'Деактивировать модель' : 'Активировать модель'}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : model.is_active ? (
                              <Power className="w-4 h-4 text-green-600" />
                            ) : (
                              <PowerOff className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteModel(model.id)}
                            disabled={isDeleting || isToggling}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <CardDescription>{model.description || 'Без описания'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getBadgeVariant(model)}>
                          {model.is_active ? 'Активна' : 'Неактивна'}
                        </Badge>
                        <Badge variant="outline">
                          {getFrameworkLabel(model.framework)}
                        </Badge>
                        <Badge variant="outline">
                          {getModelTypeLabel(model.model_type)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Settings className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Размер:</span>
                          <span>
                            {model.input_size.width}×{model.input_size.height}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Порог:</span>
                          <span>{model.confidence_threshold.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {model.supported_classes && model.supported_classes.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Поддерживаемые классы:</p>
                          <div className="flex flex-wrap gap-1">
                            {model.supported_classes.slice(0, 4).map((className, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {className}
                              </Badge>
                            ))}
                            {model.supported_classes.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{model.supported_classes.length - 4} ещё
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            alert(`Используется модель: ${model.name}`);
                          }}
                          disabled={!model.is_active}
                        >
                          {model.is_active ? 'Использовать модель' : 'Модель неактивна'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModelsContext.Provider>
  );
}