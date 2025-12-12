import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Loader2, Plus } from 'lucide-react';

interface AddModelFormProps {
  onModelAdded: () => void;
}

interface ModelFormData {
  name: string;
  version: string;
  description: string;
  model_path: string;
  is_active: boolean;
}

export function AddModelForm({ onModelAdded }: AddModelFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ModelFormData>({
    name: '',
    version: '',
    description: '',
    model_path: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/routes/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при создании модели');
      }

      const newModel = await response.json();
      console.log('Модель создана:', newModel);
      
      setOpen(false);
      setFormData({
        name: '',
        version: '',
        description: '',
        model_path: '',
        is_active: true,
      });
      
      onModelAdded();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при создании модели';
      setError(errorMessage);
      console.error('Create model error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ModelFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Добавить модель
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить новую модель</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
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

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Описание модели и её возможностей"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_path">Путь к модели *</Label>
            <Input
              id="model_path"
              value={formData.model_path}
              onChange={(e) => handleChange('model_path', e.target.value)}
              placeholder="/path/to/model.pt"
              required
            />
            <p className="text-sm text-muted-foreground">
              Абсолютный путь к файлу модели на сервере
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is_active" className="flex flex-col space-y-1">
              <span>Статус активности</span>
              <span className="font-normal text-sm text-muted-foreground">
                Активная модель будет доступна для использования
              </span>
            </Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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