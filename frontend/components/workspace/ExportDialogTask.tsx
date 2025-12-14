import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'; // Если у вас есть этот компонент

import { Download, Loader2, AlertCircle } from 'lucide-react';

interface ExportTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  taskName?: string;
}

export function ExportTaskDialog({ isOpen, onClose, taskId, taskName }: ExportTaskDialogProps) {
  const [format, setFormat] = useState('yolo');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!taskId) return;

    try {
      setIsExporting(true);
      setError(null);

      // Формируем URL. Обратите внимание на префикс /api/routes, который вы используете
      const response = await fetch(`http://localhost:8000/api/routes/api/tasks/${taskId}/export/${format}`);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Ошибка экспорта');
      }

      // Получаем blob (бинарные данные архива)
      const blob = await response.blob();
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Имя файла: TaskName_yolo.zip
      const safeName = (taskName || 'dataset').replace(/\s+/g, '_');
      a.download = `${safeName}_${format}.zip`;
      
      document.body.appendChild(a);
      a.click();
      
      // Чистим за собой
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Не удалось экспортировать проект');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isExporting && !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Экспорт датасета</DialogTitle>
          <DialogDescription>
            Скачать аннотации и изображения в архиве для обучения модели.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Формат
            </Label>
            <div className="col-span-3">
              {/* Если нет UI компонента Select, используем нативный */}
              <select 
                id="format"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                disabled={isExporting}
              >
                <option value="yolo">YOLO v5 / v8 / v11 (TXT)</option>
                <option value="coco" disabled>COCO JSON (Скоро)</option>
                <option value="voc" disabled>Pascal VOC XML (Скоро)</option>
              </select>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !taskId}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Архивация...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Скачать ZIP
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}