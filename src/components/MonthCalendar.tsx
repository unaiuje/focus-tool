import { addDays, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import type { StudyState } from "@/lib/study-types";
import { cn } from "@/lib/utils";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_INICIALES = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Único calendario mensual de la app. Un solo DOM para móvil y escritorio:
 * la diferencia es solo CSS (celdas cuadradas compactas con puntos en
 * móvil, celdas altas con títulos y notas en md+).
 */
export function MonthCalendar({
  state,
  month,
  selectedDay,
  onSelectDay,
}: {
  state: StudyState;
  month: Date;
  selectedDay: string;
  onSelectDay: (iso: string) => void;
}) {
  const inicio = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));

  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {DIAS.map((d, i) => (
          <div key={d}>
            <span className="md:hidden">{DIAS_INICIALES[i]}</span>
            <span className="hidden md:inline">{d}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const exams = state.exams
            .filter((e) => e.date === iso)
            .sort((a, b) => a.title.localeCompare(b.title));
          const tareas = state.tasks.filter((t) => t.date === iso && !t.done);
          const fuera = !isSameMonth(day, month);
          const esHoy = isSameDay(day, new Date());
          const esActivo = iso === selectedDay;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              aria-pressed={esActivo}
              aria-label={`${format(day, "d 'de' MMMM", { locale: es })}${
                exams.length > 0 ? `: ${exams.map((e) => e.title).join(", ")}` : ""
              }`}
              className={cn(
                "flex aspect-square min-h-10 w-full flex-col items-center justify-center gap-1 rounded-lg border text-sm md:aspect-auto md:min-h-24 md:items-start md:justify-start md:p-1 md:text-left",
                fuera && "opacity-40",
                esActivo && "border-primary bg-primary/10",
                esHoy && !esActivo && "border-primary ring-1 ring-primary/30",
              )}
            >
              <span
                className={cn(
                  "text-xs md:text-[11px] md:text-muted-foreground",
                  esHoy && "font-bold text-primary",
                )}
              >
                {format(day, "d")}
              </span>
              {/* Móvil: hasta 3 puntos por día */}
              <span className="flex h-1.5 items-center gap-0.5 md:hidden" aria-hidden>
                {exams.slice(0, 3).map((e) => (
                  <span key={e.id} className="size-1.5 rounded-full bg-destructive" />
                ))}
                {exams.length === 0 &&
                  tareas
                    .slice(0, 3)
                    .map((t) => (
                      <span key={t.id} className="size-1.5 rounded-full bg-primary/60" />
                    ))}
              </span>
              {/* Escritorio: títulos de examen (con nota si la tiene) */}
              <span className="hidden w-full flex-col gap-0.5 md:flex">
                {exams.map((e) => (
                  <span
                    key={e.id}
                    className="block truncate rounded bg-destructive/10 px-1 text-[10px] font-semibold text-destructive"
                    title={e.topics ? `${e.title} (${e.topics})` : e.title}
                  >
                    {e.grade !== undefined ? `${e.title} · ${e.grade.toFixed(1)}` : e.title}
                  </span>
                ))}
                {exams.length === 0 && tareas.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {tareas.length} tarea{tareas.length > 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
