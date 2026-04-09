import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Loader2, Plus } from 'lucide-react';
import { TagsInput } from './TagsInput';
import { ModelType, ModelFramework, ModelFormData, InputSize } from './types/ml-types';
import { Alert, AlertDescription } from './ui/alert';

interface AddModelFormProps {
  onModelAdded: () => void;
}

const defaultInputSize: InputSize = { width: 640, height: 640 };

export function AddModelForm({ onModelAdded }: AddModelFormProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ModelFormData>({
    name: '',
    version: '',
    model_type: ModelType.OBJECT_DETECTION,
    framework: ModelFramework.YOLO,
    description: '',
    model_path: '',
    config_path: '',
    supported_classes: [],
    input_size: defaultInputSize,
    confidence_threshold: 0.5,
    is_active: false,
  });

  const handleValidate = async () => {
    const path = formData.model_path.trim();
    if (!path) {
      setValidationMessage('Укажите путь к модели');
      setIsValid(false);
      return;
    }
    setIsValidating(true);
    setValidationMessage(null);
    try {
      const response = await fetch('http://localhost:8000/api/routes/models/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model_path: path,
          framework: formData.framework,
         }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.valid) {
          setIsValid(true);
          setValidationMessage('Модель прошла проверку ✓');
        } else {
          setIsValid(false);
          setValidationMessage(`Ошибка: ${data.message}`);
        }
      } else {
        setIsValid(false);
        setValidationMessage(`Ошибка: ${data.detail || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      setIsValid(false);
      setValidationMessage('Не удалось подключиться к серверу валидации');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      alert('Сначала проверьте модель');
      return;
    }
    setLoading(true);
    setError(null);

    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('Название модели обязательно');
    if (!formData.version.trim()) errors.push('Версия модели обязательна');
    if (!formData.model_path.trim()) errors.push('Путь к модели обязателен');
    if (formData.supported_classes.length === 0) errors.push('Добавьте хотя бы один поддерживаемый класс');
    
    if (formData.input_size.width <= 0 || formData.input_size.height <= 0) {
      errors.push('Размеры входного изображения должны быть положительными числами');
    }

    if (formData.confidence_threshold < 0 || formData.confidence_threshold > 1) {
      errors.push('Порог уверенности должен быть между 0 и 1');
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
      setLoading(false);
      return;
    }

    const hasInvalidClass = formData.supported_classes.some(
      className => className.length > 50 || className.length === 0
    );
    
    if (hasInvalidClass) {
      setError('Длина каждого класса должна быть от 1 до 50 символов');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/routes/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          supported_classes: [...new Set(formData.supported_classes)],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при создании модели');
      }

      const newModel = await response.json();
      console.log('Модель создана:', newModel);
      
      setOpen(false);
      resetForm();
      onModelAdded();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при создании модели';
      setError(errorMessage);
      console.error('Create model error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      version: '',
      model_type: ModelType.OBJECT_DETECTION,
      framework: ModelFramework.YOLO,
      description: '',
      model_path: '',
      config_path: '',
      supported_classes: [],
      input_size: defaultInputSize,
      confidence_threshold: 0.5,
      is_active: false,
    });
    setError(null);
    setValidationMessage(null);
    setIsValid(false);
  };

  const handleChange = (field: keyof Omit<ModelFormData, 'supported_classes' | 'input_size'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'model_path') {
      setValidationMessage(null);
      setIsValid(false);
    }
  };

  const handleInputSizeChange = (field: keyof InputSize, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      input_size: {
        ...prev.input_size,
        [field]: numValue,
      },
    }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      supported_classes: tags,
    }));
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(resetForm, 300);
    }
  };

  const modelTypeOptions = [
    { value: ModelType.OBJECT_DETECTION, label: 'Детекция объектов' },
    { value: ModelType.CLASSIFICATION, label: 'Классификация' },
    { value: ModelType.SEGMENTATION, label: 'Сегментация' },
    { value: ModelType.POSE_ESTIMATION, label: 'Оценка позы' },
    { value: ModelType.OTHER, label: 'Другое' },
  ];

  const frameworkOptions = [
    { value: ModelFramework.YOLO, label: 'YOLO' },
    { value: ModelFramework.TORCHVISION, label: 'TorchVision' },
    { value: ModelFramework.TENSORFLOW, label: 'TensorFlow' },
    { value: ModelFramework.PYTORCH, label: 'PyTorch' },
    { value: ModelFramework.ONNX, label: 'ONNX' },
    { value: ModelFramework.OTHER, label: 'Другое' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Добавить модель
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить новую модель</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm whitespace-pre-line">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название модели *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Например: YOLOv8n"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Версия *</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
                placeholder="Например: 1.0.0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model_type">Тип модели *</Label>
              <Select
                value={formData.model_type}
                onValueChange={(value: ModelType) => handleChange('model_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип модели" />
                </SelectTrigger>
                <SelectContent>
                  {modelTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="framework">Фреймворк *</Label>
              <Select
                value={formData.framework}
                onValueChange={(value: ModelFramework) => handleChange('framework', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите фреймворк" />
                </SelectTrigger>
                <SelectContent>
                  {frameworkOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Описание модели и её возможностей"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model_path">Путь к модели *</Label>
              <Input
                id="model_path"
                value={formData.model_path}
                onChange={(e) => handleChange('model_path', e.target.value)}
                placeholder="/path/to/model.pt"
                required
              />
              <p className="text-xs text-muted-foreground">
                Абсолютный путь к файлу модели на сервере
              </p>
              <Button type="button" onClick={handleValidate} disabled={isValidating}>
                {isValidating ? 'Проверка...' : 'Проверить модель'}
              </Button>
              {validationMessage && (
                <Alert variant={isValid ? 'default' : 'destructive'}>
                  <AlertDescription>{validationMessage}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="config_path">Путь к конфигурации</Label>
              <Input
                id="config_path"
                value={formData.config_path}
                onChange={(e) => handleChange('config_path', e.target.value)}
                placeholder="/path/to/config.yaml"
              />
              <p className="text-xs text-muted-foreground">
                Опционально, для некоторых фреймворков
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="input_width">Ширина входного изображения *</Label>
                <Input
                  id="input_width"
                  type="number"
                  min="1"
                  value={formData.input_size.width}
                  onChange={(e) => handleInputSizeChange('width', e.target.value)}
                  placeholder="640"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="input_height">Высота входного изображения *</Label>
                <Input
                  id="input_height"
                  type="number"
                  min="1"
                  value={formData.input_size.height}
                  onChange={(e) => handleInputSizeChange('height', e.target.value)}
                  placeholder="640"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Размер входного изображения для модели (в пикселях)
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="confidence_threshold">
                  Порог уверенности по умолчанию *
                </Label>
                <span className="text-sm font-medium">
                  {formData.confidence_threshold.toFixed(2)}
                </span>
              </div>
              <Slider
                id="confidence_threshold"
                min={0}
                max={1}
                step={0.01}
                value={[formData.confidence_threshold]}
                onValueChange={([value]) => handleChange('confidence_threshold', value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (низкий)</span>
                <span>0.5</span>
                <span>1 (высокий)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <TagsInput
              value={formData.supported_classes}
              onChange={handleTagsChange}
              label="Поддерживаемые классы *"
              description="Классы объектов, которые может распознавать модель"
            />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Количество классов: {formData.supported_classes.length}
              </span>
              {formData.supported_classes.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTagsChange([])}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Очистить все
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <Label htmlFor="is_active" className="flex flex-col space-y-1">
              <span className="font-medium">Активность модели</span>
              <span className="font-normal text-sm text-muted-foreground">
                Активная модель будет доступна для использования в проектах
              </span>
            </Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать модель'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}