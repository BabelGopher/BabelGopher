import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExitConfirmModal({ isOpen, onClose, onConfirm }: ExitConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Leave Conference?"
    >
      <div className="space-y-6">
        {/* Warning Message */}
        <div className="text-center">
          <p className="text-gray-300 leading-relaxed">
            Are you sure you want to leave this conference? You will be disconnected from the call.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Stay in Call
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Leave Conference
          </Button>
        </div>
      </div>
    </Modal>
  );
}
