import { useState, useCallback } from 'react';

let globalToastHandler = null;

export const showToast = (message, tone = 'neutral') => {
  if (globalToastHandler) {
    globalToastHandler(message, tone);
  }
};

export const useToast = () => {
  const [toast, setToast] = useState(null);

  const triggerToast = useCallback((message, tone = 'neutral') => {
    setToast({ message, tone, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 2800);
  }, []);

  globalToastHandler = triggerToast;

  return { toast, triggerToast };
};
