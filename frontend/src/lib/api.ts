import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let refreshPromise: Promise<void> | null = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const requestUrl = error.config?.url ?? '';
        const isLoginRequest = requestUrl.includes('/auth/login');
        const isRefreshRequest = requestUrl.includes('/auth/refresh');
        const originalRequest = error.config as
          | (AxiosRequestConfig & { _retry?: boolean })
          | undefined;

        if (
          error.response?.status === 401 &&
          !isLoginRequest &&
          !isRefreshRequest &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            await refreshAccessToken();
            return this.client.request(originalRequest);
          } catch {
            // Let the caller decide how to surface the unauthorized state.
          }
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
