import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Flame, Lightbulb, Plus, Sparkles, Backpack } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PomodoroDialog } from "@/components/PomodoroDialog";
import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  busyIntervalsToday,
  currentStreak,
  daysToTermEnd,
  dueCardsToday,
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
          "Tu plan de estudio de hoy: tareas ordenadas por prioridad, temporizador Pomodoro y racha diaria para sacar la máxima nota en 4º de la ESO.",
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

function HoyPage() {
  const state = useStudyStore();
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState<string | null>(null);

  const today = todayISO();
  const tasks = tasksForDay(state, today);
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const streak = currentStreak(state);

  // Se refresca cada minuto: la marca "Ahora" y la franja sugerida no se
  // quedan congeladas si la pestaña queda abierta.
  const now = useNow();
  const busyHoy = busyIntervalsToday(state, now);
  const nowHHmm = format(now, "HH:mm");
  const actual = busyHoy.find((b) => b.start <= nowHHmm && nowHHmm < b.end);
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

  // Progreso de la semana: % de tareas hechas de los últimos 7 días
  const weekPct = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => format(addDays(now, -i), "yyyy-MM-dd"));
    const weekTasks = state.tasks.filter((t) => days.includes(t.date));
    if (!weekTasks.length) return 0;
    return Math.round((weekTasks.filter((t) => t.done).length / weekTasks.length) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tasks]);

  const firstTask = pending[0];

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

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="size-4 text-primary" /> Racha
            </div>
            <p className="mt-1 font-heading text-2xl font-bold">
              {streak} {streak === 1 ? "día" : "días"}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" /> Semana
            </div>
            <p className="mt-1 font-heading text-2xl font-bold">{weekPct}%</p>
            <Progress value={weekPct} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Backpack className="size-4 text-primary" /> Próximo examen
            </div>
            {nextExam ? (
              <>
                <p className="mt-1 truncate font-heading text-lg font-bold">{nextExam.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {format(new Date(nextExam.date + "T12:00"), "EEEE d/M", {
                    locale: es,
                  })}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Ninguno a la vista</p>
            )}
          </div>
        </div>

        {!tieneFijos ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Añade tus{" "}
            <Link
              to="/horario"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              clases y extraescolares
            </Link>{" "}
            y el plan respetará tus horas.
          </div>
        ) : (
          busyHoy.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-semibold">Tu día fijo</p>
              <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {busyHoy.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {b.start}–{b.end}
                    </span>
                    <span>{b.label}</span>
                    {b.kind === "extra" && <span className="text-xs">(extraescolar)</span>}
                    {b === actual && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        AHORA
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}

        {(tarjetasPendientes.length > 0 || esDomingo) && (
          <div className="flex flex-wrap gap-2">
            {tarjetasPendientes.length > 0 && (
              <Link
                to="/tarjetas"
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
              onClick={() => setPomodoroTask(firstTask)}
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
                <TaskRow key={t.id} task={t} state={state} onStart={setPomodoroTask} />
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
        open={pomodoroTask !== null}
        onClose={() => setPomodoroTask(null)}
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
