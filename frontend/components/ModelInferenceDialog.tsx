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
import { Input } from './ui/input'; // Предполагаем наличие компонента Input
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'; // Нужны компоненты Tabs из shadcn/ui
import { Loader2, BrainCircuit, GraduationCap, Play } from 'lucide-react';
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
  const context = useContext(AnnotationsContext);
  
  const [models, setModels] = useState<MLModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // Состояния
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'predict' | 'train'>('predict');

  // Состояние Predict
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(50);
  const [scope, setScope] = useState<'current' | 'all'>('current');

  // Состояние Train
  const [epochs, setEpochs] = useState<number>(10);
  const [learningRate, setLearningRate] = useState<string>('0.001');

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
      const activeModel = data.find(m => m.is_active) || data[0];
      if (activeModel) {
        setSelectedModelId(activeModel.id);
        setConfidence(activeModel.confidence_threshold * 100);
      }
    } catch (error) {
      console.error(error);
      toast.error('Не удалось загрузить список моделей');
    } finally {
      setLoadingModels(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedModelId) return toast.error('Выберите модель');
    
    const filesToProcess = scope === 'current' && currentFileId 
      ? [currentFileId] 
      : allFileIds;

    if (filesToProcess.length === 0) return toast.error('Нет файлов для обработки');

    setProcessing(true);
    try {
      const results = await mlApi.predict({
        model_id: selectedModelId,
        file_ids: filesToProcess,
        confidence_threshold: confidence / 100,
        max_predictions: filesToProcess.length,
        task_id: taskId
      });

      if (currentFileId && context) {
        await context.loadAnnotationsForFile(currentFileId);
      }
      
      toast.success(`Обработано файлов: ${results.length}`);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при обработке');
    } finally {
      setProcessing(false);
    }
  };

  const handleTrain = async () => {
    if (!selectedModelId) return toast.error('Выберите модель для дообучения');
    if (!taskId) return toast.error('Обучение возможно только внутри задачи');

    setProcessing(true);
    try {
      const response = await mlApi.train({
        model_id: selectedModelId,
        task_id: taskId,
        epochs: epochs,
        batch_size: 8, // Можно вынести в UI при желании
        learning_rate: parseFloat(learningRate) || 0.001
      });

      toast.success('Обучение запущено в фоновом режиме');
      console.log('Training session:', response.session_id);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Не удалось запустить обучение');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={processing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activeTab === 'predict' ? (
              <BrainCircuit className="w-5 h-5 text-primary" />
            ) : (
              <GraduationCap className="w-5 h-5 text-orange-500" />
            )}
            {activeTab === 'predict' ? 'AI Детекция' : 'Дообучение модели'}
          </DialogTitle>
          <DialogDescription>
            {activeTab === 'predict' 
              ? 'Автоматический поиск объектов с помощью ML моделей.'
              : 'Улучшение модели на основе размеченных данных текущей задачи.'}
          </DialogDescription>
        </DialogHeader>

        {/* Простой переключатель вкладок, если нет компонента Tabs, 
            но ниже пример с использованием Tabs из shadcn/ui */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'predict' | 'train')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="predict">Детекция</TabsTrigger>
            <TabsTrigger value="train" disabled={!taskId}>Обучение</TabsTrigger>
          </TabsList>

          <div className="space-y-4 py-2">
            {/* Общий селект модели для обоих табов */}
            <div className="grid gap-2">
              <Label htmlFor="model">Базовая модель</Label>
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
            </div>

            <TabsContent value="predict" className="space-y-4 mt-0">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="confidence">Порог уверенности</Label>
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
            </TabsContent>

            <TabsContent value="train" className="space-y-4 mt-0">
              {!taskId ? (
                <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md text-sm text-destructive">
                  Для обучения необходимо находиться внутри задачи с размеченными данными.
                </div>
              ) : (
                <>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="epochs">Количество эпох: {epochs}</Label>
                    </div>
                    <Slider
                      id="epochs"
                      min={1}
                      max={100}
                      step={1}
                      value={[epochs]}
                      onValueChange={(vals) => setEpochs(vals[0])}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                      Больше эпох = точнее результат, но дольше обучение.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="lr">Learning Rate</Label>
                    <Input 
                      id="lr" 
                      type="number" 
                      step="0.0001"
                      value={learningRate}
                      onChange={(e) => setLearningRate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Отмена
          </Button>
          
          {activeTab === 'predict' ? (
            <Button onClick={handlePredict} disabled={processing || loadingModels || !selectedModelId}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processing ? 'Обработка...' : 'Запустить'}
            </Button>
          ) : (
            <Button 
              onClick={handleTrain} 
              disabled={processing || loadingModels || !selectedModelId || !taskId}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processing ? 'Запуск...' : 'Начать обучение'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}