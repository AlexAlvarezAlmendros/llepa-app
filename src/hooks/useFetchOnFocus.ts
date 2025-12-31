import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';

interface UseFetchOnFocusResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useFetchOnFocus = <T>(
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  options?: {
    errorMessage?: string;
    showErrorAlert?: boolean;
  }
): UseFetchOnFocusResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      setError(err);
      if (options?.showErrorAlert !== false) {
        Alert.alert(
          'Error',
          options?.errorMessage || 'No se pudieron cargar los datos'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, options?.errorMessage, options?.showErrorAlert]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, ...deps])
  );

  return { data, loading, error, refresh: loadData };
};
