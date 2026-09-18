import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Clock, Flame, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { useStudyStore } from "@/lib/study-store";
import {
  attentionSubjects,
  currentStreak,
  minutesPerDay,
} from "@/lib/study-utils";

export const Route = createFileRoute("/progreso")({
  head: () => ({
    meta: [
      { title: "Tu progreso — Mi Curso 4º ESO" },
      {
        name: "description",
        content:
          "Evolución de tus notas, tiempo de estudio por día y las asignaturas que necesitan más atención.",
      },
      { property: "og:title", content: "Tu progreso — Mi Curso 4º ESO" },
      {
        property: "og:description",
        content:
          "Gráficas sencillas de notas y horas de estudio para saber dónde apretar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgresoPage,
});

function ProgresoPage() {
  const state = useStudyStore();

  const notas = state.exams
    .filter((e) => e.grade !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      label: format(parseISO(e.date), "d MMM", { locale: es }),
      nota: e.grade as number,
      titulo: e.title,
    }));

  const media = notas.length
    ? notas.reduce((a, n) => a + n.nota, 0) / notas.length
    : null;

  const minutos = minutesPerDay(state, 14);
  const totalSemana = minutos.slice(-7).reduce((a, d) => a + d.minutes, 0);
  const racha = currentStreak(state);
  const atencion = attentionSubjects(state);

  const mediasPorAsignatura = state.subjects
    .map((s) => {
      const g = state.exams
        .filter((e) => e.subjectId === s.id && e.grade !== undefined)
        .map((e) => e.grade as number);
      return {
        name: s.name,
        color: s.color,
        media: g.length ? g.reduce((a, b) => a + b, 0) / g.length : null,
      };
    })
    .filter((s) => s.media !== null)
    .sort((a, b) => (a.media as number) - (b.media as number));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Tu progreso
          </h1>
          <p className="text-sm text-muted-foreground">
            Los números de verdad: cómo vas y dónde hay que apretar.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica
            icon={<TrendingUp className="size-4" />}
            label="Nota media"
            value={media !== null ? media.toFixed(1) : "—"}
          />
          <Metrica
            icon={<Clock className="size-4" />}
            label="Estudio (7 días)"
            value={`${Math.floor(totalSemana / 60)}h ${totalSemana % 60}m`}
          />
          <Metrica
            icon={<Flame className="size-4" />}
            label="Racha"
            value={`${racha} día${racha === 1 ? "" : "s"}`}
          />
        </div>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-heading text-lg font-semibold">
            Evolución de tus notas
          </h2>
          {notas.length < 1 ? (
            <p className="text-sm text-muted-foreground">
              Cuando pongas notas de exámenes, aquí verás tu evolución.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={notas}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis domain={[0, 10]} fontSize={12} />
                  <Tooltip
                    formatter={(v: number) => [`${v}`, "Nota"]}
                    labelFormatter={(l) => String(l)}
                  />
                  <Line
                    type="monotone"
                    dataKey="nota"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-heading text-lg font-semibold">
            Minutos de estudio (últimos 14 días)
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={minutos}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => [`${v} min`, "Estudio"]} />
                <Bar
                  dataKey="minutes"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-heading text-lg font-semibold">
            Media por asignatura
          </h2>
          {mediasPorAsignatura.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay notas registradas.
            </p>
          ) : (
            <ul className="space-y-2">
              {mediasPorAsignatura.map((s) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm">
                    {s.name}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${((s.media as number) / 10) * 100}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold">
                    {(s.media as number).toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
            <AlertTriangle className="size-4 text-destructive" />
            Necesitan atención
          </h2>
          {atencion.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todo bajo control. Sigue así.
            </p>
          ) : (
            <ul className="space-y-2">
              {atencion.map((a) => {
                const s = state.subjects.find((x) => x.id === a.subjectId);
                return (
                  <li
                    key={a.subjectId}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s?.color ?? "#999" }}
                    />
                    <span className="font-medium">{s?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.reason}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function Metrica({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
    </div>
  );
}
