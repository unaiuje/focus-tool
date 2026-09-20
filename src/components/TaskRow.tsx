import { Check, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudyState, Task } from "@/lib/study-types";
import { removeTask, toggleTask } from "@/lib/study-store";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<Task["kind"], string> = {
  pomodoro: "Pomodoro",
  repaso: "Repaso",
  tarea: "Tarea",
};

export function SubjectDot({ state, subjectId }: { state: StudyState; subjectId: string }) {
  const subject = state.subjects.find((s) => s.id === subjectId);
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: subject?.color ?? "#999" }}
      aria-hidden
    />
  );
}

export function subjectName(state: StudyState, subjectId: string) {
  return state.subjects.find((s) => s.id === subjectId)?.name ?? "";
}

export function TaskRow({
  task,
  state,
  onStart,
  showDelete = true,
}: {
  task: Task;
  state: StudyState;
  onStart?: (task: Task) => void;
  showDelete?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2.5",
        task.done && "opacity-55",
      )}
    >
      <button
        onClick={() => toggleTask(task.id)}
        aria-label={task.done ? "Marcar pendiente" : "Marcar hecha"}
        className={cn(
          // size-7 visual + after:-inset-2: área táctil de ~44px sin mover el layout
          "relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors after:absolute after:-inset-2 after:content-['']",
          task.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {task.done && <Check className="size-4" />}
      </button>
      <SubjectDot state={state} subjectId={task.subjectId} />
      <div className="min-w-0 flex-1 basis-40">
        <p className={cn("truncate text-sm font-medium", task.done && "line-through")}>
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground">{subjectName(state, task.subjectId)}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Badge variant="secondary">{KIND_LABEL[task.kind]}</Badge>
        {!task.done && onStart && (
          <Button size="sm" variant="default" onClick={() => onStart(task)}>
            <Play className="size-3.5" />
            Empezar
          </Button>
        )}
        {showDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="size-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => removeTask(task.id)}
            aria-label="Eliminar tarea"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
