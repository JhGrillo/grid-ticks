// src/hooks/useInput.js
import { useState, useCallback } from 'react';

export function useInput(initial = '') {
  const [value, setValue] = useState(initial);
  const onChange = useCallback(e => setValue(e.target.value), []);
  const reset = useCallback(() => setValue(initial), [initial]);
  return { value, setValue, onChange, reset };
}
