import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addClassSlot, removeClassSlot, useStudyStore } from "@/lib/study-store";
import { slotsForWeekday, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/study-utils";
import { selectClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** Un horario de instituto: clases de lunes a viernes. */
const DIAS_CLASE = [1, 2, 3, 4, 5];

/** Sección "Horario de clases" de Ajustes: formulario + listas semanales. */
export function ClassSlotsSection() {
  const state = useStudyStore();
  const todayWeekday = new Date().getDay();
  const tieneFijos = state.schedule.length > 0;
  // Solo lo usa la vista móvil (chips de día); en escritorio se ve la semana entera.
  const [diaActivo, setDiaActivo] = useState<number>(() =>
    DIAS_CLASE.includes(todayWeekday) ? todayWeekday : (DIAS_CLASE[0] ?? 1),
  );
  const slotsDiaActivo = slotsForWeekday(state.schedule, diaActivo);

  return (
    <div className="space-y-4">
      <NuevaFranja />

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
                Sin clases el {WEEKDAY_NAMES[diaActivo]?.toLowerCase() ?? "día elegido"}.
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
                  slots.map((slot) => <SlotCard key={slot.id} slot={slot} state={state} compact />)
                )}
              </div>
            );
          })}
        </div>
        {!tieneFijos && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Añade arriba tus clases y abajo tus extraescolares para verlas en Hoy y en Semana.
          </p>
        )}
      </section>
    </div>
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
      <h2 className="font-heading text-lg font-semibold">Horario de clases</h2>
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
