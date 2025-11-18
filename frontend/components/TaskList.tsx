import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ListTodo, Clock, CheckCircle2} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'running' | 'completed' | 'rejected';
  model: string;
  createdAt: string;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Text Generation',
    description: 'Generate product descriptions from keywords',
    status: 'completed',
    model: 'GPT-4',
    createdAt: '2 hours ago',
  },
  {
    id: '2',
    title: 'Image Classification',
    description: 'Classify images from uploaded dataset',
    status: 'running',
    model: 'Image Classifier',
    createdAt: '1 hour ago',
  },
  {
    id: '3',
    title: 'Sentiment Analysis',
    description: 'Analyze customer feedback sentiment',
    status: 'rejected',
    model: 'Sentiment Analyzer',
    createdAt: '30 minutes ago',
  },
  {
    id: '4',
    title: 'Object Detection',
    description: 'Detect objects in video footage',
    status: 'running',
    model: 'Object Detection',
    createdAt: '3 hours ago',
  },
];

const statusConfig = {
  rejected: { icon: Clock, color: 'text-yellow-500', badge: 'secondary' },
  running: { icon: Clock, color: 'text-blue-500', badge: 'default' },
  completed: { icon: CheckCircle2, color: 'text-green-500', badge: 'default' },
};

export function TaskList() {
  const [tasks] = useState<Task[]>(mockTasks);

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2">Задачи</h1>
          </div>
          <Button>
            <ListTodo className="w-4 h-4 mr-2" />
            Новая задача
          </Button>
        </div>

        <div className="space-y-4 pb-8">
          {tasks.map((task) => {
            const StatusIcon = statusConfig[task.status].icon;
            
            return (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className={`w-5 h-5 ${statusConfig[task.status].color}`} />
                        <CardTitle>{task.title}</CardTitle>
                      </div>
                      <CardDescription>{task.description}</CardDescription>
                    </div>
                    <Badge variant={statusConfig[task.status].badge as any}>
                      {task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>Model: {task.model}</span>
                      <span>•</span>
                      <span>{task.createdAt}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Просмотр задачи
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}