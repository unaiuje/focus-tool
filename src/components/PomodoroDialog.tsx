import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { FOCUS_MIN, usePomodoro } from "@/hooks/use-pomodoro";
import type { Task } from "@/lib/study-types";
import { logSession, setTaskResult } from "@/lib/study-store";

export function PomodoroDialog({
  task,
  open,
  onClose,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}) {
  const { phase, secondsLeft, running, start, toggle, reset } = usePomodoro({
    // Cuenta el tiempo aunque no haya tarea asociada (huecos de estudio de Hoy).
    onFocusComplete: () => logSession(FOCUS_MIN, task?.subjectId),
  });

  useEffect(() => {
    if (open) start();
  }, [open, task?.id, start]);

  const finishWith = (result: "facil" | "regular" | "mal") => {
    if (task) setTaskResult(task.id, result);
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
            {phase === "done" &&
              (task
                ? "¿Qué tal ha ido? Sé honesto, es para ti."
                : "Buen trabajo. Sesión apuntada.")}
          </DialogDescription>
        </DialogHeader>

        {phase !== "done" ? (
          <div className="flex flex-col items-center gap-6 py-4">
            <PomodoroTimer
              phase={phase}
              secondsLeft={secondsLeft}
              running={running}
              onToggle={toggle}
              onReset={reset}
            />
            {phase === "focus" && (
              <button
                className="text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => {
                  if (running) toggle();
                  onClose();
                }}
              >
                Terminar antes
              </button>
            )}
          </div>
        ) : task ? (
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
        ) : (
          <div className="py-2 text-center">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
