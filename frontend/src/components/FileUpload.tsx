import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Upload, FileIcon, X } from 'lucide-react';

export function FileUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles([...selectedFiles, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      // Handle file upload logic here
      console.log('Uploading files:', selectedFiles);
      // Navigate to workspace after upload
      navigate('/workspace');
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="mb-2">Upload Files</h1>
          <p className="text-muted-foreground">
            Select files to upload and process
          </p>
        </div>

        {/* File upload area */}
        <div className="border-2 border-dashed rounded-2xl p-16 text-center bg-muted/30 hover:bg-muted/50 hover:border-primary transition-all">
          <input
            type="file"
            id="file-input"
            className="hidden"
            onChange={handleFileChange}
            multiple
          />
          <label
            htmlFor="file-input"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-muted-foreground">
                Support for multiple files
              </p>
            </div>
          </label>
        </div>

        {/* Select Files button */}
        <div className="flex justify-center">
          <Button size="lg" asChild>
            <label htmlFor="file-input" className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </div>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <p>Selected Files ({selectedFiles.length})</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{file.name}</p>
                    <p className="text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button onClick={handleUpload} className="w-full" size="lg">
              Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}