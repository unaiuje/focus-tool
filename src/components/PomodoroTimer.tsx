import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PomodoroPhase } from "@/hooks/use-pomodoro";
import { cn } from "@/lib/utils";

/** Display del temporizador + controles. Compartido por el diálogo y la pestaña de Estudio. */
export function PomodoroTimer({
  phase,
  secondsLeft,
  running,
  onToggle,
  onReset,
  size = "dialog",
  className,
}: {
  phase: PomodoroPhase;
  secondsLeft: number;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  size?: "dialog" | "page";
  className?: string;
}) {
  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div
        className={cn(
          "font-heading font-bold tabular-nums",
          size === "page" ? "text-8xl" : "text-7xl",
          phase === "break" ? "text-primary" : "text-foreground",
        )}
      >
        {mm}:{ss}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size={size === "page" ? "lg" : "icon"}
          onClick={onToggle}
          aria-label={running ? "Pausar" : "Continuar"}
        >
          {running ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="outline"
          size={size === "page" ? "lg" : "icon"}
          onClick={onReset}
          aria-label="Reiniciar"
        >
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}
