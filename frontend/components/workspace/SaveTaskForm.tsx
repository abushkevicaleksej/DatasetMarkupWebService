import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { X, Save } from 'lucide-react';

interface SaveTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: { name: string; description: string; file_ids: string[] }) => void;
  fileIds: string[];
  loading?: boolean;
}

export function SaveTaskForm({ isOpen, onClose, onSave, fileIds, loading = false }: SaveTaskFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      file_ids: fileIds
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Save className="w-5 h-5" />
            Сохранить задачу
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-name">Название задачи *</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название задачи"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Описание</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание задачи (необязательно)"
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Будет сохранено файлов: <span className="font-medium">{fileIds.length}</span>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim() || loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}