import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";
import { TaskRow } from "@/components/TaskRow";
import { useStudyStore } from "@/lib/study-store";
import { slotsForWeekday, tasksForDay } from "@/lib/study-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/semana")({
  head: () => ({
    meta: [
      { title: "Plan semanal — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Vista de tu semana de estudio: tareas y extraescolares repartidas por día para no saturarte.",
      },
      { property: "og:title", content: "Plan semanal — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content: "Reparte la carga de estudio por días y evita hacerlo todo el último día.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SemanaPage,
});

function SemanaPage() {
  const state = useStudyStore();
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Tu semana</h1>
          <p className="text-sm text-muted-foreground">
            Así está repartida la carga. Si un día va muy lleno, avisa y lo movemos.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const dayTasks = tasksForDay(state, iso);
            // Agenda fija del día: clases con su color + extraescolares
            const clases = slotsForWeekday(state.schedule, day.getDay()).map((s) => {
              const subject = state.subjects.find((x) => x.id === s.subjectId);
              return {
                id: s.id,
                start: s.startTime,
                end: s.endTime,
                label: subject?.name ?? "Clase",
                color: subject?.color,
                kind: "clase" as const,
              };
            });
            const extras = state.extras
              .filter((e) => e.weekdays.includes(day.getDay()))
              .map((e) => ({
                id: e.id,
                start: e.startTime,
                end: e.endTime,
                label: e.name,
                color: undefined,
                kind: "extra" as const,
              }));
            const agenda = [...clases, ...extras].sort((a, b) => a.start.localeCompare(b.start));
            const isToday = isSameDay(day, new Date());
            return (
              <section
                key={iso}
                className={cn(
                  "rounded-xl border bg-card p-4",
                  isToday && "border-primary ring-1 ring-primary/30",
                )}
              >
                <header className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-heading font-semibold capitalize">
                    {format(day, "EEEE", { locale: es })}
                    {isToday && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        HOY
                      </span>
                    )}
                  </h2>
                  <span className="text-xs text-muted-foreground">{format(day, "d/M")}</span>
                </header>

                {agenda.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {agenda.map((a) => (
                      <li
                        key={`${a.kind}-${a.id}`}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                          a.kind === "clase"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {a.kind === "clase" && a.color && (
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: a.color }}
                          />
                        )}
                        <span className="truncate">{a.label}</span>
                        <span className="ml-auto shrink-0 tabular-nums opacity-70">
                          {a.start}–{a.end}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Día libre de tareas</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayTasks.map((t) => (
                      <TaskRow key={t.id} task={t} state={state} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
