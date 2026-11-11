"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
  align?: "center" | "bottom";
};

export default function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className = "",
  align = "center",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement
      );

      if (nodes.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (document.activeElement === panelRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-ink/45 backdrop-blur-sm ${
        align === "bottom" ? "items-end p-0 sm:items-center sm:p-6" : "items-center p-4 sm:p-6"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`max-h-[94dvh] w-full overflow-y-auto border border-line bg-card shadow-float outline-none animate-sheet-in ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
