import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/AuthContext';
import { ADMIN_URL } from '../src/config';

export function AdminRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }

    const newTab = window.open(ADMIN_URL, '_blank');

    if (newTab) {
      navigate(-1);
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">
        Админ-панель открыта в новой вкладке.
      </p>
    </div>
  );
}