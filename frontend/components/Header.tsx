import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { ListTodo, Box, BookOpen, LogOut, LogIn, User, Shield } from 'lucide-react';
import { useAuth } from '../src/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
  <header className="border-t bg-background">
    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex gap-3">
        <Button
          onClick={() => navigate('/tasks')}
          variant={location.pathname === '/tasks' ? 'default' : 'outline'}
          className="flex items-center gap-2"
        >
          <ListTodo className="w-4 h-4" />
          Задачи
        </Button>
        <Button
          onClick={() => navigate('/models')}
          variant={location.pathname === '/models' ? 'default' : 'outline'}
          className="flex items-center gap-2"
        >
          <Box className="w-4 h-4" />
          Модели
        </Button>
        <Button
          onClick={() => navigate('/help')}
          variant={location.pathname === '/help' ? 'default' : 'outline'}
          className="flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Справка
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'admin' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('http://localhost:8000/admin', '_blank')}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Админ-панель
          </Button>
        ) : !isAuthenticated && (
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Войти
          </Button>
        )}

        {!isLoading && isAuthenticated && (
          <>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <User className="w-4 h-4" />
              <span>{user?.username}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </Button>
          </>
        )}
      </div>
    </div>
  </header>
  );
}