import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSimulacro } from "@/lib/study-store";
import { beep } from "@/lib/beep";
import { subjectName } from "@/components/TaskRow";
import type { Exam, StudyState } from "@/lib/study-types";
import { cn } from "@/lib/utils";

const DURACIONES = [20, 30, 45, 60];

/** Examen simulado: cuenta atrás sin pausas y nota de autoevaluación. */
export function SimulacroDialog({
  state,
  exam,
  open,
  onClose,
}: {
  state: StudyState;
  exam: Exam | null;
  open: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"setup" | "running" | "scoring">("setup");
  const [duration, setDuration] = useState(30);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setPhase("setup");
      setDuration(30);
      setScore("");
    }
  }, [open, exam?.id]);

  useEffect(() => {
    if (phase !== "running") return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          beep();
          setPhase("scoring");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const scoreNum = parseFloat(score);
  const scoreValid = !Number.isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 10;

  const start = () => {
    setSecondsLeft(duration * 60);
    setPhase("running");
  };

  const save = () => {
    if (!exam || !scoreValid) return;
    addSimulacro({ examId: exam.id, minutes: duration, score: scoreNum });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {phase === "setup" && `Simulacro: ${exam?.title ?? ""}`}
            {phase === "running" && "Simulacro en curso"}
            {phase === "scoring" && "¡Tiempo!"}
          </DialogTitle>
          <DialogDescription>
            {phase === "setup" &&
              (exam
                ? `${subjectName(state, exam.subjectId)} · sin apuntes y sin pausas, como el examen real.`
                : "")}
            {phase === "running" &&
              "Haz el examen en limpio, sin mirar nada. Cuando acabe, te preguntas honesto."}
            {phase === "scoring" &&
              "¿Qué nota te habría puesto? Sé honesto: así ves si estás listo."}
          </DialogDescription>
        </DialogHeader>

        {phase === "setup" && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-2">
              {DURACIONES.map((d) => (
                <Button
                  key={d}
                  variant={d === duration ? "default" : "outline"}
                  onClick={() => setDuration(d)}
                >
                  {d} min
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={start}>
                Empezar simulacro
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {phase === "running" && (
          <div className="flex flex-col items-center gap-6 py-6">
            <div
              className={cn(
                "font-heading text-7xl font-bold tabular-nums",
                secondsLeft <= 60 && "text-destructive",
              )}
            >
              {mm}:{ss}
            </div>
            <p className="text-xs text-muted-foreground">{duration} minutos · sin pausas</p>
            <button
              className="text-xs text-muted-foreground underline underline-offset-2"
              onClick={onClose}
            >
              Abandonar (no se guarda nada)
            </button>
          </div>
        )}

        {phase === "scoring" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Nota 0–10"
                className="w-28"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              <p className="text-sm text-muted-foreground">sobre 10</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={save} disabled={!scoreValid}>
                Guardar simulacro
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Descartar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
