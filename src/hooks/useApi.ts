import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const useApi = <T>(url: string, immediate = true) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<T>(url);
      setData(response.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      fetch();
    }
  }, [url, immediate]);

  return { data, loading, error, refetch: fetch };
};

export const useMutation = <T, P = any>(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST') => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (payload?: P) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      switch (method) {
        case 'POST':
          response = await api.post<T>(url, payload);
          break;
        case 'PUT':
          response = await api.put<T>(url, payload);
          break;
        case 'PATCH':
          response = await api.patch<T>(url, payload);
          break;
        case 'DELETE':
          response = await api.delete<T>(url);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, data, loading, error };
};
