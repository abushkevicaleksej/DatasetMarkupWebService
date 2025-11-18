import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Box, CheckCircle2 } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  description: string;
  status: 'активна' | 'неактивна';
  version: string;
}

const mockModels: Model[] = [
  {
    id: '1',
    name: 'GPT-4',
    description: 'Advanced language model for text generation and analysis',
    status: 'активна',
    version: '1.0.0',
  },
  {
    id: '2',
    name: 'Image Classifier',
    description: 'Convolutional neural network for image classification',
    status: 'активна',
    version: '2.1.0',
  },
  {
    id: '3',
    name: 'Sentiment Analyzer',
    description: 'Natural language processing model for sentiment analysis',
    status: 'неактивна',
    version: '1.5.2',
  },
  {
    id: '4',
    name: 'Object Detection',
    description: 'Real-time object detection and tracking model',
    status: 'активна',
    version: '3.0.1',
  },
];

export function ModelList() {
  const [models] = useState<Model[]>(mockModels);

  return (
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
                  {model.status === 'активна' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <CardDescription>{model.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={model.status === 'активна' ? 'default' : 'secondary'}>
                    {model.status}
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
          ))}
        </div>
      </div>
    </div>
  );
}