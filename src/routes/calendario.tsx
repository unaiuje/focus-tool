import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Timer, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MonthCalendar } from "@/components/MonthCalendar";
import { SimulacroDialog } from "@/components/SimulacroDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyStore, addExam, removeExam, setExamGrade } from "@/lib/study-store";
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
        content:
          "Un solo calendario con todos tus exámenes. Cuando pasa la fecha, apunta la nota ahí mismo.",
      },
      {
        property: "og:title",
        content: "Exámenes — Mi Curso 4º ESO",
      },
      {
        property: "og:description",
        content: "Calendario de exámenes con plan de repaso automático y apunte de notas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarioPage,
});

function CalendarioPage() {
  const state = useStudyStore();
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [simulacroExam, setSimulacroExam] = useState<Exam | null>(null);
  // Día marcado: alimenta la agenda bajo el calendario (visible en móvil)
  const [diaActivo, setDiaActivo] = useState(() => todayISO());

  const cambiarMes = (dir: 1 | -1) => {
    const nuevo = addMonths(mes, dir);
    setMes(nuevo);
    // La agenda debe mostrar siempre un día del mes visible
    setDiaActivo(format(nuevo, "yyyy-MM-dd"));
  };

  const hoy = todayISO();
  const proximos = state.exams
    .filter((e) => e.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Poner notas: pasados sin nota primero, luego las últimas puestas
  const pasados = state.exams.filter((e) => e.date < hoy);
  const sinNota = pasados
    .filter((e) => e.grade === undefined)
    .sort((a, b) => b.date.localeCompare(a.date));
  const conNota = pasados
    .filter((e) => e.grade !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

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
            Apunta la fecha y yo te pongo los repasos 7, 3 y 1 día antes. Cuando pasa el examen,
            apunta aquí la nota.
          </p>
        </div>

        {/* El calendario: uno solo, con todo */}
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

          <MonthCalendar
            state={state}
            month={mes}
            selectedDay={diaActivo}
            onSelectDay={setDiaActivo}
          />

          {/* Agenda del día marcado (útil sobre todo en móvil, celdas compactas) */}
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

        {/* Poner notas: los exámenes que ya pasaron */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Poner notas</h2>
          {sinNota.length === 0 && conNota.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cuando pase un examen, aparecerá aquí para que apuntes la nota.
            </p>
          ) : (
            <>
              {sinNota.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pendientes de nota
                  </p>
                  <ul className="space-y-1.5">
                    {sinNota.map((e) => (
                      <NotaRow key={e.id} exam={e} />
                    ))}
                  </ul>
                </>
              )}
              {conNota.length > 0 && (
                <>
                  <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Últimas notas
                  </p>
                  <ul className="space-y-1.5">
                    {conNota.map((e) => (
                      <NotaRow key={e.id} exam={e} />
                    ))}
                  </ul>
                </>
              )}
            </>
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

/** Fila de examen pasado con su nota editable inline. */
function NotaRow({ exam }: { exam: Exam }) {
  const subject = useStudyStore().subjects.find((s) => s.id === exam.subjectId);

  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: subject?.color ?? "#999" }}
      />
      <span className="min-w-0 flex-1 basis-40">
        <span className="font-medium">{exam.title}</span>
        <span className="block text-xs text-muted-foreground capitalize">
          {subject?.name} · {format(new Date(exam.date + "T12:00"), "d MMM yyyy", { locale: es })}
        </span>
      </span>
      <Input
        type="number"
        step="0.5"
        min="0"
        max="10"
        placeholder="Nota"
        defaultValue={exam.grade ?? ""}
        className="h-9 w-20 shrink-0"
        aria-label={`Nota de ${exam.title}`}
        onBlur={(ev) => {
          const v = parseFloat(ev.target.value);
          setExamGrade(exam.id, Number.isNaN(v) ? undefined : v);
        }}
      />
    </li>
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
          className={cn(selectClass)}
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
