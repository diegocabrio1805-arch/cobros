import React, { useEffect, useRef, startTransition, forwardRef } from 'react';
import { flushSync } from 'react-dom';

/**
 * FastInput — Input 100% Nativo No-Controlado ("Zero-Lag") para Android / Honor / Gama Media.
 *
 * POR QUÉ FALLABA EL BORRADO (BACKSPACE) EN HONOR:
 * 1. En React, cualquier <input value={...}> activa el wrapper controlado ReactDOMInput.
 *    En Android WebView + teclados Honor (Celia / SwiftKey / Gboard), presionar Borrar (⌫)
 *    sobre una palabra inicia una sesión IME (InputConnection). Cuando React re-renderiza
 *    y toca `node.value`, reinicia el InputConnection del teclado y cancela los primeros
 *    1 o 2 toques de Borrar.
 * 2. Además, si cada tecla dispara un re-render de componentes pesados (como Clients.tsx
 *    con +5600 líneas), el hilo principal se congela 300-600ms y se traga las pulsaciones.
 *
 * SOLUCIÓN DEFINITIVA:
 * - El <input> subyacente NO recibe la prop `value` (usa `defaultValue` + `ref`), por lo que
 *   es 100% no-controlado para React. El navegador maneja la escritura y el botón Borrar (⌫)
 *   de forma nativa a 0ms sin intervención de React ni cortes de IME.
 * - Mientras el usuario escribe o borra de corrido, un debounce (mínimo 350ms) evita que
 *   el componente padre se re-renderice en cada tecla.
 * - Al tocar cualquier botón fuera del input (touchstart/pointerdown en fase de captura),
 *   al presionar Enter o al perder el foco (blur), el valor se sincroniza instantáneamente
 *   con `flushSync` antes de que se ejecute el `onClick` de "Guardar" o "Buscar".
 */
export type FastInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  value?: string | number | readonly string[] | undefined | null;
  onValueChange?: (value: string) => void;
  /** ms de espera tras dejar de escribir/borrar antes de actualizar al padre (default: 350ms) */
  delay?: number;
};

// Un único listener global en fase de captura para volcar el input activo antes de cualquier click en botones
let activeInputFlush: ((target: EventTarget | null) => void) | null = null;

if (typeof window !== 'undefined') {
  const flushActiveOnOutside = (e: Event) => {
    if (activeInputFlush) {
      activeInputFlush(e.target);
    }
  };
  window.addEventListener('touchstart', flushActiveOnOutside, true);
  window.addEventListener('pointerdown', flushActiveOnOutside, true);
}

const FastInput = forwardRef<HTMLInputElement, FastInputProps>(({
  value,
  onValueChange,
  onChange,
  delay = 350,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}, externalRef) => {
  const external = value === undefined || value === null ? '' : String(value);
  const initialValue = useRef(external);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focused = useRef(false);
  const dirty = useRef(false);
  const lastCommitted = useRef(external);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Mínimo 350ms de debounce para que ráfagas de Backspace (⌫) jamás disparen re-renders a mitad del borrado
  const effectiveDelay = Math.max(delay, 350);

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      (externalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }
  };

  const fireCallbacks = (v: string) => {
    lastCommitted.current = v;
    dirty.current = false;
    if (onValueChangeRef.current) {
      onValueChangeRef.current(v);
    }
    if (onChangeRef.current) {
      const el = inputRef.current;
      const syntheticTarget = {
        value: v,
        name: el?.name ?? '',
        id: el?.id ?? '',
        type: el?.type ?? 'text',
        checked: el?.checked ?? false,
        valueAsNumber: v === '' ? NaN : Number(v),
      };
      onChangeRef.current({
        target: syntheticTarget,
        currentTarget: syntheticTarget,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const commit = (v: string, immediate = false) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (immediate) {
      if (dirty.current || v !== lastCommitted.current) {
        try {
          flushSync(() => fireCallbacks(v));
        } catch {
          fireCallbacks(v);
        }
      }
      return;
    }
    dirty.current = true;
    timer.current = setTimeout(() => {
      timer.current = null;
      startTransition(() => {
        fireCallbacks(v);
      });
    }, effectiveDelay);
  };

  // Sincronizar cambios externos (ej. abrir otro cliente o botón "X" de limpiar)
  // NUNCA tocar `el.value` mientras el usuario tiene el foco escribiendo/borrando,
  // salvo que el padre limpie explícitamente el campo a '' desde afuera.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (!focused.current) {
      if (el.value !== external) {
        el.value = external;
      }
      lastCommitted.current = external;
      dirty.current = false;
    } else if (!dirty.current && external === '' && lastCommitted.current !== '') {
      el.value = '';
      lastCommitted.current = '';
    }
  }, [external]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <input
      {...rest}
      ref={setRefs}
      defaultValue={initialValue.current}
      onChange={e => {
        commit(e.currentTarget.value, false);
      }}
      onFocus={e => {
        focused.current = true;
        activeInputFlush = (target: EventTarget | null) => {
          const el = inputRef.current;
          if (!el || !dirty.current) return;
          if (target !== el && (!target || !el.contains(target as Node))) {
            commit(el.value, true);
          }
        };
        onFocus?.(e);
      }}
      onBlur={e => {
        focused.current = false;
        if (activeInputFlush) activeInputFlush = null;
        commit(e.currentTarget.value, true);
        onBlur?.(e);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' && inputRef.current) {
          commit(inputRef.current.value, true);
        }
        onKeyDown?.(e);
      }}
    />
  );
});

FastInput.displayName = 'FastInput';

export default FastInput;
