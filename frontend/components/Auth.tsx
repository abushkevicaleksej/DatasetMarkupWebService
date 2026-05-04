import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { LogIn, UserPlus } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      console.log('Logging in with:', { email: formData.email, password: formData.password });
      navigate('/upload');
    } else {
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match!');
        return;
      }
      console.log('Registering with:', formData);
      navigate('/upload');
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="mb-2">{isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}</h1>
          <p className="text-muted-foreground">
            {isLogin
              ? 'Войдите, чтобы продолжить работу над разметкой'
              : 'Зарегистритуйтесь, чтобы начать работу'}
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
                setFormData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  name: '',
                });
              }}
            />
            <span className={`transition-colors ${!isLogin ? 'text-foreground' : 'text-muted-foreground'}`}>
              Регистрация
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Имя пользователя</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Введите ваше имя"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="rounded-lg"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Введите ваш email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Введите ваш пароль"
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
                  placeholder="Подтвердите ваш пароль"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="rounded-lg"
                />
              </div>
            )}

            <Button type="submit" className="w-full" size="lg">
              {isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Войти
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Зарегистрироваться
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
