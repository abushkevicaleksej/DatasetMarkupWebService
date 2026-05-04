import { Navigate } from 'react-router-dom';
import { useAuth } from '../src/AuthContext';

export function RequireAuth({ children }: { children: React.JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Загрузка...</div>;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return children;
}