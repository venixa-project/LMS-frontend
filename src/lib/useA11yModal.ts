import React, { useEffect, useRef } from 'react';

export interface UseA11yModalOptions {
  isOpen?: boolean;
  onClose?: () => void;
  trapFocus?: boolean;
  initialFocus?: React.RefObject<any> | HTMLElement | string | boolean | (() => HTMLElement | null) | null;
  initialFocusRef?: React.RefObject<any>;
  returnFocus?: React.RefObject<any> | HTMLElement | string | boolean | (() => HTMLElement | null) | null;
  returnFocusRef?: React.RefObject<any>;
  closeOnEsc?: boolean;
  closeOnOutsideClick?: boolean;
  [key: string]: any;
}

export interface UseA11yModalReturn {
  modalRef: React.RefObject<HTMLDivElement | null>;
  ref: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  dialogProps: {
    role: 'dialog';
    'aria-modal': true;
    ref: React.RefObject<HTMLDivElement | null>;
  };
  [key: string]: any;
}

export function useA11yModal(
  options?: UseA11yModalOptions | boolean,
  onCloseCallback?: () => void
): UseA11yModalReturn {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const isOpen = typeof options === 'boolean' ? options : !!options?.isOpen;
  const onClose = typeof options === 'boolean' ? onCloseCallback : options?.onClose;
  const initialFocus = typeof options === 'object' ? (options?.initialFocus ?? options?.initialFocusRef) : undefined;
  const closeOnEsc = typeof options === 'object' ? (options?.closeOnEsc ?? true) : true;

  useEffect(() => {
    if (!isOpen) return;

    // Handle initial focus
    if (initialFocus) {
      const timer = setTimeout(() => {
        if (typeof initialFocus === 'object' && initialFocus !== null && 'current' in initialFocus) {
          initialFocus.current?.focus?.();
        } else if (typeof initialFocus === 'string') {
          const el = modalRef.current?.querySelector<HTMLElement>(initialFocus);
          el?.focus?.();
        } else if (typeof initialFocus === 'function') {
          const el = initialFocus();
          el?.focus?.();
        } else if (initialFocus instanceof HTMLElement) {
          initialFocus.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialFocus]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEsc]);

  return {
    modalRef,
    ref: modalRef,
    containerRef: modalRef,
    dialogProps: {
      role: 'dialog',
      'aria-modal': true,
      ref: modalRef,
    },
  };
}

export const useModalA11y = useA11yModal;
export const useA11yDialog = useA11yModal;
export const useAccessibilityModal = useA11yModal;

export default useA11yModal;
