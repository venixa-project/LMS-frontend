import React from 'react';

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

export declare function useA11yModal(
  options?: UseA11yModalOptions | boolean,
  onCloseCallback?: () => void
): UseA11yModalReturn;

export declare const useModalA11y: typeof useA11yModal;
export declare const useA11yDialog: typeof useA11yModal;
export declare const useAccessibilityModal: typeof useA11yModal;

export default useA11yModal;
