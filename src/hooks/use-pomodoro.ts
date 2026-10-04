import { useCallback, useEffect, useRef, useState } from "react";
import { beep } from "@/lib/beep";

export const FOCUS_MIN = 25;
export const BREAK_MIN = 5;

export type PomodoroPhase = "focus" | "break" | "done";

/**
 * Máquina de estados 25/5 compartida por el diálogo de Pomodoro y la
 * pestaña "Pomodoro" de Estudio. Las transiciones de fase viven en un
 * efecto (nunca dentro del updater del intervalo) para no disparar
 * efectos secundarios durante el render.
 */
export function usePomodoro({
  focusMin = FOCUS_MIN,
  breakMin = BREAK_MIN,
  onFocusComplete,
  onDone,
}: {
  focusMin?: number;
  breakMin?: number;
  onFocusComplete?: () => void;
  onDone?: () => void;
} = {}) {
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(focusMin * 60);
  const [running, setRunning] = useState(false);
  // Última llamada estable: los callbacks se leen vía ref para que el
  // efecto del intervalo no dependa de ellos.
  const focusCb = useRef(onFocusComplete);
  focusCb.current = onFocusComplete;
  const doneCb = useRef(onDone);
  doneCb.current = onDone;
  // Evita doble registro si el tick y la transición coinciden.
  const focusFired = useRef(false);

  const start = useCallback(() => {
    focusFired.current = false;
    setPhase("focus");
    setSecondsLeft(focusMin * 60);
    setRunning(true);
  }, [focusMin]);

  const reset = useCallback(() => {
    focusFired.current = false;
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(focusMin * 60);
  }, [focusMin]);

  const toggle = useCallback(() => setRunning((r) => !r), []);

  // Tick puro: solo decrementa.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Transiciones: foco terminado → descanso automático; descanso → fin.
  useEffect(() => {
    if (!running || secondsLeft > 0) return;
    if (phase === "focus") {
      if (!focusFired.current) {
        focusFired.current = true;
        beep();
        focusCb.current?.();
      }
      setPhase("break");
      setSecondsLeft(breakMin * 60);
    } else if (phase === "break") {
      setRunning(false);
      setPhase("done");
      doneCb.current?.();
    }
  }, [running, secondsLeft, phase, breakMin]);

  return { phase, secondsLeft, running, start, toggle, reset };
}
