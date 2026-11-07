import React, { useEffect, useRef, useState, startTransition } from 'react';

/**
 * FastInput — Input "anti-traba" para celulares de gama media (Honor, Huawei, Xiaomi...).
 *
 * PROBLEMA: Un <input value={x} onChange={setX}> controlado por un componente gigante
 * (Clients.tsx tiene +5000 líneas) obliga a re-renderizar TODO en cada tecla. En teclados
 * con texto predictivo (Celia/Gboard en Honor) la composición IME llega antes de que React
 * termine, y el valor viejo "pisa" lo escrito: letras a destiempo, borrar no responde, cursor salta.
 *
 * SOLUCIÓN: El texto vive en un estado LOCAL (solo re-renderiza este input, instantáneo).
 * El valor se envía al padre en baja prioridad (startTransition) o con retardo (delay),
 * y nunca durante la composición del teclado.
 */
type FastInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string | number | undefined | null;
  onValueChange: (value: string) => void;
  /** ms de espera antes de avisar al padre (útil para buscadores). 0 = inmediato en baja prioridad. */
  delay?: number;
};

const FastInput: React.FC<FastInputProps> = ({ value, onValueChange, delay = 0, onBlur, onFocus, ...rest }) => {
  const external = value === undefined || value === null ? '' : String(value);
  const [local, setLocal] = useState(external);
  const focused = useRef(false);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(onValueChange);
  cbRef.current = onValueChange;

  // Si el valor cambia desde afuera (ej. abrir otro cliente) y el usuario no está escribiendo, sincronizar.
  useEffect(() => {
    if (!focused.current) setLocal(external);
  }, [external]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const commit = (v: string, immediate = false) => {
    if (timer.current) clearTimeout(timer.current);
    // En blur se envía con prioridad normal: React lo aplica antes del click en "Guardar".
    if (immediate) { cbRef.current(v); return; }
    const send = () => startTransition(() => cbRef.current(v));
    if (delay <= 0) send();
    else timer.current = setTimeout(send, delay);
  };

  return (
    <input
      {...rest}
      value={local}
      onChange={e => {
        const v = e.target.value;
        setLocal(v);
        if (!composing.current) commit(v);
      }}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={e => {
        composing.current = false;
        commit((e.target as HTMLInputElement).value);
      }}
      onFocus={e => { focused.current = true; onFocus?.(e); }}
      onBlur={e => {
        focused.current = false;
        commit(e.target.value, true); // garantiza que el padre tenga el valor final antes de "Guardar"
        onBlur?.(e);
      }}
    />
  );
};

export default FastInput;
