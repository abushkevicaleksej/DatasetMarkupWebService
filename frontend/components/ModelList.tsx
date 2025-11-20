import { useState, useEffect, createContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Box, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  version: string;
  description: string;
  is_active: boolean; // изменено с string на boolean
  status?: string; // добавлено опциональное поле
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

  const fetchModels = async () => {
    try {
      console.log('Начинаем загрузку моделей...');
      setError(null);
      setLoading(true);
      
      const response = await fetch("http://localhost:8000/api/routes/models"); // исправлен URL
      console.log('Ответ сервера:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Полученные данные:', data);
      
      // Обрабатываем разные форматы ответа
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
      
      const response = await fetch(`http://localhost:8000/api/routes/models/${modelId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
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

  useEffect(() => {
    fetchModels();
  }, []);

  // Функция для получения статуса модели
  const getModelStatus = (model: Model) => {
    if (model.status) return model.status;
    return model.is_active ? 'активна' : 'неактивна';
  };

  // Функция для получения варианта бейджа
  const getBadgeVariant = (model: Model) => {
    if (model.status === 'активна' || model.is_active) return 'default';
    return 'secondary';
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
              <h1 className="mb-2 text-3xl font-bold">Список моделей</h1> {/* Добавлены стили */}
              <p className="text-muted-foreground">
                Доступные модели для полуавтоматической разметки
              </p>
            </div>
            <Button>
              <Box className="w-4 h-4 mr-2" />
              Добавить модель
            </Button>
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
                
                return (
                  <Card key={model.id} className={isDeleting ? 'opacity-50' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Box className="w-5 h-5" />
                          <CardTitle>{model.name}</CardTitle>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteModel(model.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <CardDescription>{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getBadgeVariant(model)}>
                          {getModelStatus(model)}
                        </Badge>
                        <span className="text-muted-foreground">v{model.version}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          Использовать модель
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