'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Función con identidad fija que siempre llama a la versión más reciente de `fn`.
 * Sirve para pasar handlers a componentes memorizados (React.memo) sin que se redibujen
 * cada vez que el padre se redibuja. Solo para eventos, no para llamar durante el render.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- firma genérica de cualquier handler
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  const stable = useCallback((...args: Parameters<T>): ReturnType<T> => ref.current(...args), []);
  return stable as T;
}
