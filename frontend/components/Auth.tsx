import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../src/AuthContext';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        await register(formData.username, formData.email, formData.password);
      }
      navigate('/tasks');
    } catch (err: any) {
      const message =
        err.response?.data?.detail || err.message || 'Ошибка соединения';
      setError(message);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="mb-2">{isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Войдите, чтобы продолжить' : 'Зарегистрируйтесь, чтобы начать'}
          </p>
        </div>

        <div className="border rounded-2xl p-8 bg-card shadow-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className={`transition-colors ${isLogin ? 'text-foreground' : 'text-muted-foreground'}`}>
              Вход
            </span>
            <Switch
              checked={!isLogin}
              onCheckedChange={(checked) => {
                setIsLogin(!checked);
                setFormData({ username: '', email: '', password: '', confirmPassword: '' });
                setError(null);
              }}
            />
            <span>Регистрация</span>
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Введите имя пользователя"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="rounded-lg"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Введите email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="rounded-lg"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="rounded-lg"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Подтвердите пароль"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="rounded-lg"
                />
              </div>
            )}

            <Button type="submit" className="w-full" size="lg">
              {isLogin ? <><LogIn className="w-4 h-4" /> Войти</> : <><UserPlus className="w-4 h-4" /> Зарегистрироваться</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
