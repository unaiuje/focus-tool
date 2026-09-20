import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Timer, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SimulacroDialog } from "@/components/SimulacroDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyStore, addExam, removeExam } from "@/lib/study-store";
import { todayISO } from "@/lib/study-utils";
import { selectClass } from "@/lib/ui";
import type { Exam } from "@/lib/study-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Exámenes — Mi Curso 4º ESO" },
      {
        name: "description",
        content: "Apunta tus exámenes y la app crea sola los repasos de los 7, 3 y 1 días antes.",
      },
      {
        property: "og:title",
        content: "Exámenes — Mi Curso 4º ESO",
      },
      {
        property: "og:description",
        content: "Calendario de exámenes con plan de repaso automático antes de cada uno.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarioPage,
});

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Iniciales para la rejilla compacta del móvil
const DIAS_INICIALES = ["L", "M", "X", "J", "V", "S", "D"];

function CalendarioPage() {
  const state = useStudyStore();
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [simulacroExam, setSimulacroExam] = useState<Exam | null>(null);
  // Día marcado en la rejilla compacta del móvil (solo lo usa el render md:hidden)
  const [diaActivo, setDiaActivo] = useState(() => todayISO());

  const cambiarMes = (dir: 1 | -1) => {
    const nuevo = addMonths(mes, dir);
    setMes(nuevo);
    // La agenda debe mostrar siempre un día del mes visible
    setDiaActivo(format(nuevo, "yyyy-MM-dd"));
  };

  const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const finMes = endOfMonth(mes);

  const proximos = state.exams
    .filter((e) => e.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date));

  const examsDiaActivo = state.exams
    .filter((e) => e.date === diaActivo)
    .sort((a, b) => a.title.localeCompare(b.title));
  const tareasDiaActivo = state.tasks.filter((t) => t.date === diaActivo && !t.done).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Exámenes</h1>
          <p className="text-sm text-muted-foreground">
            Apunta la fecha y yo te pongo los repasos 7, 3 y 1 día antes.
          </p>
        </div>

        {/* Calendario */}
        <section className="rounded-xl border bg-card p-4">
          <header className="mb-3 flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="font-heading font-semibold capitalize">
              {format(mes, "MMMM yyyy", { locale: es })}
            </h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </header>

          {/* Móvil: celdas compactas con puntos + agenda del día marcado */}
          <div className="md:hidden">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted-foreground">
              {DIAS_INICIALES.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {dias.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const exams = state.exams.filter((e) => e.date === iso);
                const tareas = state.tasks.filter((t) => t.date === iso && !t.done);
                const fuera = !isSameMonth(day, mes);
                const esHoy = isSameDay(day, new Date());
                const esActivo = iso === diaActivo;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDiaActivo(iso)}
                    aria-pressed={esActivo}
                    aria-label={`${format(day, "d 'de' MMMM", { locale: es })}${
                      exams.length > 0 ? `: ${exams.map((e) => e.title).join(", ")}` : ""
                    }`}
                    className={cn(
                      "flex aspect-square min-h-10 w-full flex-col items-center justify-center gap-1 rounded-lg border text-sm",
                      fuera && "opacity-40",
                      esActivo && "border-primary bg-primary/10",
                      esHoy && !esActivo && "border-primary ring-1 ring-primary/30",
                    )}
                  >
                    <span className={cn("text-xs", esHoy && "font-bold text-primary")}>
                      {format(day, "d")}
                    </span>
                    <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                      {exams.slice(0, 3).map((e) => (
                        <span key={e.id} className="size-1.5 rounded-full bg-destructive" />
                      ))}
                      {exams.length === 0 &&
                        tareas
                          .slice(0, 3)
                          .map((t) => (
                            <span key={t.id} className="size-1.5 rounded-full bg-primary/60" />
                          ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Agenda del día marcado */}
            <div className="mt-3 rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {format(parseISO(diaActivo), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              {examsDiaActivo.length === 0 && tareasDiaActivo === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Nada apuntado para este día.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {examsDiaActivo.map((e) => {
                    const subject = state.subjects.find((s) => s.id === e.subjectId);
                    return (
                      <li key={e.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: subject?.color ?? "#999" }}
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {subject?.name}
                        </span>
                      </li>
                    );
                  })}
                  {tareasDiaActivo > 0 && (
                    <li className="text-xs text-muted-foreground">
                      {tareasDiaActivo} tarea{tareasDiaActivo > 1 ? "s" : ""} pendiente
                      {tareasDiaActivo > 1 ? "s" : ""}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Escritorio: rejilla mensual completa con títulos de examen */}
          <div className="hidden md:block">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
              {DIAS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {dias.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const exams = state.exams.filter((e) => e.date === iso);
                const tareas = state.tasks.filter((t) => t.date === iso);
                const fuera = !isSameMonth(day, mes) && day <= finMes === false;
                return (
                  <div
                    key={iso}
                    className={cn(
                      "min-h-16 rounded-lg border p-1 text-left",
                      !isSameMonth(day, mes) && "opacity-40",
                      fuera && "opacity-40",
                      isSameDay(day, new Date()) && "border-primary ring-1 ring-primary/30",
                    )}
                  >
                    <span className="text-[11px] text-muted-foreground">{format(day, "d")}</span>
                    {exams.map((e) => (
                      <p
                        key={e.id}
                        className="mt-0.5 truncate rounded bg-destructive/10 px-1 text-[10px] font-semibold text-destructive"
                        title={e.title}
                      >
                        {e.title}
                      </p>
                    ))}
                    {tareas.length > 0 && exams.length === 0 && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {tareas.length} tarea{tareas.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <NuevoExamen />

        {/* Próximos exámenes */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Próximos exámenes</h2>
          {proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes exámenes apuntados. Añade uno arriba.
            </p>
          ) : (
            <ul className="space-y-2">
              {proximos.map((e) => {
                const dias = differenceInCalendarDays(parseISO(e.date), new Date());
                const subject = state.subjects.find((s) => s.id === e.subjectId);
                const simulacros = state.simulacros
                  .filter((s) => s.examId === e.id)
                  .sort((a, b) => a.date.localeCompare(b.date));
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3"
                  >
                    <span
                      className="mt-1.5 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: subject?.color ?? "#999" }}
                    />
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject?.name} ·{" "}
                        {format(parseISO(e.date), "EEEE d 'de' MMMM", {
                          locale: es,
                        })}
                      </p>
                      {e.topics && (
                        <p className="mt-1 text-xs text-muted-foreground">Temas: {e.topics}</p>
                      )}
                      {simulacros.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Simulacros: {simulacros.map((s) => s.score.toFixed(1)).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                        {dias === 0 ? "¡Hoy!" : `En ${dias} días`}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSimulacroExam(e)}
                        aria-label={`Hacer simulacro de ${e.title}`}
                      >
                        <Timer className="size-3.5" />
                        Simulacro
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeExam(e.id)}
                        aria-label="Borrar examen"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <SimulacroDialog
          state={state}
          exam={simulacroExam}
          open={simulacroExam !== null}
          onClose={() => setSimulacroExam(null)}
        />
      </div>
    </AppLayout>
  );
}

function NuevoExamen() {
  const state = useStudyStore();
  const [subjectId, setSubjectId] = useState(() => state.subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [topics, setTopics] = useState("");

  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!title.trim() || !subjectId) return;
        addExam({ subjectId, title: title.trim(), date, topics: topics.trim() });
        setTitle("");
        setTopics("");
      }}
    >
      <h2 className="font-heading text-lg font-semibold">Añadir examen</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          className={selectClass}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          aria-label="Asignatura"
        >
          {state.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tema del examen"
        />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Input
        value={topics}
        onChange={(e) => setTopics(e.target.value)}
        placeholder="Qué entra (opcional)"
      />
      <Button type="submit" className="w-full sm:w-auto">
        <Plus className="size-4" />
        Añadir y crear repasos
      </Button>
    </form>
  );
}
