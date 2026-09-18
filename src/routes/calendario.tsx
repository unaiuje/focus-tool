import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useStudyStore,
  addExam,
  removeExam,
  addExtra,
  removeExtra,
} from "@/lib/study-store";
import { todayISO } from "@/lib/study-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Exámenes y extraescolares — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Apunta tus exámenes y la app crea sola los repasos de los días previos. Añade también tus extraescolares.",
      },
      {
        property: "og:title",
        content: "Exámenes y extraescolares — Mi Curso 4º ESO",
      },
      {
        property: "og:description",
        content:
          "Calendario de exámenes con plan de repaso automático y tus actividades de la semana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarioPage,
});

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm";

function CalendarioPage() {
  const state = useStudyStore();
  const [mes, setMes] = useState(() => startOfMonth(new Date()));

  const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  const finMes = endOfMonth(mes);

  const proximos = state.exams
    .filter((e) => e.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Exámenes
          </h1>
          <p className="text-sm text-muted-foreground">
            Apunta la fecha y yo te pongo los repasos 7, 3 y 1 día antes.
          </p>
        </div>

        {/* Calendario */}
        <section className="rounded-xl border bg-card p-4">
          <header className="mb-3 flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMes(addMonths(mes, -1))}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="font-heading font-semibold capitalize">
              {format(mes, "MMMM yyyy", { locale: es })}
            </h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMes(addMonths(mes, 1))}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </header>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {dias.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const exams = state.exams.filter((e) => e.date === iso);
              const tareas = state.tasks.filter((t) => t.date === iso);
              const fuera = !isSameMonth(day, mes) && day <= finMes === false;
              return (
                <div
                  key={iso}
                  className={cn(
                    "min-h-16 rounded-lg border p-1 text-left",
                    !isSameMonth(day, mes) && "opacity-40",
                    fuera && "opacity-40",
                    isSameDay(day, new Date()) &&
                      "border-primary ring-1 ring-primary/30",
                  )}
                >
                  <span className="text-[11px] text-muted-foreground">
                    {format(day, "d")}
                  </span>
                  {exams.map((e) => (
                    <p
                      key={e.id}
                      className="mt-0.5 truncate rounded bg-destructive/10 px-1 text-[10px] font-semibold text-destructive"
                      title={e.title}
                    >
                      {e.title}
                    </p>
                  ))}
                  {tareas.length > 0 && exams.length === 0 && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {tareas.length} tarea{tareas.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <NuevoExamen />

        {/* Próximos exámenes */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">
            Próximos exámenes
          </h2>
          {proximos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes exámenes apuntados. Añade uno arriba.
            </p>
          ) : (
            <ul className="space-y-2">
              {proximos.map((e) => {
                const dias = differenceInCalendarDays(
                  parseISO(e.date),
                  new Date(),
                );
                const subject = state.subjects.find(
                  (s) => s.id === e.subjectId,
                );
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3"
                  >
                    <span
                      className="mt-1.5 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: subject?.color ?? "#999" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject?.name} ·{" "}
                        {format(parseISO(e.date), "EEEE d 'de' MMMM", {
                          locale: es,
                        })}
                      </p>
                      {e.topics && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Temas: {e.topics}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                      {dias === 0 ? "¡Hoy!" : `En ${dias} días`}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 text-muted-foreground"
                      onClick={() => removeExam(e.id)}
                      aria-label="Borrar examen"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Extraescolares />
      </div>
    </AppLayout>
  );
}

function NuevoExamen() {
  const state = useStudyStore();
  const [subjectId, setSubjectId] = useState(state.subjects[0]?.id ?? "mates");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [topics, setTopics] = useState("");

  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!title.trim()) return;
        addExam({ subjectId, title: title.trim(), date, topics: topics.trim() });
        setTitle("");
        setTopics("");
      }}
    >
      <h2 className="font-heading text-lg font-semibold">Añadir examen</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          className={selectClass}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          aria-label="Asignatura"
        >
          {state.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tema del examen"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Input
        value={topics}
        onChange={(e) => setTopics(e.target.value)}
        placeholder="Qué entra (opcional)"
      />
      <Button type="submit" className="w-full sm:w-auto">
        <Plus className="size-4" />
        Añadir y crear repasos
      </Button>
    </form>
  );
}

function Extraescolares() {
  const state = useStudyStore();
  const [name, setName] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">Extraescolares</h2>
        <p className="text-sm text-muted-foreground">
          Los días que tienes actividad, el plan del día es más ligero.
        </p>
      </div>
      {state.extras.length > 0 && (
        <ul className="space-y-2">
          {state.extras.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 text-sm"
            >
              <span className="flex-1 font-medium">{e.name}</span>
              <span className="text-xs text-muted-foreground">
                {SEMANA[e.weekday]} · {e.startTime}–{e.endTime}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground"
                onClick={() => removeExtra(e.id)}
                aria-label="Borrar extraescolar"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!name.trim()) return;
          addExtra({ name: name.trim(), weekday, startTime, endTime });
          setName("");
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Actividad"
        />
        <select
          className={selectClass}
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          aria-label="Día de la semana"
        >
          {SEMANA.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          <Plus className="size-4" />
          Añadir
        </Button>
      </form>
    </section>
  );
}
