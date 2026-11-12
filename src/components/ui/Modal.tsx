"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const subscribeNoop = () => () => {};
/** true solo en el navegador (el portal necesita document.body). */
const useIsClient = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

type ModalProps = {
  isOpen: boolean;
  /** Fondo, Escape. No se llama mientras `dismissible` sea false (p. ej. guardando). */
  onClose: () => void;
  dismissible?: boolean;
  /** Clases del contenedor del contenido (ancho, fondo, bordes…). */
  panelClassName?: string;
  backdropClassName?: string;
  /** En móvil pegado abajo (hoja) en vez de centrado. */
  sheetOnMobile?: boolean;
  zIndexClassName?: string;
  children: ReactNode;
};

/**
 * Base de todos los modales: se monta en <body> (no lo recortan contenedores con overflow),
 * fondo oscuro que cierra, Escape para cerrar y role="dialog".
 */
export function Modal({
  isOpen, onClose, dismissible = true, panelClassName, backdropClassName = "bg-gray-900/60",
  sheetOnMobile = false, zIndexClassName = "z-50", children,
}: ModalProps) {
  const isClient = useIsClient();

  useEffect(() => {
    if (!isOpen || !dismissible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, dismissible, onClose]);

  if (!isClient || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      className={cn("fixed inset-0 flex justify-center p-4", sheetOnMobile ? "items-end sm:items-center" : "items-center", zIndexClassName)}
    >
      <div
        className={cn("absolute inset-0 backdrop-blur-sm transition-opacity", backdropClassName)}
        onClick={(e) => { e.stopPropagation(); if (dismissible) onClose(); }}
      />
      <div onClick={(e) => e.stopPropagation()} className={cn("relative z-10", panelClassName)}>
        {children}
      </div>
    </div>,
    document.body
  );
}
