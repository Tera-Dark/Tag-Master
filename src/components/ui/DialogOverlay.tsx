import { useEffect, useId, useRef, type ReactNode } from 'react';

const dialogStack: HTMLElement[] = [];
let previousOverflow = '';
const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogOverlayProps {
  children: ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
}

/** Shared presentation and keyboard lifecycle, including nested settings dialogs. */
export function DialogOverlay({ children, onClose, label, className = '' }: DialogOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const element = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!dialogStack.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    dialogStack.push(element);
    const visibleTargets = () =>
      Array.from(element.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (target) => !target.closest('[inert]') && target.getClientRects().length > 0
      );
    const frame = requestAnimationFrame(() => {
      if (
        dialogStack[dialogStack.length - 1] === element &&
        !element.contains(document.activeElement)
      ) {
        (visibleTargets()[0] || element).focus();
      }
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== element) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const targets = visibleTargets();
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (!first) {
          event.preventDefault();
          element.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !targets.includes(document.activeElement as HTMLElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !element.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      const index = dialogStack.indexOf(element);
      if (index >= 0) dialogStack.splice(index, 1);
      if (!dialogStack.length) document.body.style.overflow = previousOverflow;
      if (
        previousFocus?.isConnected &&
        (!dialogStack.length || dialogStack[dialogStack.length - 1]?.contains(previousFocus))
      )
        previousFocus.focus();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`tm-dialog-overlay ${className}`}
      role='dialog'
      aria-modal='true'
      aria-labelledby={titleId}
      tabIndex={-1}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          dialogStack[dialogStack.length - 1] === ref.current
        )
          onClose();
      }}
    >
      <span className='sr-only' id={titleId}>
        {label}
      </span>
      {children}
    </div>
  );
}
