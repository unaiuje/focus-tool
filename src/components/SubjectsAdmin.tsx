import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSubject, removeSubject, updateSubject, useStudyStore } from "@/lib/study-store";
import { canRemoveSubject, subjectReferences } from "@/lib/study-utils";
import { SUBJECT_PALETTE } from "@/lib/study-types";

/** Gestión de asignaturas del perfil activo: renombrar, color, borrar y alta. */
export function SubjectsAdmin() {
  return (
    <div className="space-y-4">
      <NuevaAsignatura />
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-heading text-lg font-semibold">Tus asignaturas</h2>
        <SubjectList />
      </section>
    </div>
  );
}

function SubjectList() {
  const state = useStudyStore();
  return (
    <div className="space-y-4">
      {state.subjects.map((s) => (
        <SubjectEditor key={s.id} state={state} subjectId={s.id} />
      ))}
    </div>
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
