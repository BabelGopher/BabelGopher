import { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ModalState } from '../types/appState';

/**
 * Convenience hook for managing modal visibility
 * Provides typed access to modal state and actions
 */
export function useModals() {
  const { state, dispatch } = useAppContext();

  // Memoize modals state to prevent unnecessary re-renders
  const modals = useMemo(() => state.modals, [state.modals]);

  // Modal actions
  const openModal = useCallback(
    (modalName: keyof ModalState) => {
      dispatch({ type: 'MODAL_OPEN', payload: modalName });
    },
    [dispatch]
  );

  const closeModal = useCallback(
    (modalName: keyof ModalState) => {
      dispatch({ type: 'MODAL_CLOSE', payload: modalName });
    },
    [dispatch]
  );

  // Convenience methods for specific modals
  const openSettings = useCallback(() => {
    openModal('settings');
  }, [openModal]);

  const closeSettings = useCallback(() => {
    closeModal('settings');
  }, [closeModal]);

  const openExitConfirm = useCallback(() => {
    openModal('exitConfirm');
  }, [openModal]);

  const closeExitConfirm = useCallback(() => {
    closeModal('exitConfirm');
  }, [closeModal]);

  return {
    // State
    modals,
    isSettingsOpen: modals.settings,
    isExitConfirmOpen: modals.exitConfirm,

    // Actions
    openModal,
    closeModal,
    openSettings,
    closeSettings,
    openExitConfirm,
    closeExitConfirm,
  };
}
