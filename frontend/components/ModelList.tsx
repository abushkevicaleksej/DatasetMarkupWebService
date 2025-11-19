import { useState, useEffect, createContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Box, CheckCircle2 } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  version: string;
  description: string;
  is_active: string;
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
      setError(null);
      setLoading(true);
      
      const response = await fetch("http://localhost:8000/api/routes/models");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке моделей');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

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
    <ModelsContext.Provider value={{ models, fetchModels}}>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2">Список моделей</h1>
              <p className="text-muted-foreground">
                Доступные модели для полуавтоматической разметки
              </p>
            </div>
            <Button>
              <Box className="w-4 h-4 mr-2" />
              Добавить модель
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-8">
            
            {models.map((model) => (
              <Card key={model.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Box className="w-5 h-5" />
                      <CardTitle>{model.name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription>{model.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {/* <Badge variant={model.status === 'активна' ? 'default' : 'secondary'}>
                      {model.status}
                    </Badge> */}
                    <span className="text-muted-foreground">v{model.version}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      Использовать модель
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ModelsContext.Provider>
  );
}