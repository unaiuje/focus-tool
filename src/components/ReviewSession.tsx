import { useState } from "react";
import { Button } from "@/components/ui/button";
import { subjectName } from "@/components/TaskRow";
import { gradeCard, useStudyStore } from "@/lib/study-store";

/** Flujo de repaso de tarjetas una a una: ver respuesta → calificar → siguiente. */
export function ReviewSession({ ids, onFinish }: { ids: string[]; onFinish: () => void }) {
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
        <Button onClick={onFinish}>Volver a Estudio</Button>
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
