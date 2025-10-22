// src/hooks/useModal.js
import { useState, useCallback } from 'react';

export function useModal(initial = null) {
  const [modal, setModal] = useState(initial);
  const openModal = useCallback((value) => setModal(value), []);
  const closeModal = useCallback(() => setModal(null), []);
  return { modal, openModal, closeModal, setModal };
}
