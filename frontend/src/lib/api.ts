import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ROUTES } from '../config/constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getLoginRouteFromStoredUser = () => {
  const storedUser = localStorage.getItem('user');

  if (!storedUser) {
    return ROUTES.LOGIN;
  }

  try {
    const role = JSON.parse(storedUser)?.role;

    if (role === 'super_admin') return ROUTES.SUPER_ADMIN_LOGIN;
    if (role === 'director') return ROUTES.DIRECTOR_LOGIN;
    if (role === 'teacher') return ROUTES.HOMEROOM_LOGIN;

    return ROUTES.LOGIN;
  } catch {
    return ROUTES.LOGIN;
  }
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const requestUrl = error.config?.url ?? '';
        const isLoginRequest = requestUrl.includes('/auth/login');

        if (error.response?.status === 401 && !isLoginRequest) {
          // Handle unauthorized - clear token and redirect to login
          const loginRoute = getLoginRouteFromStoredUser();
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = loginRoute;
        }
        return Promise.reject(error);
      }
    );
  }

  public get<T>(url: string, params?: AxiosRequestConfig['params']) {
    return this.client.get<T>(url, { params });
  }

  public post<T>(url: string, data?: unknown) {
    return this.client.post<T>(url, data);
  }

  public put<T>(url: string, data?: unknown) {
    return this.client.put<T>(url, data);
  }

  public patch<T>(url: string, data?: unknown) {
    return this.client.patch<T>(url, data);
  }

  public delete<T>(url: string) {
    return this.client.delete<T>(url);
  }
}

export const api = new ApiClient();
