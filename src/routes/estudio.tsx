import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Sparkles, Timer, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { ReviewSession } from "@/components/ReviewSession";
import { SimulacroDialog } from "@/components/SimulacroDialog";
import { SubjectDot } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FOCUS_MIN, usePomodoro } from "@/hooks/use-pomodoro";
import {
  addCard,
  addCardsBulk,
  deleteCard,
  gradeCard,
  logSession,
  useStudyStore,
} from "@/lib/study-store";
import { LEITNER_INTERVALS, dueCardsToday, todayISO } from "@/lib/study-utils";
import { selectClass } from "@/lib/ui";
import type { Exam } from "@/lib/study-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/estudio")({
  head: () => ({
    meta: [
      { title: "Estudio — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Todo lo de estudiar en un sitio: repaso espaciado de tarjetas, pomodoro y simulacros de examen.",
      },
      { property: "og:title", content: "Estudio — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content: "Tarjetas con repetición espaciada, pomodoro y simulacros de examen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstudioPage,
});

function EstudioPage() {
  const state = useStudyStore();
  // Elevado a la ruta: el temporizador sigue corriendo al cambiar de pestaña
  // (Radix desmonta los TabsContent inactivos).
  const pom = usePomodoro({ onFocusComplete: () => logSession(FOCUS_MIN) });
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);

  if (sessionIds) {
    return (
      <AppLayout>
        <ReviewSession ids={sessionIds} onFinish={() => setSessionIds(null)} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Estudio</h1>
          <p className="text-sm text-muted-foreground">
            Repasa tarjetas, pon un pomodoro o haz un simulacro: todo lo de estudiar en un sitio.
          </p>
        </div>

        <Tabs defaultValue="repaso">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="repaso">Repaso</TabsTrigger>
            <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
            <TabsTrigger value="simulacros">Simulacros</TabsTrigger>
          </TabsList>

          <TabsContent value="repaso" className="mt-4 space-y-6">
            <RepasoDelDia onStart={setSessionIds} />
            <NuevaTarjeta />
            <ListaTarjetas />
          </TabsContent>

          <TabsContent value="pomodoro" className="mt-4">
            <section className="rounded-xl border bg-card p-6">
              <div className="mb-4 text-center">
                <p className="font-heading text-xl font-bold">Sesión libre</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  25 minutos de foco, 5 de descanso. Cada pomodoro completo apunta minutos de
                  estudio en tu Progreso.
                </p>
              </div>
              <PomodoroTimer
                size="page"
                phase={pom.phase}
                secondsLeft={pom.secondsLeft}
                running={pom.running}
                onToggle={pom.toggle}
                onReset={pom.reset}
              />
              {pom.phase === "focus" && !pom.running && pom.secondsLeft === FOCUS_MIN * 60 && (
                <div className="mt-4 text-center">
                  <Button size="lg" onClick={pom.start}>
                    <Timer className="size-4" />
                    Empezar pomodoro
                  </Button>
                </div>
              )}
              <p className="mt-6 text-center text-xs text-muted-foreground">
                ¿No sabes por qué empezar? Vuelve a <b>Hoy</b>: ahí te decimos una sola cosa.
              </p>
            </section>
          </TabsContent>

          <TabsContent value="simulacros" className="mt-4">
            <SimulacrosTab state={state} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/** Tarjeta superior del repaso: cuántas tocan hoy y botón de empezar. */
function RepasoDelDia({ onStart }: { onStart: (ids: string[]) => void }) {
  const state = useStudyStore();
  const due = dueCardsToday(state);

  return (
    <section className="rounded-xl border bg-card p-5">
      {due.length > 0 ? (
        <>
          <p className="font-heading text-xl font-bold">
            {due.length} tarjeta{due.length > 1 ? "s" : ""} para repasar hoy
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cinco minutos ahora valen más que una hora el día antes del examen.
          </p>
          <Button
            size="lg"
            className="mt-4 w-full sm:w-auto"
            onClick={() => onStart(due.map((c) => c.id))}
          >
            <Sparkles className="size-4" />
            Empezar repaso
          </Button>
        </>
      ) : (
        <>
          <p className="font-heading text-xl font-bold">Nada que repasar hoy</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.cards.length > 0
              ? "Las tarjetas volverán solas el día que toque. Añade más abajo las que quieras."
              : "Crea tus primeras tarjetas abajo: vocabulario de inglés, fórmulas de mates…"}
          </p>
        </>
      )}
    </section>
  );
}

function NuevaTarjeta() {
  const state = useStudyStore();
  const [subjectId, setSubjectId] = useState<string>(state.subjects[0]?.id ?? "");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [bulk, setBulk] = useState("");
  const [bulkFormat, setBulkFormat] = useState<"lista" | "guia">("lista");
  const [bulkMsg, setBulkMsg] = useState("");

  const validSubject = state.subjects.some((s) => s.id === subjectId);

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold">Añadir tarjetas</h2>
      <form
        className="space-y-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!validSubject) return;
          addCard({ subjectId, front, back });
          setFront("");
          setBack("");
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={validSubject ? subjectId : ""} onValueChange={setSubjectId}>
            <SelectTrigger aria-label="Asignatura">
              <SelectValue placeholder="Asignatura" />
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
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Anverso (pregunta)…"
            className="sm:col-span-2"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Reverso (respuesta)…"
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={!validSubject || !front.trim() || !back.trim()}
          >
            <Plus className="size-4" /> Añadir
          </Button>
        </div>
      </form>

      <form
        className="space-y-2 rounded-xl border border-dashed bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const n = addCardsBulk(subjectId, bulk, bulkFormat);
          setBulkMsg(
            n > 0
              ? `${n} tarjetas creadas.`
              : "Ninguna tarjeta nueva: revisa el formato o ya existían.",
          );
          if (n > 0) setBulk("");
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="bulk" className="flex-1 text-sm font-medium">
            {bulkFormat === "lista"
              ? "Pegar una lista (una por línea, formato «pregunta ; respuesta»)"
              : "Pegar una guía de estudio de NotebookLM (Question/Answer)"}
          </label>
          <div className="flex overflow-hidden rounded-md border text-xs">
            <button
              type="button"
              onClick={() => setBulkFormat("lista")}
              className={cn(
                "px-3 py-2",
                bulkFormat === "lista"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setBulkFormat("guia")}
              className={cn(
                "px-3 py-2",
                bulkFormat === "guia"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              Guía NotebookLM
            </button>
          </div>
        </div>
        <textarea
          id="bulk"
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          rows={4}
          placeholder={
            bulkFormat === "lista"
              ? "to achieve ; conseguir\nhowever ; sin embargo"
              : "**Question 1**\nWhat does «to achieve» mean?\n**Answer 1**\nConseguir, lograr."
          }
          className={cn(
            "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base lg:text-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
        />
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!validSubject || !bulk.trim()}
          >
            <Plus className="size-4" /> Crear tarjetas
          </Button>
          {bulkMsg && <span className="text-xs text-muted-foreground">{bulkMsg}</span>}
        </div>
      </form>
    </section>
  );
}

function ListaTarjetas() {
  const state = useStudyStore();
  const cards = [...state.cards].sort((a, b) => a.due.localeCompare(b.due));

  if (cards.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-heading text-lg font-semibold">
        Tus tarjetas{" "}
        <span className="text-sm font-normal text-muted-foreground">{cards.length}</span>
      </h2>
      <ul className="space-y-1.5">
        {cards.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2 text-sm"
          >
            <SubjectDot state={state} subjectId={c.subjectId} />
            {/* anywhere en vez de truncate: las palabras largas se parten
                en vez de cortarse con puntos suspensivos. */}
            <span className="min-w-0 flex-1 basis-40 [overflow-wrap:anywhere]">
              <span className="font-medium">{c.front}</span>{" "}
              <span className="text-muted-foreground">· {c.back}</span>
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                caja {c.box}/{LEITNER_INTERVALS.length}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => deleteCard(c.id)}
                aria-label={`Eliminar tarjeta ${c.front}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lanzar simulacros de exámenes próximos y consultar el histórico de notas. */
function SimulacrosTab({ state }: { state: ReturnType<typeof useStudyStore> }) {
  const [examId, setExamId] = useState("");
  const [simulacroExam, setSimulacroExam] = useState<Exam | null>(null);
  const hoy = todayISO();

  const proximos = state.exams
    .filter((e) => e.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date));
  const elegido = proximos.find((e) => e.id === examId) ?? proximos[0] ?? null;

  const historico = [...state.simulacros]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-heading text-lg font-semibold">Hacer un simulacro</h2>
        {proximos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tienes exámenes próximos. Añade uno en la sección <b>Exámenes</b> y aquí podrás
            ensayarlo con tiempo.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={cn(selectClass, "max-w-60 flex-1")}
              value={elegido?.id ?? ""}
              onChange={(e) => setExamId(e.target.value)}
              aria-label="Examen a simular"
            >
              {proximos.map((e) => {
                const subject = state.subjects.find((s) => s.id === e.subjectId);
                return (
                  <option key={e.id} value={e.id}>
                    {subject?.name} — {e.title}
                  </option>
                );
              })}
            </select>
            <Button disabled={!elegido} onClick={() => elegido && setSimulacroExam(elegido)}>
              <Timer className="size-4" />
              Empezar simulacro
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Tiempo real sin pausas, y al acabar te das una nota del 0 al 10. Es el mejor ensayo
          general antes del examen.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">Tus simulacros</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no has hecho ninguno. El primero siempre es el peor: hazlo pronto.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {historico.map((s) => {
              const exam = state.exams.find((e) => e.id === s.examId);
              const subject = exam && state.subjects.find((x) => x.id === exam.subjectId);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  {subject && <SubjectDot state={state} subjectId={subject.id} />}
                  <span className="min-w-0 flex-1 basis-40 [overflow-wrap:anywhere]">
                    <span className="font-medium">{exam?.title ?? "Examen borrado"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(s.date + "T12:00"), "d MMM", { locale: es })} · {s.minutes} min
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                      s.score >= 7
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {s.score.toFixed(1)}
                  </span>
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
  );
}
