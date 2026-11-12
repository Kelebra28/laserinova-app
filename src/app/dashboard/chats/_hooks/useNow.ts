'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reloj compartido que avanza cada minuto (para la ventana de 24 h de WhatsApp).
 * Un solo intervalo para toda la pantalla, y solo se redibujan los componentes que lo usan
 * (antes el reloj vivía en ChatLayout y cada minuto redibujaba todo el chat).
 */
const TICK_MS = 60_000;
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach(l => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => now;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
