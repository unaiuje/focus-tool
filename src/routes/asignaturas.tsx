import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useStudyStore } from "@/lib/study-store";
import { selectClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/asignaturas")({
  head: () => ({
    meta: [
      { title: "Asignaturas — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Tu expediente de 4º ESO: nota media, exámenes con su nota y historial de tareas de cada asignatura.",
      },
      { property: "og:title", content: "Asignaturas — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content: "Medias, exámenes e historial de cada asignatura, en solo lectura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AsignaturasPage,
});

type Orden = "nombre" | "media" | "pendientes";

const MEDIA_SIN_NOTA = -1;

function AsignaturasPage() {
  const state = useStudyStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("nombre");

  const mediaDe = (subjectId: string): number | null => {
    const grades = state.exams
      .filter((e) => e.subjectId === subjectId && e.grade !== undefined)
      .map((e) => e.grade as number);
    if (grades.length === 0) return null;
    return grades.reduce((a, b) => a + b, 0) / grades.length;
  };

  const pendientesDe = (subjectId: string) =>
    state.tasks.filter((t) => t.subjectId === subjectId && !t.done).length;

  const subjects = [...state.subjects].sort((a, b) => {
    if (orden === "nombre") return a.name.localeCompare(b.name);
    if (orden === "media") {
      const ma = mediaDe(a.id) ?? MEDIA_SIN_NOTA;
      const mb = mediaDe(b.id) ?? MEDIA_SIN_NOTA;
      return mb - ma; // mejor media primero; sin nota al final
    }
    return pendientesDe(b.id) - pendientesDe(a.id);
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Asignaturas</h1>
            <p className="text-sm text-muted-foreground">
              Tu expediente: medias, exámenes e historial. Para editar asignaturas ve a{" "}
              <Link
                to="/ajustes"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Ajustes
              </Link>
              .
            </p>
          </div>
          <select
            className={cn(selectClass, "w-44")}
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            aria-label="Ordenar asignaturas"
          >
            <option value="nombre">Por nombre</option>
            <option value="media">Por nota media</option>
            <option value="pendientes">Por pendientes</option>
          </select>
        </div>

        <div className="space-y-2">
          {subjects.map((s) => {
            const pending = pendientesDe(s.id);
            const exams = state.exams
              .filter((e) => e.subjectId === s.id)
              .sort((a, b) => b.date.localeCompare(a.date));
            const avg = mediaDe(s.id);
            const history = state.tasks
              .filter((t) => t.subjectId === s.id && t.done)
              .sort((a, b) => b.date.localeCompare(a.date));
            const open = openId === s.id;

            return (
              <div key={s.id} className="rounded-xl border bg-card">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenId(open ? null : s.id)}
                  aria-expanded={open}
                >
                  <span className="size-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 font-medium">{s.name}</span>
                  {avg !== null ? (
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
                  ) : (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                      Sin notas
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{pending} pendientes</span>
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
                              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm"
                            >
                              <span className="min-w-0 flex-1 basis-40 font-medium">{e.title}</span>
                              <span className="shrink-0 text-xs text-muted-foreground capitalize">
                                {format(new Date(e.date + "T12:00"), "d MMM yyyy", { locale: es })}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                                  e.grade === undefined
                                    ? "bg-secondary text-secondary-foreground"
                                    : e.grade >= 7
                                      ? "bg-primary/10 text-primary"
                                      : "bg-destructive/10 text-destructive",
                                )}
                              >
                                {e.grade !== undefined ? e.grade.toFixed(1) : "sin nota"}
                              </span>
                              {e.topics && (
                                <p className="w-full text-xs text-muted-foreground">
                                  Temas: {e.topics}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="pt-1 text-xs text-muted-foreground">
                        Las notas se ponen desde la sección{" "}
                        <Link
                          to="/calendario"
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Exámenes
                        </Link>
                        , cuando pasa la fecha del examen.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Historial de tareas
                      </p>
                      {history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Todavía no has completado tareas de esta asignatura.
                        </p>
                      ) : (
                        <>
                          <ul className="space-y-1">
                            {history.slice(0, 10).map((t) => (
                              <li
                                key={t.id}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <span className="text-primary">✓</span>
                                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                                <span className="shrink-0 text-xs capitalize">
                                  {format(new Date(t.date + "T12:00"), "d MMM", { locale: es })}
                                </span>
                                {t.result && (
                                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                                    {t.result === "facil"
                                      ? "fácil"
                                      : t.result === "regular"
                                        ? "regular"
                                        : "mal"}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {history.length > 10 && (
                            <p className="text-xs text-muted-foreground">
                              …y {history.length - 10} más.
                            </p>
                          )}
                        </>
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
