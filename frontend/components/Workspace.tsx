import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WorkspaceToolbar } from './workspace/WorkspaceToolbar';
import { WorkspaceCanvas } from './workspace/WorkspaceCanvas';
import { AnnotationList } from './workspace/AnnotationList';
import { FileList } from './workspace/FileList';
import { WorkspaceNavigation } from './workspace/WorkspaceNavigation';
import { SaveTaskForm } from './workspace/SaveTaskForm';
import { AnnotationsProvider } from './workspace/AnnotationsContext';

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
  const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'erase' | 'move'>('select');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskResponse | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');

  const fetchTaskFiles = async (taskId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/routes/api/tasks/${taskId}/files`);
      
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
      console.error('Error fetching task files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFiles = async () => {
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
      console.error('Error fetching all files:', err);
    } finally {
      setLoading(false);
    }
  };

  // const fetchTaskInfo = async (taskId: string) => {
  //   try {
  //     const response = await fetch(`http://localhost:8000/api/routes/api/tasks/${taskId}`);
      
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
      
  //     const task: TaskResponse = await response.json();
  //     setCurrentTask(task);
  //   } catch (err) {
  //     console.error('Error fetching task info:', err);
  //   }
  // };

  const handleSaveTask = async (taskData: TaskCreateRequest) => {
    try {
      setSavingTask(true);
      
      const response = await fetch('http://localhost:8000/api/routes/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при создании задачи');
      }

      const createdTask: TaskResponse = await response.json();
      
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
      // fetchTaskInfo(taskId);
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
        {currentTask && (
          <div className="bg-primary/10 border-b px-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{currentTask.name}</h2>
                {currentTask.description && (
                  <p className="text-sm text-muted-foreground">{currentTask.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>Статус: {currentTask.status}</span>
                <span>Файлов: {currentTask.file_count}</span>
                <span>Аннотаций: {currentTask.annotation_count}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <WorkspaceToolbar 
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onSaveClick={handleSaveClick}
            hasFiles={files.length > 0}
            isTaskView={!!taskId}
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

        {!taskId && (
          <SaveTaskForm
            isOpen={showSaveForm}
            onClose={() => setShowSaveForm(false)}
            onSave={handleSaveTask}
            fileIds={fileIds}
            loading={savingTask}
          />
        )}
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