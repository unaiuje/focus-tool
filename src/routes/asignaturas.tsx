import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyStore, addTask, setExamGrade } from "@/lib/study-store";
import { todayISO, uid } from "@/lib/study-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/asignaturas")({
  head: () => ({
    meta: [
      { title: "Asignaturas — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Tus 11 asignaturas de 4º ESO con tareas pendientes, exámenes y notas de cada una.",
      },
      { property: "og:title", content: "Asignaturas — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content:
          "Tareas, exámenes y notas organizadas por asignatura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AsignaturasPage,
});

function AsignaturasPage() {
  const state = useStudyStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Asignaturas
          </h1>
          <p className="text-sm text-muted-foreground">
            Toca una asignatura para ver sus tareas, exámenes y notas.
          </p>
        </div>

        <div className="space-y-2">
          {state.subjects.map((s) => {
            const pending = state.tasks.filter(
              (t) => t.subjectId === s.id && !t.done,
            );
            const exams = state.exams
              .filter((e) => e.subjectId === s.id)
              .sort((a, b) => b.date.localeCompare(a.date));
            const grades = exams
              .filter((e) => e.grade !== undefined)
              .map((e) => e.grade as number);
            const avg = grades.length
              ? grades.reduce((a, b) => a + b, 0) / grades.length
              : null;
            const open = openId === s.id;

            return (
              <div key={s.id} className="rounded-xl border bg-card">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenId(open ? null : s.id)}
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 font-medium">{s.name}</span>
                  {avg !== null && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        avg >= 7
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      Media {avg.toFixed(1)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {pending.length} pendientes
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open && (
                  <div className="space-y-4 border-t px-4 py-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Tareas pendientes
                      </p>
                      {pending.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nada pendiente.
                        </p>
                      ) : (
                        pending.map((t) => (
                          <TaskRow key={t.id} task={t} state={state} />
                        ))
                      )}
                      <form
                        className="flex gap-2 pt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!draft.trim()) return;
                          addTask({
                            id: uid(),
                            subjectId: s.id,
                            title: draft.trim(),
                            date: todayISO(),
                            kind: "pomodoro",
                          });
                          setDraft("");
                        }}
                      >
                        <Input
                          value={open ? draft : ""}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder={`Nueva tarea de ${s.name}…`}
                          className="flex-1"
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          <Plus className="size-4" />
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Exámenes y notas
                      </p>
                      {exams.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Sin exámenes registrados. Añádelos desde la sección
                          Exámenes.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {exams.map((e) => (
                            <li
                              key={e.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                            >
                              <span className="flex-1 font-medium">
                                {e.title}
                              </span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {format(
                                  new Date(e.date + "T12:00"),
                                  "d MMM yyyy",
                                  { locale: es },
                                )}
                              </span>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                placeholder="Nota"
                                defaultValue={e.grade ?? ""}
                                className="h-8 w-20"
                                onBlur={(ev) => {
                                  const v = parseFloat(ev.target.value);
                                  setExamGrade(
                                    e.id,
                                    Number.isNaN(v) ? undefined : v,
                                  );
                                }}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
