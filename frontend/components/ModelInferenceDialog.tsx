import { useState, useEffect, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Loader2, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import { mlApi, MLModel } from './types/ml';
import { AnnotationsContext } from './workspace/AnnotationsContext';

interface ModelInferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFileId: string | null;
  allFileIds: string[];
  taskId?: string | null;
}

export function ModelInferenceDialog({
  open,
  onOpenChange,
  currentFileId,
  allFileIds,
  taskId
}: ModelInferenceDialogProps) {
  // Получаем доступ к функции обновления аннотаций из контекста
  const context = useContext(AnnotationsContext);
  
  const [models, setModels] = useState<MLModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Состояние формы
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(50);
  const [scope, setScope] = useState<'current' | 'all'>('current');

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open]);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const data = await mlApi.getModels();
      setModels(data);
      // Выбираем активную модель или первую попавшуюся
      const activeModel = data.find(m => m.is_active) || data[0];
      if (activeModel) {
        setSelectedModelId(activeModel.id);
        setConfidence(activeModel.confidence_threshold * 100);
      }
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить список моделей');
    } finally {
      setLoadingModels(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedModelId) {
      alert('Выберите модель');
      return;
    }

    if (scope === 'current' && !currentFileId) {
      alert('Файл не выбран');
      return;
    }

    const filesToProcess = scope === 'current' && currentFileId 
      ? [currentFileId] 
      : allFileIds;

    if (filesToProcess.length === 0) {
      alert('Нет файлов для обработки');
      return;
    }

    setProcessing(true);
    try {
      const results = await mlApi.predict({
        model_id: selectedModelId,
        file_ids: filesToProcess,
        confidence_threshold: confidence / 100,
        max_predictions: filesToProcess.length,
        task_id: taskId
      });

      console.log(`Обработано файлов: ${results.length}`);
      
      // Обновляем аннотации для текущего файла
      if (currentFileId && context) {
        await context.loadAnnotationsForFile(currentFileId);
      }
      
      onOpenChange(false);
      // alert(`Успешно обработано изображений: ${results.length}`);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Ошибка при обработке');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={processing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            AI Детекция
          </DialogTitle>
          <DialogDescription>
            Автоматический поиск объектов с помощью ML моделей.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Выбор модели */}
          <div className="grid gap-2">
            <Label htmlFor="model">Модель</Label>
            {loadingModels ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка списка...
              </div>
            ) : (
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Выберите модель" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} (v{model.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedModelId && (
               <p className="text-xs text-muted-foreground">
                 Классы: {models.find(m => m.id === selectedModelId)?.supported_classes.join(', ')}
               </p>
            )}
          </div>

          {/* Порог уверенности */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="confidence">Порог уверенности (Confidence)</Label>
              <span className="text-sm font-medium text-muted-foreground">{confidence}%</span>
            </div>
            <Slider
              id="confidence"
              min={1}
              max={100}
              step={1}
              value={[confidence]}
              onValueChange={(vals) => setConfidence(vals[0])}
            />
          </div>

          {/* Область действия */}
          <div className="grid gap-2">
            <Label>Область обработки</Label>
            <RadioGroup 
              value={scope} 
              onValueChange={(v) => setScope(v as 'current' | 'all')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="current" id="r1" />
                <Label htmlFor="r1" className="cursor-pointer text-sm">Текущий файл</Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="all" id="r2" />
                <Label htmlFor="r2" className="cursor-pointer text-sm">
                  Все файлы ({allFileIds.length})
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Отмена
          </Button>
          <Button onClick={handlePredict} disabled={processing || loadingModels || !selectedModelId}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {processing ? 'Обработка...' : 'Запустить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}