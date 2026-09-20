import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/study-types";
import { logSession, setTaskResult } from "@/lib/study-store";
import { beep } from "@/lib/beep";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

export function PomodoroDialog({
  task,
  open,
  onClose,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"focus" | "break" | "done">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setPhase("focus");
      setSecondsLeft(FOCUS_MIN * 60);
      setRunning(true);
    }
  }, [open, task?.id]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          beep();
          setRunning(false);
          setPhase((p) => {
            if (p === "focus") {
              if (task) logSession(FOCUS_MIN, task.subjectId);
              return "break";
            }
            return "done";
          });
          return (phase === "focus" ? BREAK_MIN : 0) * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  useEffect(() => {
    if (phase === "break") setRunning(true);
    if (phase === "done") setSecondsLeft(0);
  }, [phase]);

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  const finishWith = (result: "facil" | "regular" | "mal") => {
    if (task) {
      if (phase !== "done" && phase === "focus") {
        // si lo cierra antes de acabar, cuenta el tiempo hecho
      }
      setTaskResult(task.id, result);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {phase === "focus" && "Tiempo de concentración"}
            {phase === "break" && "Descanso"}
            {phase === "done" && "¡Pomodoro completado!"}
          </DialogTitle>
          <DialogDescription>
            {phase === "focus" && (task ? task.title : "Concéntrate en una sola cosa.")}
            {phase === "break" && "Levántate, estira, mira lejos de la pantalla."}
            {phase === "done" && "¿Qué tal ha ido? Sé honesto, es para ti."}
          </DialogDescription>
        </DialogHeader>

        {phase !== "done" ? (
          <div className="flex flex-col items-center gap-6 py-4">
            <div
              className={`font-heading text-7xl font-bold tabular-nums ${
                phase === "break" ? "text-primary" : "text-foreground"
              }`}
            >
              {mm}:{ss}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRunning((r) => !r)}
                aria-label={running ? "Pausar" : "Continuar"}
              >
                {running ? <Pause /> : <Play />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSecondsLeft((phase === "focus" ? FOCUS_MIN : BREAK_MIN) * 60)}
                aria-label="Reiniciar"
              >
                <RotateCcw />
              </Button>
            </div>
            {phase === "focus" && (
              <button
                className="text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => {
                  setRunning(false);
                  onClose();
                }}
              >
                Terminar antes
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 py-2">
            <Button variant="outline" onClick={() => finishWith("facil")}>
              Fácil
            </Button>
            <Button variant="outline" onClick={() => finishWith("regular")}>
              Regular
            </Button>
            <Button variant="outline" onClick={() => finishWith("mal")}>
              Mal
            </Button>
            <p className="col-span-3 mt-1 text-center text-xs text-muted-foreground">
              Si marcas "mal", la app lo vuelve a poner mañana automáticamente.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
