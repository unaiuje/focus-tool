import { useEffect, useState } from "react";

/** Hora actual que se refresca cada minuto: la marca "Ahora" y las franjas
 * sugeridas no se quedan congeladas si la pestaña queda abierta. */
export function useNow(stepMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}
