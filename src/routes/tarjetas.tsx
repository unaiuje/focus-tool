import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SubjectDot, subjectName } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addCard, addCardsBulk, deleteCard, gradeCard, useStudyStore } from "@/lib/study-store";
import { LEITNER_INTERVALS, dueCardsToday } from "@/lib/study-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarjetas")({
  head: () => ({
    meta: [
      { title: "Tarjetas — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Flashcards con repetición espaciada: vocabulario, fórmulas y conceptos que vuelven solos antes de que se te olviden.",
      },
      { property: "og:title", content: "Tarjetas — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content: "Repaso espaciado tipo Leitner: las difíciles vuelven antes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TarjetasPage,
});

function TarjetasPage() {
  const state = useStudyStore();
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const due = dueCardsToday(state);

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
          <h1 className="font-heading text-3xl font-bold tracking-tight">Tarjetas</h1>
          <p className="text-sm text-muted-foreground">
            Vocabulario, fórmulas, fechas… Lo difícil vuelve antes, lo fácil se espacia solo.
          </p>
        </div>

        {/* Repaso del día */}
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
                onClick={() => setSessionIds(due.map((c) => c.id))}
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

        <NuevaTarjeta />
        <ListaTarjetas />
      </div>
    </AppLayout>
  );
}

function ReviewSession({ ids, onFinish }: { ids: string[]; onFinish: () => void }) {
  const state = useStudyStore();
  const cards = ids
    .map((id) => state.cards.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = cards[idx];

  if (!card) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-heading text-3xl font-bold">¡Repaso completo!</h1>
        <p className="text-sm text-muted-foreground">
          {cards.length} tarjeta{cards.length > 1 ? "s" : ""} repasadas. Las difíciles volverán
          mañana; las fáciles, más tarde.
        </p>
        <Button onClick={onFinish}>Volver a Tarjetas</Button>
      </div>
    );
  }

  const rate = (result: "mal" | "regular" | "bien") => {
    gradeCard(card.id, result);
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="font-heading text-xl font-bold">Repasando</h1>
        <span className="text-sm text-muted-foreground">
          {idx + 1} / {cards.length}
        </span>
      </div>

      <div className="min-h-56 space-y-4 rounded-xl border bg-card p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {subjectName(state, card.subjectId)} · caja {card.box}
        </p>
        {/* break-words: fórmulas o palabras largas sin espacios no deben
            desbordar la tarjeta en pantallas estrechas. */}
        <p className="font-heading text-xl font-bold break-words sm:text-2xl">{card.front}</p>
        {revealed ? (
          <p className="border-t pt-4 text-lg break-words text-muted-foreground">{card.back}</p>
        ) : (
          <Button variant="secondary" onClick={() => setRevealed(true)}>
            Ver respuesta
          </Button>
        )}
      </div>

      {revealed && (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => rate("mal")}>
            Mal
          </Button>
          <Button variant="outline" onClick={() => rate("regular")}>
            Regular
          </Button>
          <Button onClick={() => rate("bien")}>Bien</Button>
        </div>
      )}
      {revealed && (
        <p className="text-center text-xs text-muted-foreground">
          Mal: vuelve mañana · Regular: sigue su ritmo · Bien: se espacia más
        </p>
      )}
    </div>
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
