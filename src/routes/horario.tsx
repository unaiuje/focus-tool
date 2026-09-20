import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Extraescolares } from "@/components/Extraescolares";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addClassSlot, removeClassSlot, updateSettings, useStudyStore } from "@/lib/study-store";
import { daysToTermEnd, slotsForWeekday, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/study-utils";
import { selectClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/horario")({
  head: () => ({
    meta: [
      { title: "Horario — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Tu horario fijo de clases y extraescolares: la app evita proponerte estudiar cuando estás en clase o entrenando.",
      },
      { property: "og:title", content: "Horario — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content: "Clases fijas de la semana y actividades: el plan de estudio respeta tus horas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HorarioPage,
});

/** Un horario de instituto: clases de lunes a viernes. */
const DIAS_CLASE = [1, 2, 3, 4, 5];

function HorarioPage() {
  const state = useStudyStore();
  const todayWeekday = new Date().getDay();
  const tieneFijos = state.schedule.length > 0 || state.extras.length > 0;
  // Solo lo usa la vista móvil (chips de día); en escritorio se ve la semana entera.
  const [diaActivo, setDiaActivo] = useState(() =>
    DIAS_CLASE.includes(todayWeekday) ? todayWeekday : DIAS_CLASE[0],
  );
  const slotsDiaActivo = slotsForWeekday(state.schedule, diaActivo);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Horario</h1>
          <p className="text-sm text-muted-foreground">
            Tus horas fijas. Con esto el plan de hoy nunca cae en medio de una clase o de un
            entrenamiento.
          </p>
        </div>

        <NuevaFranja />

        {/* Semanal: en móvil, un día cada vez; en escritorio, la rejilla completa. */}
        <section className="rounded-xl border bg-card p-4">
          {/* Móvil: chips de día + lista del día elegido */}
          <div className="md:hidden">
            <div role="group" aria-label="Día de la semana" className="mb-3 flex gap-1.5">
              {DIAS_CLASE.map((weekday) => {
                const on = weekday === diaActivo;
                return (
                  <button
                    key={weekday}
                    type="button"
                    onClick={() => setDiaActivo(weekday)}
                    aria-pressed={on}
                    title={WEEKDAY_NAMES[weekday]}
                    className={cn(
                      "flex-1 rounded-full px-1 py-2 text-sm font-medium transition-colors",
                      on
                        ? "bg-primary text-primary-foreground"
                        : "border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {WEEKDAY_SHORT[weekday]}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              {slotsDiaActivo.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  Sin clases el {WEEKDAY_NAMES[diaActivo].toLowerCase()}.
                </p>
              ) : (
                slotsDiaActivo.map((slot) => <SlotCard key={slot.id} slot={slot} state={state} />)
              )}
            </div>
          </div>

          {/* Escritorio: rejilla semanal, columnas = días */}
          <div className="hidden gap-2 md:grid md:grid-cols-5">
            {DIAS_CLASE.map((weekday) => {
              const slots = slotsForWeekday(state.schedule, weekday);
              return (
                <div key={weekday} className="space-y-1.5">
                  <h2
                    className={cn(
                      "text-center text-xs font-semibold uppercase tracking-wide",
                      weekday === todayWeekday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {WEEKDAY_SHORT[weekday]}
                  </h2>
                  {slots.length === 0 ? (
                    <p className="rounded-lg border border-dashed px-2 py-4 text-center text-[11px] text-muted-foreground">
                      Sin clases
                    </p>
                  ) : (
                    slots.map((slot) => (
                      <SlotCard key={slot.id} slot={slot} state={state} compact />
                    ))
                  )}
                </div>
              );
            })}
          </div>
          {!tieneFijos && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Añade arriba tus clases y abajo tus extraescolares para verlos aquí.
            </p>
          )}
        </section>

        <Extraescolares />

        <Rutina />
      </div>
    </AppLayout>
  );
}

/** Tarjeta de una clase: hora + asignatura + botón de borrar siempre visible. */
function SlotCard({
  slot,
  state,
  compact = false,
}: {
  slot: ReturnType<typeof slotsForWeekday>[number];
  state: ReturnType<typeof useStudyStore>;
  compact?: boolean;
}) {
  const subject = state.subjects.find((s) => s.id === slot.subjectId);
  const weekday = slot.weekday;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs tabular-nums text-muted-foreground">
          {slot.startTime}–{slot.endTime}
        </p>
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1.5 font-medium",
            compact ? "text-xs" : "text-sm",
          )}
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: subject?.color ?? "#999" }}
          />
          <span className="truncate">{subject?.name ?? "—"}</span>
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => removeClassSlot(slot.id)}
        aria-label={`Quitar ${subject?.name ?? "clase"} del ${WEEKDAY_SHORT[weekday]} a las ${slot.startTime}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

const HORAS_RECORDATORIO = [14, 15, 16, 17, 18, 19, 20, 21, 22];

/** Ajustes de hábitos: recordatorio diario y fin de la evaluación. */
function Rutina() {
  const state = useStudyStore();
  const [horaElegida, setHoraElegida] = useState(17);
  const [permissionMsg, setPermissionMsg] = useState("");
  const reminderHour = state.settings.reminderHour;
  const termEnd = state.settings.termEndDate;
  const dias = daysToTermEnd(state);

  const activar = async () => {
    if (typeof Notification === "undefined") {
      setPermissionMsg("Este navegador no soporta notificaciones.");
      return;
    }
    const perm =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm === "granted") {
      updateSettings({ reminderHour: horaElegida });
      setPermissionMsg("");
    } else {
      setPermissionMsg("Notificaciones bloqueadas: permítelas en el navegador.");
    }
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Tu rutina</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Recordatorio diario</p>
          {reminderHour === null ? (
            <>
              <p className="text-sm text-muted-foreground">
                Un aviso a la hora que elijas con lo que te queda del día.
              </p>
              <div className="flex items-center gap-2">
                <select
                  className={cn(selectClass, "w-28")}
                  value={horaElegida}
                  onChange={(e) => setHoraElegida(Number(e.target.value))}
                  aria-label="Hora del recordatorio"
                >
                  {HORAS_RECORDATORIO.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={activar}>
                  Activar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Aviso a las{" "}
                <span className="font-semibold text-foreground">
                  {String(reminderHour).padStart(2, "0")}:00
                </span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => updateSettings({ reminderHour: null })}
              >
                Desactivar
              </Button>
            </div>
          )}
          {permissionMsg && <p className="text-xs text-destructive">{permissionMsg}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Fin de la evaluación</p>
          <Input
            type="date"
            value={termEnd ?? ""}
            onChange={(e) => updateSettings({ termEndDate: e.target.value || null })}
            className="w-44"
            aria-label="Fecha de fin de evaluación"
          />
          {dias !== null && (
            <p className="text-sm text-muted-foreground">
              Quedan{" "}
              <span className="font-semibold text-foreground">
                {dias} día{dias === 1 ? "" : "s"}
              </span>{" "}
              para cerrar evaluación.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function NuevaFranja() {
  const state = useStudyStore();
  const [subjectId, setSubjectId] = useState(() => state.subjects[0]?.id ?? "");
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("09:20");
  const invalid = !subjectId || endTime <= startTime;

  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid) return;
        addClassSlot({ subjectId, weekday, startTime, endTime });
      }}
    >
      <h2 className="font-heading text-lg font-semibold">Añadir clase</h2>
      <div className="grid gap-3 sm:grid-cols-5">
        <select
          className={cn(selectClass, "sm:col-span-2")}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          aria-label="Asignatura"
        >
          {state.subjects.length === 0 && <option value="">Sin asignaturas</option>}
          {state.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          aria-label="Día de la semana"
        >
          {DIAS_CLASE.map((d) => (
            <option key={d} value={d}>
              {WEEKDAY_NAMES[d]}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            aria-label="Hora de inicio"
            className="min-w-28 flex-1"
          />
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            aria-label="Hora de fin"
            className="min-w-28 flex-1"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={invalid}>
          <Plus className="size-4" /> Añadir
        </Button>
      </div>
      {subjectId && endTime <= startTime && (
        <p className="text-xs text-destructive">La hora de fin debe ser después de la de inicio.</p>
      )}
    </form>
  );
}
