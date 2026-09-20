import { useEffect } from "react";
import { useNow } from "@/hooks/use-now";
import { useStudyStore } from "@/lib/study-store";
import { tasksForDay, todayISO } from "@/lib/study-utils";

const LAST_KEY = "mi-curso-4eso-v2:reminder:last";

/** Notificación diaria: al llegar la hora configurada, un aviso con lo que
 *  queda del día. Se dispara una sola vez por día y solo con permiso dado. */
export function useDailyReminder() {
  const state = useStudyStore();
  const now = useNow(60_000);

  useEffect(() => {
    const hour = state.settings.reminderHour;
    if (hour === null || typeof window === "undefined") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = todayISO();
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_KEY);
    } catch {
      return; // sin localStorage no podemos marcar "ya avisado": mejor no repetir
    }
    if (last === today) return;
    if (now.getHours() < hour) return;

    const pending = tasksForDay(state, today).filter((t) => !t.done).length;
    const cards = state.cards.filter((c) => c.due <= today).length;
    const body =
      pending > 0
        ? `Te quedan ${pending} tarea${pending > 1 ? "s" : ""} hoy.${cards > 0 ? ` Y ${cards} tarjeta${cards > 1 ? "s" : ""} por repasar.` : ""}`
        : cards > 0
          ? `${cards} tarjeta${cards > 1 ? "s" : ""} para repasar hoy. Cinco minutos y lista.`
          : "Día limpio. ¿Apuntas ya lo de mañana?";

    try {
      new Notification("Mi Curso 4º ESO", { body });
      localStorage.setItem(LAST_KEY, today);
    } catch {
      // sin permiso efectivo: nada
    }
  }, [now, state]);
}
