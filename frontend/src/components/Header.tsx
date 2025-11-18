import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { ListTodo, Box } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-3 justify-left">
          <Button
            onClick={() => navigate('/tasks')}
            variant={location.pathname === '/tasks' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <ListTodo className="w-4 h-4" />
            Tasks
          </Button>
          <Button
            onClick={() => navigate('/models')}
            variant={location.pathname === '/models' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Box className="w-4 h-4" />
            Models
          </Button>
        </div>
      </div>
    </footer>
  );
}
