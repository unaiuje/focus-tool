import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { TaskRow } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useStudyStore,
  addTask,
  setExamGrade,
  addSubject,
  updateSubject,
  removeSubject,
} from "@/lib/study-store";
import {
  buildNotebooklmExport,
  canRemoveSubject,
  subjectReferences,
  todayISO,
} from "@/lib/study-utils";
import { downloadText } from "@/lib/download";
import { SUBJECT_PALETTE } from "@/lib/study-types";
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
        content: "Tareas, exámenes y notas organizadas por asignatura.",
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
          <h1 className="font-heading text-3xl font-bold tracking-tight">Asignaturas</h1>
          <p className="text-sm text-muted-foreground">
            Toca una asignatura para ver sus tareas, exámenes y notas. Cada perfil tiene las suyas:
            añade, renombra o cambia el color.
          </p>
        </div>

        <div className="space-y-2">
          {state.subjects.map((s) => {
            const pending = state.tasks.filter((t) => t.subjectId === s.id && !t.done);
            const exams = state.exams
              .filter((e) => e.subjectId === s.id)
              .sort((a, b) => b.date.localeCompare(a.date));
            const grades = exams.filter((e) => e.grade !== undefined).map((e) => e.grade as number);
            const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
            const open = openId === s.id;

            return (
              <div key={s.id} className="rounded-xl border bg-card">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenId(open ? null : s.id)}
                >
                  <span className="size-3 rounded-full" style={{ backgroundColor: s.color }} />
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
                  <span className="text-xs text-muted-foreground">{pending.length} pendientes</span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open && (
                  <div className="space-y-4 border-t px-4 py-4">
                    <SubjectEditor state={state} subjectId={s.id} />

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Tareas pendientes
                      </p>
                      {pending.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nada pendiente.</p>
                      ) : (
                        pending.map((t) => <TaskRow key={t.id} task={t} state={state} />)
                      )}
                      <form
                        className="flex gap-2 pt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!draft.trim()) return;
                          addTask({
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
                        <Button
                          type="submit"
                          variant="secondary"
                          size="icon"
                          aria-label={`Añadir tarea de ${s.name}`}
                        >
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
                          Sin exámenes registrados. Añádelos desde la sección Exámenes.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {exams.map((e) => (
                            <li
                              key={e.id}
                              className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border px-3 py-2 text-sm"
                            >
                              <span className="min-w-0 flex-1 basis-40 font-medium">{e.title}</span>
                              <span className="shrink-0 text-xs text-muted-foreground capitalize">
                                {format(new Date(e.date + "T12:00"), "d MMM yyyy", { locale: es })}
                              </span>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                placeholder="Nota"
                                defaultValue={e.grade ?? ""}
                                className="h-9 w-20 shrink-0"
                                onBlur={(ev) => {
                                  const v = parseFloat(ev.target.value);
                                  setExamGrade(e.id, Number.isNaN(v) ? undefined : v);
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

        <NuevaAsignatura />

        <ExportarNotebooklm />
      </div>
    </AppLayout>
  );
}

/** Renombrar, cambiar color y borrar una asignatura del perfil activo. */
function SubjectEditor({
  state,
  subjectId,
}: {
  state: ReturnType<typeof useStudyStore>;
  subjectId: string;
}) {
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (!subject) return null;
  const refs = subjectReferences(state, subjectId);
  const canRemove = canRemoveSubject(state, subjectId);
  const motivos = [
    refs.tasks > 0 && `${refs.tasks} tarea(s)`,
    refs.exams > 0 && `${refs.exams} examen(es)`,
    refs.slots > 0 && `${refs.slots} franja(s) de horario`,
  ].filter(Boolean);
  const motivo = `No se puede borrar: la usan ${motivos.join(", ")}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        defaultValue={subject.name}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== subject.name) {
            updateSubject(subjectId, { name: v });
          } else {
            e.target.value = subject.name;
          }
        }}
        className="h-8 max-w-48 flex-1"
        aria-label={`Nombre de ${subject.name}`}
      />
      <input
        type="color"
        defaultValue={subject.color}
        onChange={(e) => updateSubject(subjectId, { color: e.target.value })}
        className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
        aria-label={`Color de ${subject.name}`}
      />
      <Button
        size="icon"
        variant="ghost"
        className="ml-auto size-10 shrink-0 text-muted-foreground"
        disabled={!canRemove}
        onClick={() => removeSubject(subjectId)}
        title={canRemove ? "Borrar asignatura" : motivo}
        aria-label={`Borrar ${subject.name}`}
      >
        <Trash2 className="size-4" />
      </Button>
      {!canRemove && <p className="w-full text-xs text-muted-foreground">{motivo}</p>}
    </div>
  );
}

/** Exporta todo el material del curso en un .md para usarlo como fuente en NotebookLM. */
function ExportarNotebooklm() {
  const state = useStudyStore();

  return (
    <section className="space-y-2 rounded-xl border border-dashed bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Llevar a NotebookLM</h2>
      <p className="text-sm text-muted-foreground">
        Descarga un archivo con tus exámenes, notas, horario y tarjetas de cada asignatura. Súbelo a
        NotebookLM como fuente y podrás preguntarle sobre TU material.
      </p>
      <Button
        variant="secondary"
        onClick={() =>
          downloadText(`mi-curso-notebooklm-${todayISO()}.md`, buildNotebooklmExport(state))
        }
      >
        Descargar .md
      </Button>
    </section>
  );
}

/** Alta de asignatura propia del perfil (p. ej. para otro curso). */
function NuevaAsignatura() {
  const state = useStudyStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(
    () => SUBJECT_PALETTE[state.subjects.length % SUBJECT_PALETTE.length] ?? "#2563eb",
  );

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-dashed bg-card p-4 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        addSubject({ name, color });
        setName("");
        setColor(
          SUBJECT_PALETTE[(state.subjects.length + 1) % SUBJECT_PALETTE.length] ?? "#2563eb",
        );
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nueva asignatura…"
        className="flex-1"
        maxLength={40}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
        aria-label="Color de la asignatura"
      />
      <Button type="submit" variant="secondary" disabled={!name.trim()}>
        <Plus className="size-4" /> Añadir
      </Button>
    </form>
  );
}
