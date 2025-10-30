import { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ToastVariant } from '../components/ui/Toast';

/**
 * Convenience hook for managing toast notifications
 * Provides typed access to toast state and actions
 */
export function useToasts() {
  const { state, dispatch } = useAppContext();

  // Memoize toasts to prevent unnecessary re-renders
  const toasts = useMemo(() => state.toasts, [state.toasts]);

  // Toast actions
  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      dispatch({
        type: 'TOAST_ADD',
        payload: { id, message, variant, duration },
      });
      return id;
    },
    [dispatch]
  );

  const hideToast = useCallback(
    (id: string) => {
      dispatch({ type: 'TOAST_REMOVE', payload: id });
    },
    [dispatch]
  );

  // Convenience methods for different toast types
  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'success', duration);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'error', duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'warning', duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      return showToast(message, 'info', duration);
    },
    [showToast]
  );

  return {
    // State
    toasts,

    // Actions
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
