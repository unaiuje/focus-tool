import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";
import { TaskRow } from "@/components/TaskRow";
import { useStudyStore } from "@/lib/study-store";
import {
  DAY_END,
  DAY_START,
  freeWindowsForDay,
  hhmmToMinutes,
  minutesToHHmm,
  slotsForWeekday,
  tasksForDay,
  todayISO,
  WEEKDAY_SHORT,
} from "@/lib/study-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/semana")({
  head: () => ({
    meta: [
      { title: "Semana — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Tu semana entera en una rejilla: clases, extraescolares, huecos de estudio y tareas.",
      },
      { property: "og:title", content: "Semana — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content: "Horario semanal con clases, actividades y cuándo te conviene estudiar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SemanaPage,
});

/** Resolución vertical de la rejilla: una fila = 30 minutos. */
const GRID_MIN = 30;
const DIAS_REJILLA = [1, 2, 3, 4, 5]; // la escuela es de lunes a viernes
const DIAS_AGENDA = [1, 2, 3, 4, 5, 6, 0]; // la agenda sí incluye el fin de semana

type Bloque = {
  key: string;
  col: number; // 2..6 en la rejilla (1 = canal de horas)
  start: string;
  end: string;
  kind: "clase" | "extra" | "estudio";
  label: string;
  color?: string | undefined;
  weekday: number;
};

function SemanaPage() {
  const state = useStudyStore();
  const now = new Date();
  const hoy = todayISO();
  const todayWeekday = now.getDay();
  const [diaActivo, setDiaActivo] = useState<number>(() =>
    DIAS_AGENDA.includes(todayWeekday) ? todayWeekday : (DIAS_AGENDA[0] ?? 1),
  );

  const lunes = startOfWeek(now, { weekStartsOn: 1 });
  // Lunes=0 … Sábado=5, Domingo=6
  const fechaDe = (weekday: number) => addDays(lunes, weekday === 0 ? 6 : weekday - 1);

  // Bloques de la rejilla: clases + extraescolares + huecos de estudio (solo días futuros/hoy)
  const bloques = useMemo<Bloque[]>(() => {
    const out: Bloque[] = [];
    DIAS_REJILLA.forEach((weekday, idx) => {
      const col = idx + 2;
      const dateISO = format(addDays(lunes, idx), "yyyy-MM-dd");
      for (const slot of slotsForWeekday(state.schedule, weekday)) {
        const subject = state.subjects.find((s) => s.id === slot.subjectId);
        out.push({
          key: slot.id,
          col,
          start: slot.startTime,
          end: slot.endTime,
          kind: "clase",
          label: subject?.name ?? "Clase",
          color: subject?.color,
          weekday,
        });
      }
      for (const e of state.extras.filter((x) => x.weekdays.includes(weekday))) {
        out.push({
          // col en la clave: una extra de varios días aparece en varias columnas
          key: `${e.id}-${col}`,
          col,
          start: e.startTime,
          end: e.endTime,
          kind: "extra",
          label: e.name,
          color: "#a855f7",
          weekday,
        });
      }
      // Huecos de estudio: solo hoy y días futuros (el pasado no se sugiere)
      if (dateISO >= hoy) {
        freeWindowsForDay(state, dateISO, now).forEach((w, i) => {
          out.push({
            key: `${dateISO}-estudio-${i}`,
            col,
            start: w.start,
            end: w.end,
            kind: "estudio",
            label: "Estudiar",
            weekday,
          });
        });
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hoy, lunes]);

  // Rango de filas: de los datos, con límites de jornada por defecto
  const { firstRow, rowCount } = useMemo(() => {
    const starts = bloques.map((b) => hhmmToMinutes(b.start));
    const ends = bloques.map((b) => hhmmToMinutes(b.end));
    const minMin = Math.min(...starts, hhmmToMinutes(DAY_START));
    const maxMin = Math.max(...ends, hhmmToMinutes(DAY_END));
    const first = Math.floor(minMin / GRID_MIN);
    const last = Math.max(Math.ceil(maxMin / GRID_MIN), first + 1);
    return { firstRow: first, rowCount: last - first };
  }, [bloques]);

  // Carriles por columna para que los solapes se vean lado a lado
  const porColumna = useMemo(() => {
    const lanes = new Map<string, { lane: number; lanes: number }>();
    const cols = new Map<number, Bloque[]>();
    for (const b of bloques) {
      const arr = cols.get(b.col) ?? [];
      arr.push(b);
      cols.set(b.col, arr);
    }
    for (const [col, arr] of cols) {
      const sorted = [...arr].sort(
        (a, b) =>
          hhmmToMinutes(a.start) - hhmmToMinutes(b.start) ||
          hhmmToMinutes(a.end) - hhmmToMinutes(b.end),
      );
      const laneEnds: number[] = [];
      for (const b of sorted) {
        const startMin = hhmmToMinutes(b.start);
        let lane = laneEnds.findIndex((end) => end <= startMin);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(hhmmToMinutes(b.end));
        } else {
          laneEnds[lane] = hhmmToMinutes(b.end);
        }
        lanes.set(b.key, { lane, lanes: 0 });
      }
      for (const b of sorted) {
        const l = lanes.get(b.key);
        if (l) l.lanes = laneEnds.length;
      }
    }
    return lanes;
  }, [bloques]);

  const bloqueActivo = (weekday: number) => bloques.filter((b) => b.weekday === weekday);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Tu semana</h1>
          <p className="text-sm text-muted-foreground">
            Clases, extraescolares y cuándo te conviene estudiar. Las franjas punteadas son solo
            sugerencias.
          </p>
        </div>

        {/* Móvil: un día cada vez (agenda vertical). Escritorio: rejilla completa. */}
        <div className="md:hidden">
          <AgendaDia weekday={diaActivo} date={fechaDe(diaActivo)} onSelectDay={setDiaActivo} />
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div
            className="min-w-[640px]"
            style={{
              display: "grid",
              gridTemplateColumns: "2.75rem repeat(5, minmax(0, 1fr))",
              gridTemplateRows: `repeat(${rowCount}, 2rem)`,
            }}
          >
            {/* Cabecera de días */}
            {DIAS_REJILLA.map((weekday, i) => (
              <div
                key={weekday}
                style={{ gridColumn: i + 2, gridRow: 1 }}
                className={cn(
                  "pb-1 text-center text-xs font-semibold uppercase tracking-wide",
                  weekday === todayWeekday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {WEEKDAY_SHORT[weekday]}
              </div>
            ))}
            {/* Etiquetas de hora y líneas */}
            {Array.from({ length: rowCount }, (_, i) =>
              i % 2 === 0 ? (
                <div
                  key={`h-${i}`}
                  style={{ gridColumn: 1, gridRow: `${i + 2} / span 2` }}
                  className="-mt-1 pr-2 text-right text-[10px] tabular-nums text-muted-foreground"
                >
                  {minutesToHHmm((firstRow + i) * GRID_MIN)}
                </div>
              ) : null,
            )}
            {Array.from({ length: rowCount }, (_, i) => (
              <div
                key={`r-${i}`}
                style={{ gridColumn: "1 / -1", gridRow: i + 2 }}
                className="border-t border-border/60"
              />
            ))}
            {/* Bloques */}
            {bloques.map((b) => {
              const pos = porColumna.get(b.key);
              const startRow = Math.floor(hhmmToMinutes(b.start) / GRID_MIN) - firstRow + 2;
              const endRow = Math.max(
                Math.ceil(hhmmToMinutes(b.end) / GRID_MIN) - firstRow + 2,
                startRow + 1,
              );
              const lane = pos?.lane ?? 0;
              const lanes = Math.max(1, pos?.lanes ?? 1);
              return (
                <div
                  key={b.key}
                  style={{
                    gridColumn: b.col,
                    gridRow: `${startRow} / ${endRow}`,
                    // inset para que quepan los carriles solapados
                    paddingLeft: `${(lane / lanes) * 100}%`,
                    width: `${(1 / lanes) * 100}%`,
                  }}
                  className={cn(
                    "min-w-0 overflow-hidden p-0.5",
                    b.kind === "estudio" ? "pr-0.5" : "px-0.5",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-full flex-col justify-start rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                      b.kind === "clase" && "border-transparent text-white",
                      b.kind === "extra" && "border-purple-300 bg-purple-100 text-purple-900",
                      b.kind === "estudio" &&
                        "border-dashed border-primary/50 bg-primary/5 text-primary",
                    )}
                    style={
                      b.kind === "clase" ? { backgroundColor: b.color ?? "#64748b" } : undefined
                    }
                    title={`${b.start}–${b.end} · ${b.label}`}
                  >
                    <span className="truncate">
                      {endRow - startRow >= 2 && (
                        <span className="mr-1 tabular-nums opacity-80">
                          {b.start.replace(":00", "")}
                        </span>
                      )}
                      {b.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tareas de la semana, un día por columna (incluye fin de semana) */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Tareas</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            {DIAS_AGENDA.map((weekday) => {
              const date = fechaDe(weekday);
              const iso = format(date, "yyyy-MM-dd");
              const dayTasks = tasksForDay(state, iso);
              return (
                <div
                  key={weekday}
                  className={cn(
                    "space-y-1.5 rounded-xl border p-3",
                    iso === hoy && "border-primary ring-1 ring-primary/30",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      weekday === todayWeekday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {WEEKDAY_SHORT[weekday]} {format(date, "d/M")}
                    {iso === hoy && " · HOY"}
                  </p>
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nada.</p>
                  ) : (
                    dayTasks.map((t) => (
                      <TaskRow key={t.id} task={t} state={state} showDelete={iso >= hoy} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

/** Agenda vertical de un día (vista móvil): bloques del día + tareas. */
function AgendaDia({
  weekday,
  date,
  onSelectDay,
}: {
  weekday: number;
  date: Date;
  onSelectDay: (weekday: number) => void;
}) {
  const state = useStudyStore();
  const now = new Date();
  const hoy = todayISO();
  const iso = format(date, "yyyy-MM-dd");

  const filas = useMemo(() => {
    const items: {
      key: string;
      start: string;
      end: string;
      kind: "clase" | "extra" | "estudio";
      label: string;
      color?: string | undefined;
    }[] = [];
    for (const slot of slotsForWeekday(state.schedule, weekday)) {
      const subject = state.subjects.find((s) => s.id === slot.subjectId);
      items.push({
        key: slot.id,
        start: slot.startTime,
        end: slot.endTime,
        kind: "clase",
        label: subject?.name ?? "Clase",
        color: subject?.color,
      });
    }
    for (const e of state.extras.filter((x) => x.weekdays.includes(weekday))) {
      items.push({ key: e.id, start: e.startTime, end: e.endTime, kind: "extra", label: e.name });
    }
    if (iso >= hoy) {
      freeWindowsForDay(state, iso, now).forEach((w, i) =>
        items.push({
          key: `estudio-${i}`,
          start: w.start,
          end: w.end,
          kind: "estudio",
          label: "Estudiar",
        }),
      );
    }
    return items.sort((a, b) => hhmmToMinutes(a.start) - hhmmToMinutes(b.start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, weekday, iso, hoy]);

  const dayTasks = tasksForDay(state, iso);

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Día de la semana" className="flex gap-1.5">
        {DIAS_AGENDA.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSelectDay(d)}
            aria-pressed={d === weekday}
            className={cn(
              "flex-1 rounded-full px-1 py-2 text-sm font-medium transition-colors",
              d === weekday
                ? "bg-primary text-primary-foreground"
                : "border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        ))}
      </div>

      <p className="text-sm font-medium capitalize">
        {format(date, "EEEE d 'de' MMMM", { locale: es })}
      </p>

      {filas.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Día sin clases ni actividades.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filas.map((f) => (
            <li
              key={f.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                f.kind === "estudio" && "border-dashed border-primary/50 bg-primary/5",
              )}
            >
              <span className="w-24 shrink-0 tabular-nums text-xs text-muted-foreground">
                {f.start}–{f.end}
              </span>
              {f.kind === "estudio" ? (
                <span className="flex-1 italic text-primary">Franja para estudiar</span>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: f.color ?? (f.kind === "extra" ? "#a855f7" : "#94a3b8"),
                    }}
                  />
                  <span className="truncate">{f.label}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tareas
        </p>
        {dayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada pendiente este día.</p>
        ) : (
          dayTasks.map((t) => <TaskRow key={t.id} task={t} state={state} showDelete={iso >= hoy} />)
        )}
      </div>
    </div>
  );
}
