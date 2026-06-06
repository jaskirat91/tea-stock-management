import { useState, useCallback } from 'react';

export function useIpc() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async (channel: string, ...args: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI.invoke(channel, ...args);
      return result;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { invoke, loading, error };
}
