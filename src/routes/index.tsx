import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Backpack, Lightbulb, Play, Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PomodoroDialog } from "@/components/PomodoroDialog";
import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudyStore, addTask, completeChecklistToday } from "@/lib/study-store";
import {
  bestStudyWindow,
  busyIntervalsForDay,
  daysToTermEnd,
  dueCardsToday,
  freeWindowsForDay,
  hhmmToMinutes,
  tasksForDay,
  todayISO,
} from "@/lib/study-utils";
import { useNow } from "@/hooks/use-now";
import type { StudyState, Task } from "@/lib/study-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoy toca — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Tu día completo: clases, extraescolares, huecos para estudiar y tareas ordenadas por prioridad.",
      },
      { property: "og:title", content: "Hoy toca — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content:
          "Organizador de estudio diario con Pomodoro, repaso espaciado y seguimiento de notas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HoyPage,
});

type FilaDia = {
  start: string;
  end: string;
  kind: "clase" | "extra" | "estudio";
  label: string;
};

function HoyPage() {
  const state = useStudyStore();
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState<string | null>(null);

  const today = todayISO();
  const tasks = tasksForDay(state, today);
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  // Se refresca cada minuto: la marca "Ahora" y la franja sugerida no se
  // quedan congeladas si la pestaña queda abierta.
  const now = useNow();
  const nowHHmm = format(now, "HH:mm");
  const franja = bestStudyWindow(state, now);
  const tieneFijos = state.schedule.length > 0 || state.extras.length > 0;
  const tarjetasPendientes = dueCardsToday(state);
  const esDomingo = now.getDay() === 0;
  const diasEvaluacion = daysToTermEnd(state, now);
  // Si la asignatura elegida se borró, cae a la primera disponible
  const newSubjectId = state.subjects.some((s) => s.id === newSubject)
    ? (newSubject as string)
    : (state.subjects[0]?.id ?? "");

  const nextExam = useMemo(
    () =>
      state.exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0],
    [state.exams, today],
  );

  // Timeline del día: clases + extraescolares + huecos de estudio, por orden horario
  const filasDia = useMemo<FilaDia[]>(() => {
    const filas: FilaDia[] = [
      ...busyIntervalsForDay(state, today).map((b) => ({
        start: b.start,
        end: b.end,
        kind: b.kind,
        label: b.label,
      })),
      ...freeWindowsForDay(state, today, now).map((w) => ({
        start: w.start,
        end: w.end,
        kind: "estudio" as const,
        label: "Franja para estudiar",
      })),
    ];
    return filas.sort((a, b) => hhmmToMinutes(a.start) - hhmmToMinutes(b.start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, today, now.getHours(), now.getMinutes()]);

  const firstTask = pending[0];

  const abrirPomodoro = (task: Task | null) => {
    setPomodoroTask(task);
    setPomodoroOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {format(now, "EEEE d 'de' MMMM", { locale: es })}
            {diasEvaluacion !== null && (
              <span className="normal-case">
                {" "}
                · quedan {diasEvaluacion} día{diasEvaluacion === 1 ? "" : "s"} de evaluación
              </span>
            )}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Hoy toca</h1>
        </div>

        {/* Próximo examen: banner compacto */}
        {nextExam && (
          <Link
            to="/calendario"
            className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <Backpack className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-medium">{nextExam.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {(() => {
                const d = differenceInCalendarDays(parseISO(nextExam.date), now);
                return d === 0 ? "¡Hoy!" : `En ${d} día${d === 1 ? "" : "s"}`;
              })()}
            </span>
          </Link>
        )}

        {/* Timeline del día: clases, extraescolares y huecos para estudiar */}
        <section className="rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Tu día</p>
          {filasDia.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Día sin horario fijo. Añade tus{" "}
              <Link
                to="/ajustes"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                clases y extraescolares
              </Link>{" "}
              y aquí verás tu jornada entera.
            </p>
          ) : (
            <ul className="mt-1 space-y-1">
              {filasDia.map((f, i) => {
                const esAhora = f.start <= nowHHmm && nowHHmm < f.end;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 text-sm",
                      esAhora && "bg-primary/5",
                    )}
                  >
                    <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                      {f.start}–{f.end}
                    </span>
                    {f.kind === "estudio" ? (
                      <>
                        <span className="min-w-0 flex-1 italic text-muted-foreground">
                          {f.label}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirPomodoro(null)}
                          aria-label="Empezar pomodoro en esta franja"
                        >
                          <Play className="size-3.5" />
                          Pomodoro
                        </Button>
                      </>
                    ) : (
                      <span className="min-w-0 flex-1">
                        <span
                          className="mr-1.5 inline-block size-2 rounded-full align-middle"
                          style={{
                            backgroundColor: f.kind === "extra" ? "#a855f7" : "#94a3b8",
                          }}
                        />
                        {f.label}
                        {f.kind === "extra" && (
                          <span className="text-xs text-muted-foreground"> (extraescolar)</span>
                        )}
                      </span>
                    )}
                    {esAhora && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        AHORA
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {!tieneFijos && filasDia.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Añade tus{" "}
              <Link
                to="/ajustes"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                clases y extraescolares
              </Link>{" "}
              para que el plan respete tus horas.
            </p>
          )}
        </section>

        {(tarjetasPendientes.length > 0 || esDomingo) && (
          <div className="flex flex-wrap gap-2">
            {tarjetasPendientes.length > 0 && (
              <Link
                to="/estudio"
                className="flex-1 rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {tarjetasPendientes.length} tarjeta
                {tarjetasPendientes.length > 1 ? "s" : ""} para repasar hoy →
              </Link>
            )}
            {esDomingo && (
              <Link
                to="/progreso"
                className="flex-1 rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                Tu informe de la semana está listo →
              </Link>
            )}
          </div>
        )}

        {firstTask && (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Empieza por aquí (solo una cosa)
            </p>
            <p className="mt-1 font-heading text-xl font-bold">{firstTask.title}</p>
            <p className="text-sm text-muted-foreground">
              {state.subjects.find((s) => s.id === firstTask.subjectId)?.name}
            </p>
            {franja && (
              <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Franja buena hoy:{" "}
                  <span className="font-medium tabular-nums">
                    {franja.start}–{franja.end}
                  </span>{" "}
                  · {franja.reason}
                </span>
              </p>
            )}
            <Button
              size="lg"
              className="mt-4 w-full sm:w-auto"
              onClick={() => abrirPomodoro(firstTask)}
            >
              Empezar Pomodoro de 25 min
            </Button>
          </div>
        )}

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">
            Tareas de hoy{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {done.length}/{tasks.length} hechas
            </span>
          </h2>
          {tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nada pendiente hoy. Añade una tarea abajo o un examen en la sección de Exámenes.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  state={state}
                  onStart={(task) => abrirPomodoro(task)}
                />
              ))}
            </div>
          )}

          <form
            className="flex flex-col gap-2 pt-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim() || !newSubjectId) return;
              addTask({
                subjectId: newSubjectId,
                title: newTitle.trim(),
                date: today,
                kind: "pomodoro",
              });
              setNewTitle("");
            }}
          >
            <Select value={newSubjectId} onValueChange={(v) => setNewSubject(v)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nueva tarea para hoy…"
              className="flex-1"
            />
            <Button type="submit" variant="secondary">
              <Plus className="size-4" /> Añadir
            </Button>
          </form>
        </section>

        <ChecklistNocturna state={state} now={now} />
      </div>

      <PomodoroDialog
        task={pomodoroTask}
        open={pomodoroOpen}
        onClose={() => setPomodoroOpen(false)}
      />
    </AppLayout>
  );
}

/** Ritual de 30 segundos por la noche: cerrar el día sin sorpresas. */
function ChecklistNocturna({ state, now }: { state: StudyState; now: Date }) {
  const [deberes, setDeberes] = useState(false);
  const [repasos, setRepasos] = useState(false);
  const [mochila, setMochila] = useState(false);

  const hoy = todayISO();
  const hecho = state.checklistDays.includes(hoy);
  const todas = deberes && repasos && mochila;
  useEffect(() => {
    if (todas) completeChecklistToday();
  }, [todas]);

  if (now.getHours() < 18) return null;

  const manana = format(addDays(now, 1), "yyyy-MM-dd");
  const examenesManana = state.exams.filter((e) => e.date === manana);
  const tareasManana = tasksForDay(state, manana).filter((t) => !t.done).length;
  const tarjetasHoy = dueCardsToday(state).length;

  if (hecho) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        ✓ Checklist de esta noche hecha. Mañana sin sorpresas.
      </div>
    );
  }

  const item = (label: string, checked: boolean, toggle: () => void, hint?: string) => (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={checked}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-accent"
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40",
        )}
      >
        {checked && "✓"}
      </span>
      <span className={cn("flex-1", checked && "text-muted-foreground line-through")}>{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );

  return (
    <section className="space-y-1 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold">Checklist de esta noche</p>
      <p className="mb-2 text-xs text-muted-foreground">
        30 segundos ahora te ahorran madrugones mañana.
      </p>
      {item("Apuntar los deberes de mañana", deberes, () => setDeberes((v) => !v))}
      <div className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm">
        <span className="size-7 shrink-0" />
        <span className="flex-1 text-muted-foreground">
          {examenesManana.length > 0
            ? `⚠️ Mañana: examen de ${examenesManana
                .map((e) => state.subjects.find((s) => s.id === e.subjectId)?.name ?? "?")
                .join(", ")}`
            : "Mañana sin exámenes"}
        </span>
        <span className="text-xs text-muted-foreground">
          {tareasManana > 0 && `${tareasManana} tarea${tareasManana > 1 ? "s" : ""}`}
          {tareasManana > 0 && tarjetasHoy > 0 && " · "}
          {tarjetasHoy > 0 && `${tarjetasHoy} tarjeta${tarjetasHoy > 1 ? "s" : ""}`}
        </span>
      </div>
      {item("Repasar lo pendiente (tarjetas, repasos)", repasos, () => setRepasos((v) => !v))}
      {item("Dejar la mochila lista", mochila, () => setMochila((v) => !v))}
    </section>
  );
}
