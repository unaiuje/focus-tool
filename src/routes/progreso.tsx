import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Clock, Flame, Lightbulb, Target, TrendingUp } from "lucide-react";
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
import { subjectName } from "@/components/TaskRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettings, useStudyStore } from "@/lib/study-store";
import {
  attentionSubjects,
  currentStreak,
  minutesPerDay,
  neededGrade,
  weeklyBudget,
  weeklyReport,
} from "@/lib/study-utils";
import type { StudyState } from "@/lib/study-types";
import { cn } from "@/lib/utils";

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
        content: "Gráficas sencillas de notas y horas de estudio para saber dónde apretar.",
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

  const media = notas.length ? notas.reduce((a, n) => a + n.nota, 0) / notas.length : null;

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
          <h1 className="font-heading text-3xl font-bold tracking-tight">Tu progreso</h1>
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

        <InformeSemanal state={state} />
        <PresupuestoSemanal state={state} />
        <SimuladorNotas state={state} />

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-heading text-lg font-semibold">Evolución de tus notas</h2>
          {notas.length < 1 ? (
            <p className="text-sm text-muted-foreground">
              Cuando pongas notas de exámenes, aquí verás tu evolución.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={notas}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="label"
                    fontSize={12}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
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
                <XAxis dataKey="label" fontSize={12} interval="preserveStartEnd" minTickGap={16} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => [`${v} min`, "Estudio"]} />
                <Bar dataKey="minutes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-heading text-lg font-semibold">Media por asignatura</h2>
          {mediasPorAsignatura.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay notas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {mediasPorAsignatura.map((s) => (
                <li key={s.name} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 break-words text-sm sm:w-28 sm:truncate">
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
            <p className="text-sm text-muted-foreground">Todo bajo control. Sigue así.</p>
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
                    <span className="text-xs text-muted-foreground">{a.reason}</span>
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

function Metrica({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

const fmtHoras = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

/** Resumen de los últimos 7 días y prioridades para la semana que viene. */
function InformeSemanal({ state }: { state: StudyState }) {
  const r = weeklyReport(state);
  const delta =
    r.deltaPct === null
      ? ""
      : r.deltaPct >= 0
        ? ` (+${r.deltaPct}% que la semana pasada)`
        : ` (${r.deltaPct}% que la semana pasada)`;

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold">
        <Lightbulb className="size-4 text-primary" />
        Informe de la semana
      </h2>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>
          Estudiaste <span className="font-semibold text-foreground">{fmtHoras(r.thisMin)}</span>
          {r.thisMin > 0 || r.prevMin > 0 ? <>{delta}.</> : "."}
        </li>
        {r.tasksTotal > 0 && (
          <li>
            Tareas de la semana: {r.tasksDone}/{r.tasksTotal} hechas.
          </li>
        )}
        {r.newGrades.map((g) => (
          <li key={g.title + g.grade}>
            Nueva nota: {subjectName(state, g.subjectId)} — {g.grade.toFixed(1)} ({g.title})
          </li>
        ))}
        {r.priorities.length > 0 && (
          <li>
            Para la semana que viene, prioriza:{" "}
            {r.priorities
              .map((p) => {
                const nombre = subjectName(state, p.subjectId);
                const motivo =
                  p.examInDays !== null
                    ? `examen en ${p.examInDays} día${p.examInDays === 1 ? "" : "s"}`
                    : p.weak
                      ? "va floja"
                      : "base sólida";
                return `${nombre} (${motivo})`;
              })
              .join(" · ")}
            .
          </li>
        )}
      </ul>
    </section>
  );
}

/** Objetivo de horas/semana y reparto sugerido por asignatura. */
function PresupuestoSemanal({ state }: { state: StudyState }) {
  const budget = weeklyBudget(state);
  const goal = state.settings.weeklyGoalMin;

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Target className="size-4 text-primary" />
          Objetivo semanal
        </h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Horas/semana
          <Input
            type="number"
            min="0"
            max="70"
            step="0.5"
            defaultValue={goal / 60}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              updateSettings({ weeklyGoalMin: Number.isNaN(v) ? goal : v * 60 });
            }}
            className="h-8 w-20"
          />
        </label>
      </div>

      {goal === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin objetivo puesto. Pon unas horas arriba y te reparto la semana.
        </p>
      ) : (
        <>
          <p className="mb-1 text-sm text-muted-foreground">
            Llevas <span className="font-semibold text-foreground">{fmtHoras(budget.doneMin)}</span>{" "}
            de {fmtHoras(budget.goalMin)} ({budget.pct}%)
          </p>
          <Progress value={budget.pct} className="h-2" />
          <p className="mt-3 mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reparto sugerido
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {budget.perSubject
              .filter((p) => p.minutes > 0)
              .map((p) => {
                const s = state.subjects.find((x) => x.id === p.subjectId);
                return (
                  <li
                    key={p.subjectId}
                    className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: s?.color ?? "#999" }}
                    />
                    {s?.name} · {fmtHoras(p.minutes)}
                  </li>
                );
              })}
          </ul>
        </>
      )}
    </section>
  );
}

/** ¿Qué necesito en lo que queda para llegar a mi objetivo? */
function SimuladorNotas({ state }: { state: StudyState }) {
  const [subjectId, setSubjectId] = useState<string>(state.subjects[0]?.id ?? "");
  const [target, setTarget] = useState("8");
  const [remaining, setRemaining] = useState("1");

  const validSubject = state.subjects.some((s) => s.id === subjectId);
  const graded = validSubject
    ? state.exams
        .filter((e) => e.subjectId === subjectId && e.grade !== undefined)
        .map((e) => e.grade as number)
    : [];
  const tgt = parseFloat(target);
  const rem = parseInt(remaining, 10);
  const result =
    validSubject && !Number.isNaN(tgt) && !Number.isNaN(rem) ? neededGrade(graded, rem, tgt) : null;
  const subject = state.subjects.find((s) => s.id === subjectId);

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
        <TrendingUp className="size-4 text-primary" />
        Simulador de notas
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={validSubject ? subjectId : ""} onValueChange={setSubjectId}>
          <SelectTrigger aria-label="Asignatura del simulador">
            <SelectValue placeholder="Asignatura" />
          </SelectTrigger>
          <SelectContent>
            {state.subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Objetivo
          <Input
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-8 w-20"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Exámenes que quedan
          <Input
            type="number"
            min="0"
            max="10"
            step="1"
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
            className="h-8 w-20"
          />
        </label>
      </div>
      {result && graded.length > 0 && (
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm",
            result.kind === "ok" && "bg-primary/10 text-primary",
            result.kind === "done" && "bg-secondary text-secondary-foreground",
            result.kind === "impossible" && "bg-destructive/10 text-destructive",
          )}
        >
          {subject?.name}: {result.message}
        </p>
      )}
      {result && graded.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Aún no hay notas en esta asignatura: apunta la primera y el simulador te dirá qué
          necesitas.
        </p>
      )}
    </section>
  );
}
