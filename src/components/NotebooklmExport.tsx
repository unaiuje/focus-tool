import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/lib/study-store";
import { buildNotebooklmExport, todayISO } from "@/lib/study-utils";
import { downloadText } from "@/lib/download";

/** Exporta todo el material del curso en un .md para usarlo como fuente en NotebookLM. */
export function NotebooklmExport() {
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
