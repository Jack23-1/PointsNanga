import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { Modal } from 'antd';
import { createElement } from 'react';
import { getLoginRouteForRole } from '../config/constants';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let refreshPromise: Promise<void> | null = null;
let schoolSuspendedModalOpen = false;
let sessionRedirectPending = false;

const getResponseMessage = (error: AxiosError) => {
  const data = error.response?.data as
    | { message?: string | string[] }
    | undefined;
  return Array.isArray(data?.message)
    ? data.message.join(' ')
    : data?.message ?? '';
};

const getRequestRole = (error: AxiosError) => {
  const requestData = error.config?.data;
  if (typeof requestData !== 'string') return undefined;
  try {
    return (JSON.parse(requestData) as { role?: string }).role;
  } catch {
    return undefined;
  }
};

const getStoredRole = () => {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? (JSON.parse(storedUser) as { role?: string }).role : undefined;
  } catch {
    return undefined;
  }
};

const clearLocalSession = () => {
  try {
    localStorage.removeItem('user');
  } catch {
    // Ignore inaccessible storage.
  }
};

const redirectToLogin = () => {
  if (sessionRedirectPending) return;
  sessionRedirectPending = true;
  const role = getStoredRole();
  clearLocalSession();
  window.location.assign(getLoginRouteForRole(role));
};

const showSchoolSuspendedModal = (error: AxiosError) => {
  if (schoolSuspendedModalOpen) return;
  schoolSuspendedModalOpen = true;
  const role = getStoredRole() ?? getRequestRole(error);

  Modal.error({
    centered: true,
    width: 390,
    className: 'school-suspended-modal',
    icon: null,
    title: 'École suspendue',
    content: createElement(
      'div',
      { className: 'school-suspended-modal__content' },
      createElement('span', { className: 'school-suspended-modal__icon' }, '!'),
      createElement(
        'p',
        null,
        'Votre école est suspendue. L’accès aux élèves, classes, cours, professeurs, cotes et résultats est momentanément bloqué.',
      ),
      createElement(
        'small',
        null,
        'Veuillez contacter le super administrateur pour la réactivation.',
      ),
    ),
    okText: 'J’ai compris',
    onOk: () => {
      schoolSuspendedModalOpen = false;
      clearLocalSession();
      void axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true }).finally(() => {
        window.location.assign(getLoginRouteForRole(role));
      });
    },
    afterClose: () => {
      schoolSuspendedModalOpen = false;
    },
  });
};

const isSchoolSuspendedError = (error: AxiosError) =>
  /école est suspendue|ecole est suspendue|école suspendue|ecole suspendue/i.test(
    getResponseMessage(error),
  );

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

        if (isSchoolSuspendedError(error)) {
          showSchoolSuspendedModal(error);
          return Promise.reject(error);
        }

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
            redirectToLogin();
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

  public delete<T>(url: string, data?: unknown) {
    return this.client.delete<T>(url, { data });
  }
}

export const api = new ApiClient();
