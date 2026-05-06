import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Loader2, FlaskConical } from 'lucide-react';
import apiClient from '../../src/client';

interface MLModel {
  id: string;
  name: string;
  is_active?: boolean;
}

interface ActiveLearningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onBatchReceived: (files: any[]) => void;
}

export function ActiveLearningDialog({
  isOpen,
  onClose,
  taskId,
  onBatchReceived,
}: ActiveLearningDialogProps) {
  const [models, setModels] = useState<MLModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [batchSize, setBatchSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchModels = async () => {
      try {
        setLoadingModels(true);
        const response = await apiClient.get('/api/routes/models');
        if (response.data) {
          const raw = Array.isArray(response.data) ? response.data : response.data.models || [];
          const mapped: MLModel[] = raw.map((m: any) => ({
            id: m.id,
            name: m.name || m.model_path || m.id,
            is_active: m.is_active,
          }));
          setModels(mapped);
          // Если есть активная модель, выберем её по умолчанию
          const active = mapped.find((m) => m.is_active);
          if (active) setSelectedModelId(active.id);
        }
      } catch (err) {
        console.error('Failed to load models:', err);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [isOpen]);

  const handleRequestBatch = async () => {
    if (!selectedModelId) {
      setError('Выберите модель');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get(
        `api/routes/api/tasks/${taskId}/active-learning/next`,
        {
          params: {
            model_id: selectedModelId,
            batch_size: batchSize,
          },
        }
      );

      if (response.status === 200) {
        onBatchReceived(response.data);
        onClose();
      } else {
        const detail = response.data?.detail || 'Ошибка получения данных';
        setError(detail);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Ошибка соединения';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Active Learning
          </DialogTitle>
          <DialogDescription>
            Получить наиболее неуверенные файлы для разметки.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="modelId" className="text-right">
              Модель
            </Label>
            <Select
              value={selectedModelId}
              onValueChange={setSelectedModelId}
              disabled={isLoading || loadingModels}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Выберите модель..." />
              </SelectTrigger>
              <SelectContent>
                {loadingModels ? (
                  <SelectItem value="loading" disabled>
                    Загрузка...
                  </SelectItem>
                ) : models.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Модели не найдены
                  </SelectItem>
                ) : (
                  models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="batchSize" className="text-right">
              Размер батча
            </Label>
            <Input
              id="batchSize"
              type="number"
              className="col-span-3"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
              min={1}
              max={50}
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleRequestBatch} disabled={isLoading || !selectedModelId}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="mr-2 h-4 w-4" />
            )}
            Получить файлы
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}