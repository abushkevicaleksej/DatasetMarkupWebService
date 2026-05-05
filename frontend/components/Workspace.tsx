import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WorkspaceToolbar } from './workspace/WorkspaceToolbar';
import { WorkspaceCanvas } from './workspace/WorkspaceCanvas';
import { AnnotationList } from './workspace/AnnotationList';
import { FileList } from './workspace/FileList';
import { WorkspaceNavigation } from './workspace/WorkspaceNavigation';
import { ExportTaskDialog } from './workspace/ExportDialogTask';
import { SaveTaskForm } from './workspace/SaveTaskForm';
import { AnnotationsProvider } from './workspace/AnnotationsContext';
import { ModelInferenceDialog } from '../components/ModelInferenceDialog';
import apiClient from '../src/client';

interface WorkspaceFile {
  id: string;
  name: string;
  type: 'image';
  size: string;
  active: boolean;
  file_path?: string;
}

interface TaskCreateRequest {
  name: string;
  description?: string;
  file_ids: string[];
}

interface TaskResponse {
  id: string;
  name: string;
  description?: string;
  status: string;
  file_count: number;
  annotation_count: number;
  created_at: string;
  updated_at: string;
}

export function Workspace() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'erase' | 'move' | 'auto'>('select');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskResponse | null>(null);
  
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');

  const fetchTaskFiles = async (taskId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/tasks/${taskId}/files`);
      
      if (!response.status) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiFiles = await response.data;
      
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
      console.error('Error fetching task files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFiles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/routes/files');
      
      if (!response.status) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiFiles = await response.data;
      
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
      console.error('Error fetching all files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (taskData: TaskCreateRequest) => {
    try {
      setSavingTask(true);
      
      const response = await apiClient.post('/api/routes/api/tasks');

      if (!response.status) {
        const errorData = await response.data;
        throw new Error(errorData.detail || 'Ошибка при создании задачи');
      }

      const createdTask: TaskResponse = await response.data;
      
      console.log('Задача успешно создана:', createdTask);
      
      setShowSaveForm(false);
      
      setSearchParams({ taskId: createdTask.id });
      
    } catch (error) {
      console.error('Error saving task:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при сохранении задачи');
    } finally {
      setSavingTask(false);
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

  const handleSaveClick = () => {
    if (files.length === 0) {
      alert('Нет файлов для сохранения в задаче');
      return;
    }
    setShowSaveForm(true);
  };

  const handleRefreshFiles = () => {
    if (taskId) {
      fetchTaskFiles(taskId);
    } else {
      fetchAllFiles();
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskFiles(taskId);
    } else {
      fetchAllFiles();
      setCurrentTask(null);
    }
  }, [taskId]);

  const currentFile = files.find(file => file.id === currentFileId) || null;
  const fileIds = files.map(file => file.id);

  return (
    <AnnotationsProvider>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <WorkspaceToolbar 
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onSaveClick={handleSaveClick}
            hasFiles={files.length > 0}
            isTaskView={!!taskId}
            onOpenModelDialog={() => setIsModelDialogOpen(true)}
            onOpenExportDialog={() => setIsExportDialogOpen(true)}
          />
          
          <WorkspaceCanvas 
            currentFile={currentFile} 
            activeTool={activeTool}
            taskId={taskId}
          />
          
          <div className="w-80 flex flex-col gap-4">
            <AnnotationList taskId={taskId} currentFileId={currentFile?.id} />
            <FileList 
              files={files}
              currentFileId={currentFileId}
              onFileSelect={handleFileSelect}
              onRefresh={handleRefreshFiles}
              loading={loading}
              isTaskView={!!taskId}
            />
          </div>
        </div>
        
        <WorkspaceNavigation 
          files={files}
          currentFileId={currentFileId}
          onFileChange={handleFileChange}
        />

        <SaveTaskForm
          isOpen={showSaveForm}
          onClose={() => setShowSaveForm(false)}
          onSave={handleSaveTask}
          fileIds={fileIds}
          loading={savingTask}
        />

        <ExportTaskDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          taskId={taskId}
          taskName={currentTask?.name}
        />

        <ModelInferenceDialog 
          open={isModelDialogOpen}
          onOpenChange={setIsModelDialogOpen}
          currentFileId={currentFileId}
          allFileIds={fileIds}
          taskId={taskId}
        />
      </div>
    </AnnotationsProvider>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}