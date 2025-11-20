import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Upload, FileIcon, X, Loader2 } from 'lucide-react';

export function FileUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles([...selectedFiles, ...filesArray]);
      setError(null); 
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Пожалуйста, выберите файлы для загрузки');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8000/api/routes/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.detail || `Ошибка загрузки файла: ${response.status}`
          );
        }

        const result = await response.json();
        
        setUploadProgress(((index + 1) / selectedFiles.length) * 100);
        
        return result;
      });

      const results = await Promise.all(uploadPromises);
      
      console.log('Все файлы успешно загружены:', results);
      
      const redirectUrl = results[0]?.redirect_url || '/workspace';
      navigate(redirectUrl);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файлов');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSingleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Пожалуйста, выберите файлы для загрузки');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const file = selectedFiles[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/routes/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `Ошибка загрузки: ${response.status}`
        );
      }

      const result = await response.json();
      console.log('Файл успешно загружен:', result);

      const redirectUrl = result.redirect_url || '/workspace';
      navigate(redirectUrl);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="mb-2 text-3xl font-bold">Загрузите файлы</h1>
          <p className="text-muted-foreground">
            Выберите файлы для загрузки
          </p>
        </div>

        <div className="border-2 border-dashed rounded-2xl p-16 text-center bg-muted/30 hover:bg-muted/50 hover:border-primary transition-all">
          <input
            type="file"
            id="file-input"
            className="hidden"
            onChange={handleFileChange}
            multiple
            disabled={uploading}
          />
          <label
            htmlFor="file-input"
            className={`cursor-pointer flex flex-col items-center gap-4 ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <p className="mb-1">
                {uploading ? 'Загрузка...' : 'Перетащите файлы или откройте проводник'}
              </p>
              {uploading && uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            asChild 
            disabled={uploading}
          >
            <label htmlFor="file-input" className="cursor-pointer">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                'Выберите файлы'
              )}
            </label>
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <p className="font-medium">Выбранные файлы ({selectedFiles.length})</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={handleUpload} 
              className="w-full" 
              size="lg"
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Загрузка {selectedFiles.length} файлов...
                </>
              ) : (
                `Загрузить ${selectedFiles.length} ${getFileWord(selectedFiles.length)}`
              )}
            </Button>

            {selectedFiles.length > 1 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Или загрузите только первый файл
                </p>
                <Button 
                  onClick={handleSingleUpload} 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                  disabled={uploading}
                >
                  Загрузить только {selectedFiles[0]?.name}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getFileWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'файл';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'файла';
  return 'файлов';
}