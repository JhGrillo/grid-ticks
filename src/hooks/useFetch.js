// src/hooks/useFetch.js
import { useState, useCallback } from 'react';

export function useFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const request = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, options);
      const json = await res.json();
      setData(json);
      if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
      return { data: json, error: null };
    } catch (err) {
      setError(err.message || 'Erro desconhecido');
      setData(null);
      return { data: null, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, data, request };
}
