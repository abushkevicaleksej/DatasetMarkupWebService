import { useState, useEffect } from 'react';
import { WorkspaceToolbar } from './workspace/WorkspaceToolbar';
import { WorkspaceCanvas } from './workspace/WorkspaceCanvas';
import { AnnotationList } from './workspace/AnnotationList';
import { FileList } from './workspace/FileList';
import { WorkspaceNavigation } from './workspace/WorkspaceNavigation';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image';
  size: string;
  active: boolean;
  file_path?: string;
}

export function Workspace() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'erase' | 'move'>('select');

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/routes/files');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiFiles = await response.json();
      
      const workspaceFiles: WorkspaceFile[] = apiFiles.map((apiFile: any, index: number) => ({
        id: apiFile.id,
        name: apiFile.original_filename,
        type: 'image',
        size: formatFileSize(apiFile.file_size),
        active: index === 0,
        file_path: apiFile.file_path
      }));
      
      setFiles(workspaceFiles);
      if (workspaceFiles.length > 0) {
        setCurrentFileId(workspaceFiles[0].id);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setCurrentFileId(fileId);
    setFiles(prevFiles => 
      prevFiles.map(file => ({
        ...file,
        active: file.id === fileId
      }))
    );
  };

  const handleFileChange = (fileId: string) => {
    handleFileSelect(fileId);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const currentFile = files.find(file => file.id === currentFileId) || null;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <WorkspaceToolbar activeTool={activeTool} setActiveTool={setActiveTool} />
        
        <WorkspaceCanvas 
          currentFile={currentFile} 
          activeTool={activeTool}
        />
        
        <div className="w-80 flex flex-col gap-4">
          <AnnotationList />
          <FileList 
            files={files}
            currentFileId={currentFileId}
            onFileSelect={handleFileSelect}
            onRefresh={fetchFiles}
            loading={loading}
          />
        </div>
      </div>
      
      <WorkspaceNavigation 
        files={files}
        currentFileId={currentFileId}
        onFileChange={handleFileChange}
      />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}