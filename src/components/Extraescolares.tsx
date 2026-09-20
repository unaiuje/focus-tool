import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addExtra, removeExtra, useStudyStore } from "@/lib/study-store";
import { firstWeekday, formatWeekdays, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/study-utils";
import { cn } from "@/lib/utils";

/** Días en orden natural lunes → domingo (domingo el último). */
const DIAS_ORDENADOS = [1, 2, 3, 4, 5, 6, 0];

/** Gestión de extraescolares: actividades fijas, con uno o varios días a la semana. */
export function Extraescolares() {
  const state = useStudyStore();
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const invalid = !name.trim() || days.length === 0 || endTime <= startTime;

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">Extraescolares</h2>
        <p className="text-sm text-muted-foreground">
          Tus actividades fijas de la semana. Una actividad puede ser varios días: marca martes y
          jueves, por ejemplo, y basta con crearla una vez.
        </p>
      </div>
      {state.extras.length > 0 && (
        <ul className="space-y-2">
          {[...state.extras]
            .sort(
              (a, b) =>
                firstWeekday(a.weekdays) - firstWeekday(b.weekdays) ||
                a.startTime.localeCompare(b.startTime),
            )
            .map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 basis-40 font-medium">{e.name}</span>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatWeekdays(e.weekdays)} · {e.startTime}–{e.endTime}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeExtra(e.id)}
                    aria-label={`Borrar ${e.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}
      <form
        className="space-y-3 rounded-xl border bg-card p-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (invalid) return;
          addExtra({ name: name.trim(), weekdays: days, startTime, endTime });
          setName("");
          setDays([1]);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Actividad"
            aria-label="Actividad"
            className="sm:col-span-1"
          />
          <div
            role="group"
            aria-label="Días de la semana"
            className="flex flex-wrap items-center gap-1 sm:col-span-2"
          >
            {DIAS_ORDENADOS.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={on}
                  title={WEEKDAY_NAMES[d]}
                  className={cn(
                    "rounded-full border px-3 py-2.5 text-xs font-medium transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex gap-2">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label="Hora de inicio"
            />
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              aria-label="Hora de fin"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={invalid} className="sm:col-span-2">
            <Plus className="size-4" />
            Añadir{days.length > 1 ? ` (${formatWeekdays(days)})` : ""}
          </Button>
        </div>
        {endTime <= startTime && (
          <p className="text-xs text-destructive">
            La hora de fin debe ser después de la de inicio.
          </p>
        )}
      </form>
    </section>
  );
}
