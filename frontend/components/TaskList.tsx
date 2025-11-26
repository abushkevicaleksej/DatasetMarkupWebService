import { createContext, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ListTodo, Clock, CheckCircle2, Trash2, Loader2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'rejected';
  file_count: number;
  annotation_count: number;
  created_at: string;
  updated_at: string;
}

const TasksContext = createContext<{
  tasks: Task[];
  fetchTasks: () => void;
}>({
  tasks: [],
  fetchTasks: () => {},
});

const statusConfig = {
  rejected: { icon: Clock, color: 'text-yellow-500', badge: 'secondary' },
  running: { icon: Clock, color: 'text-blue-500', badge: 'default' },
  completed: { icon: CheckCircle2, color: 'text-green-500', badge: 'default' },
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTasks, setDeletingTasks] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch("http://localhost:8000/api/routes/api/tasks");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке задач');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }

    try {
      setDeletingTasks(prev => new Set(prev).add(taskId));
      
      const response = await fetch(`http://localhost:8000/api/routes/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при удалении: ${response.status}`);
      }
      
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      alert('Задача успешно удалена');
      
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Ошибка при удалении задачи');
    } finally {
      setDeletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleViewTask = (taskId: string) => {
    navigate(`/workspace?taskId=${taskId}`);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка задач...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-red-500">Ошибка: {error}</div>
        <Button onClick={fetchTasks}>Повторить попытку</Button>
      </div>
    );
  }

  return (
    <TasksContext.Provider value={{ tasks, fetchTasks }}>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Задачи</h1>
            </div>
            <Button onClick={() => navigate('/workspace')}>
              <ListTodo className="w-4 h-4 mr-2" />
              Новая задача
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Нет задач для отображения</p>
            </div>
          ) : (
            <div className="space-y-4 pb-8">
              {tasks.map((task) => {
                const StatusIcon = statusConfig[task.status]?.icon || Clock;
                const statusStyle = statusConfig[task.status] || statusConfig.running;
                const isDeleting = deletingTasks.has(task.id);
                
                return (
                  <Card key={task.id} className={isDeleting ? 'opacity-50' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{task.name}</CardTitle>
                            <Badge variant={statusStyle.badge as 'default' | 'secondary'}>
                              <StatusIcon className={`w-4 h-4 mr-1 ${statusStyle.color}`} />
                              {task.status === 'running' && 'В работе'}
                              {task.status === 'completed' && 'Завершено'}
                              {task.status === 'rejected' && 'Отклонено'}
                            </Badge>
                          </div>
                          <CardDescription>{task.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>Создано: {new Date(task.created_at).toLocaleDateString()}</span>
                          <span>Обновлено: {new Date(task.updated_at).toLocaleDateString()}</span>
                          <span>Файлов: {task.file_count}</span>
                          <span>Аннотаций: {task.annotation_count}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewTask(task.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Просмотр задачи
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-1" />
                            )}
                            {isDeleting ? 'Удаление...' : 'Удалить'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TasksContext.Provider>
  );
}