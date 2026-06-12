import axios from 'axios';

import { API_BASE_URL } from './config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_BASE_URL}/api/routes/refresh`, {
          refresh_token: refresh,
        });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (err) {
        // если обновить не удалось — разлогиниваем
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export async function loginRequest(username: string, password: string, role: string) {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  params.append('role', role);
  
  const { data } = await axios.post(`${API_BASE_URL}/api/routes/login`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  
  return data;
}