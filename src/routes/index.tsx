import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Flame, Plus, Sparkles, Backpack } from "lucide-react";
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
import { useStudyStore, addTask } from "@/lib/study-store";
import {
  currentStreak,
  tasksForDay,
  todayISO,
} from "@/lib/study-utils";
import type { Task } from "@/lib/study-types";

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
  const [newSubject, setNewSubject] = useState("mates");

  const today = todayISO();
  const tasks = tasksForDay(state, today);
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const streak = currentStreak(state);

  const now = new Date();
  const weekday = now.getDay();
  const extrasHoy = state.extras.filter((e) => e.weekday === weekday);

  const nextExam = useMemo(
    () =>
      state.exams
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0],
    [state.exams, today],
  );

  // Progreso de la semana: % de tareas hechas de los últimos 7 días
  const weekPct = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) =>
      format(addDays(now, -i), "yyyy-MM-dd"),
    );
    const weekTasks = state.tasks.filter((t) => days.includes(t.date));
    if (!weekTasks.length) return 0;
    return Math.round(
      (weekTasks.filter((t) => t.done).length / weekTasks.length) * 100,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tasks]);

  const firstTask = pending[0];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {format(now, "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Hoy toca
          </h1>
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
                <p className="mt-1 truncate font-heading text-lg font-bold">
                  {nextExam.title}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {format(new Date(nextExam.date + "T12:00"), "EEEE d/M", {
                    locale: es,
                  })}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Ninguno a la vista
              </p>
            )}
          </div>
        </div>

        {extrasHoy.length > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold">
              Recuerda: hoy tienes extraescolares
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {extrasHoy.map((e) => (
                <li key={e.id}>
                  {e.name} · {e.startTime}–{e.endTime}
                </li>
              ))}
            </ul>
          </div>
        )}

        {firstTask && (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Empieza por aquí (solo una cosa)
            </p>
            <p className="mt-1 font-heading text-xl font-bold">
              {firstTask.title}
            </p>
            <p className="text-sm text-muted-foreground">
              {state.subjects.find((s) => s.id === firstTask.subjectId)?.name}
            </p>
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
              Nada pendiente hoy. Añade una tarea abajo o un examen en la
              sección de Exámenes.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  state={state}
                  onStart={setPomodoroTask}
                />
              ))}
            </div>
          )}

          <form
            className="flex flex-col gap-2 pt-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim()) return;
              addTask({
                subjectId: newSubject,
                title: newTitle.trim(),
                date: today,
                kind: "pomodoro",
              });
              setNewTitle("");
            }}
          >
            <Select value={newSubject} onValueChange={setNewSubject}>
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
      </div>

      <PomodoroDialog
        task={pomodoroTask}
        open={pomodoroTask !== null}
        onClose={() => setPomodoroTask(null)}
      />
    </AppLayout>
  );
}
