"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface MenuSelectOption {
  value: string;
  label: string;
  /** Clase de color del puntito, p. ej. "bg-blue-500". */
  dot?: string;
}

interface MenuSelectProps {
  value: string;
  options: MenuSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

const ROW_HEIGHT = 36;
const MENU_PADDING = 8;
const MIN_WIDTH = 168;

/**
 * Selector compacto con menú propio (no el nativo del navegador).
 * El menú se dibuja en un portal con posición fija, así no lo recortan columnas con scroll,
 * y se invierte hacia arriba si no hay espacio debajo.
 */
export default function MenuSelect({ value, options, onChange, ariaLabel, disabled, className = "" }: MenuSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selected = options.find((o) => o.value === value);
  const isOpen = pos !== null;

  const close = () => setPos(null);

  const open = () => {
    const el = triggerRef.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, MIN_WIDTH);
    const height = options.length * ROW_HEIGHT + MENU_PADDING;
    const fitsBelow = rect.bottom + 4 + height <= window.innerHeight - 8;
    const top = fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - 4 - height);
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setPos({ top, left, width });
  };

  // Cierra al hacer clic fuera, con Escape, al desplazar o redimensionar
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPos(null);
        triggerRef.current?.focus();
      }
    };
    const onScrollOrResize = () => setPos(null);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [isOpen]);

  // Al abrir, el foco va a la opción seleccionada (navegación con flechas)
  useEffect(() => {
    if (!isOpen) return;
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    items?.[idx]?.focus();
  }, [isOpen, options, value]);

  const moveFocus = (e: React.KeyboardEvent, delta: number) => {
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = (current + delta + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.preventDefault(); // dentro de un enlace (tarjeta) no debe navegar
          e.stopPropagation();
          if (isOpen) close();
          else open();
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={`inline-flex items-center justify-between gap-1.5 max-w-[9rem] rounded-lg border bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 disabled:opacity-50 ${
          isOpen ? "border-red-500 ring-2 ring-red-500/15" : "border-gray-200"
        } ${className}`}
      >
        {selected?.dot && <span className={`h-2 w-2 rounded-full shrink-0 ${selected.dot}`} />}
        <span className="truncate">{selected?.label ?? "—"}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen &&
        createPortal(
          // Los eventos de un portal burbujean por el árbol de React: se detienen para no activar la tarjeta
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "ArrowDown") moveFocus(e, 1);
              else if (e.key === "ArrowUp") moveFocus(e, -1);
            }}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[100] rounded-xl border border-gray-100 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    close();
                    triggerRef.current?.focus();
                    if (!active) onChange(o.value);
                  }}
                  style={{ height: ROW_HEIGHT - 4 }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm outline-none transition-colors focus-visible:bg-gray-100 ${
                    active ? "bg-red-50 font-semibold text-red-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {o.dot && <span className={`h-2 w-2 rounded-full shrink-0 ${o.dot}`} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-red-600" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
