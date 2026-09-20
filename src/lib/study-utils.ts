import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { StudyState, Task, Exam, ClassSlot, Flashcard } from "./study-types";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Días de repaso espaciado antes de un examen: -7, -3, -1 */
export const SPACED_OFFSETS = [7, 3, 1];

export function generateReviewTasks(exam: Exam, subjectName: string): Task[] {
  const examDay = parseISO(exam.date);
  const today = startOfDay(new Date());
  const tasks: Task[] = [];
  for (const offset of SPACED_OFFSETS) {
    const day = addDays(examDay, -offset);
    if (isBefore(day, today)) continue;
    const label = offset === 7 ? "Primer repaso" : offset === 3 ? "Segundo repaso" : "Repaso final";
    tasks.push({
      id: uid(),
      subjectId: exam.subjectId,
      title: `${label}: ${exam.title}`,
      date: format(day, "yyyy-MM-dd"),
      kind: "repaso",
      done: false,
      auto: true,
      examId: exam.id,
    });
  }
  // Día del examen: recordatorio
  tasks.push({
    id: uid(),
    subjectId: exam.subjectId,
    title: `¡EXAMEN de ${subjectName}! ${exam.title}`,
    date: exam.date,
    kind: "tarea",
    done: false,
    auto: true,
    examId: exam.id,
  });
  return tasks;
}

/** Puntuación de prioridad: más alto = antes. Exámenes cercanos y repasos primero. */
export function taskPriority(task: Task, state: StudyState): number {
  let score = 0;
  if (task.kind === "repaso") score += 30;
  if (task.kind === "pomodoro") score += 20;
  if (task.kind === "tarea") score += 10;
  const nextExam = state.exams
    .filter((e) => e.subjectId === task.subjectId && e.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (nextExam) {
    const days = differenceInCalendarDays(parseISO(nextExam.date), new Date());
    score += Math.max(0, 40 - days * 5);
  }
  return score;
}

export function tasksForDay(state: StudyState, dayISO: string): Task[] {
  return state.tasks
    .filter((t) => t.date === dayISO)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return taskPriority(b, state) - taskPriority(a, state);
    });
}

/** Racha: días seguidos (terminando hoy o ayer) con alguna sesión o tarea hecha */
export function currentStreak(state: StudyState): number {
  const activeDays = new Set<string>([
    ...state.sessions.map((s) => s.date),
    ...state.tasks.filter((t) => t.done).map((t) => t.date),
  ]);
  let streak = 0;
  let cursor = startOfDay(new Date());
  // Si hoy aún no hay actividad, la racha se mantiene si ayer sí la hubo
  if (!activeDays.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = addDays(cursor, -1);
  }
  while (activeDays.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Asignaturas que necesitan atención: nota media < 7 o repasos marcados "mal" */
export function attentionSubjects(state: StudyState) {
  const result: { subjectId: string; reason: string }[] = [];
  for (const s of state.subjects) {
    const grades = state.exams
      .filter((e) => e.subjectId === s.id && e.grade !== undefined)
      .map((e) => e.grade as number);
    const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
    if (avg !== null && avg < 7) {
      result.push({
        subjectId: s.id,
        reason: `Nota media: ${avg.toFixed(1)} — por debajo de 7`,
      });
      continue;
    }
    const badReviews = state.tasks.filter((t) => t.subjectId === s.id && t.result === "mal");
    if (badReviews.length > 0) {
      result.push({
        subjectId: s.id,
        reason: `${badReviews.length} repaso(s) marcados como "mal"`,
      });
    }
  }
  return result;
}

export function minutesPerDay(state: StudyState, days: number) {
  const out: { date: string; label: string; minutes: number }[] = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const iso = format(day, "yyyy-MM-dd");
    out.push({
      date: iso,
      label: format(day, "d/M"),
      minutes: state.sessions.filter((s) => s.date === iso).reduce((a, s) => a + s.minutes, 0),
    });
  }
  return out;
}

// ---------- Horario y franjas fijas ----------

export const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Días en texto y en orden natural: [2, 4] -> "Martes y Jueves". */
export function formatWeekdays(days: number[]): string {
  const names = [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => days.includes(d))
    .map((d) => WEEKDAY_NAMES[d] ?? "");
  if (names.length === 0) return "Sin día";
  if (names.length === 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/** Primer día de la semana (Lun→Dom) en que cae una actividad, para ordenar. */
export function firstWeekday(days: number[]): number {
  return Math.min(...days.map((d) => (d === 0 ? 7 : d)));
}

// ---------- Tarjetas: repetición espaciada (cajas de Leitner) ----------

/** Días que tarda una tarjeta en volver a salir, según su caja (1..5). */
export const LEITNER_INTERVALS = [1, 2, 4, 8, 16];

/** Tarjetas que tocan hoy (o vencidas), las más retrasadas primero. */
export function dueCardsToday(state: StudyState): Flashcard[] {
  const today = todayISO();
  return state.cards
    .filter((c) => c.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due) || a.box - b.box);
}

// ---------- Simulador de notas ----------

export type NeededGradeResult =
  | { kind: "done"; message: string }
  | { kind: "ok"; needed: number; message: string }
  | { kind: "impossible"; needed: number; message: string };

/**
 * Qué media hay que sacar en los `remaining` exámenes que quedan para que la
 * media de la asignatura llegue a `target`.
 */
export function neededGrade(
  graded: number[],
  remaining: number,
  target: number,
): NeededGradeResult {
  const sum = graded.reduce((a, b) => a + b, 0);
  const total = graded.length + Math.max(0, remaining);
  const media = graded.length ? sum / graded.length : null;

  if (remaining <= 0 || total === 0) {
    return {
      kind: "done",
      message: "No quedan exámenes: la media ya es la que es.",
    };
  }
  const needed = target * total - sum;
  if (needed <= 0) {
    return {
      kind: "done",
      message: media
        ? `Ya superas el objetivo: con tu media ${media.toFixed(1)}, aunque baje un poco sigues por encima.`
        : "Objetivo ya cubierto.",
    };
  }
  const perExam = needed / remaining;
  if (perExam > 10) {
    const realistic = (sum + 10 * remaining) / total;
    return {
      kind: "impossible",
      needed: perExam,
      message: `Pediría un ${perExam.toFixed(1)} de media: inalcanzable. Con dieces en todo lo que queda llegarías a ${realistic.toFixed(1)}.`,
    };
  }
  return {
    kind: "ok",
    needed: perExam,
    message: `Te basta con un ${perExam.toFixed(1)} de media en los ${remaining} examen${remaining > 1 ? "es" : ""} que quedan.`,
  };
}

// ---------- Presupuesto de horas semanal ----------

export interface BudgetEntry {
  subjectId: string;
  minutes: number;
  /** días para su próximo examen, si lo hay */
  examInDays: number | null;
  weak: boolean;
}

function sumMinutesBetween(state: StudyState, fromDaysAgo: number, toDaysAgo: number): number {
  const start = format(addDays(new Date(), -fromDaysAgo), "yyyy-MM-dd");
  const end = format(addDays(new Date(), -toDaysAgo), "yyyy-MM-dd");
  return state.sessions
    .filter((s) => s.date >= start && s.date <= end)
    .reduce((a, s) => a + s.minutes, 0);
}

function daysToNextExam(state: StudyState, subjectId: string, now: Date): number | null {
  const next = state.exams
    .filter((e) => e.subjectId === subjectId && e.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return next ? differenceInCalendarDays(parseISO(next.date), now) : null;
}

function subjectAverage(state: StudyState, subjectId: string): number | null {
  const grades = state.exams
    .filter((e) => e.subjectId === subjectId && e.grade !== undefined)
    .map((e) => e.grade as number);
  return grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
}

const round15 = (m: number) => Math.round(m / 15) * 15;

/**
 * Objetivo semanal repartido entre asignaturas: más minutos para las que
 * van flojas y para las que tienen examen cerca.
 */
export function weeklyBudget(state: StudyState, now = new Date()) {
  const goalMin = state.settings.weeklyGoalMin;
  const doneMin = sumMinutesBetween(state, 6, 0);
  const pct = goalMin > 0 ? Math.min(100, Math.round((doneMin / goalMin) * 100)) : 0;

  const entries: (BudgetEntry & { weight: number })[] = state.subjects.map((s) => {
    const avg = subjectAverage(state, s.id);
    const weak = avg !== null && avg < 7;
    const examInDays = daysToNextExam(state, s.id, now);
    const examWeight = examInDays === null ? 0 : examInDays <= 3 ? 3 : examInDays <= 7 ? 2 : 0;
    return {
      subjectId: s.id,
      minutes: 0,
      examInDays,
      weak,
      weight: 1 + (weak ? 1 : 0) + examWeight,
    };
  });
  const totalWeight = entries.reduce((a, e) => a + e.weight, 0);
  if (goalMin > 0 && totalWeight > 0) {
    for (const e of entries) e.minutes = round15((goalMin * e.weight) / totalWeight);
  }
  const perSubject = entries
    .map(({ weight: _weight, ...rest }) => rest)
    .sort((a, b) => b.minutes - a.minutes || (a.examInDays ?? 99) - (b.examInDays ?? 99));
  return { goalMin, doneMin, pct, perSubject };
}

// ---------- Informe de la semana ----------

export interface WeeklyReport {
  thisMin: number;
  prevMin: number;
  deltaPct: number | null;
  tasksDone: number;
  tasksTotal: number;
  newGrades: { subjectId: string; grade: number; title: string }[];
  priorities: BudgetEntry[];
}

export function weeklyReport(state: StudyState, now = new Date()): WeeklyReport {
  const thisMin = sumMinutesBetween(state, 6, 0);
  const prevMin = sumMinutesBetween(state, 13, 7);
  const start7 = format(addDays(now, -6), "yyyy-MM-dd");
  const weekTasks = state.tasks.filter((t) => t.date >= start7);
  const newGrades = state.exams
    .filter((e) => e.grade !== undefined && e.date >= start7)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({ subjectId: e.subjectId, grade: e.grade as number, title: e.title }));
  const report = weeklyBudget(state, now);
  return {
    thisMin,
    prevMin,
    deltaPct: prevMin > 0 ? Math.round(((thisMin - prevMin) / prevMin) * 100) : null,
    tasksDone: weekTasks.filter((t) => t.done).length,
    tasksTotal: weekTasks.length,
    newGrades,
    priorities: report.perSubject.filter((p) => p.minutes > 0).slice(0, 2),
  };
}

// ---------- Cuenta atrás de evaluación ----------

/** Días que faltan para el fin de la evaluación; null si no hay fecha o ya pasó. */
export function daysToTermEnd(state: StudyState, now = new Date()): number | null {
  const end = state.settings.termEndDate;
  if (!end) return null;
  const days = differenceInCalendarDays(parseISO(end), now);
  return days >= 0 ? days : null;
}

// ---------- Puente NotebookLM ----------

/**
 * Convierte una guía de estudio de NotebookLM en pares anverso/reverso.
 * Acepta Question/Answer, Pregunta/Respuesta y Q:/A:, con numeración,
 * negritas y pregunta y respuesta en líneas separadas.
 */
export function parseStudyGuide(text: string): { front: string; back: string }[] {
  const clean = (l: string) =>
    l
      .replace(/\*\*/g, "")
      .replace(/^[-*•]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();

  const label = (l: string): "q" | "a" | null => {
    const m = l.match(
      /^\s*(?:[-*•]\s*)?(?:\*\*)?\s*(question|pregunta|q|answer|respuesta|a)\b\s*\d*\s*\.?:?\s*(?:\*\*)?\s*(.*)$/i,
    );
    if (!m) return null;
    const tag = m[1]?.toLowerCase();
    if (!tag) return null;
    const isQ = tag.startsWith("q") || tag === "pregunta";
    // "a" ambiguo: solo cuenta como etiqueta de respuesta si hay separador
    if (!isQ && tag === "a" && !/^\s*(?:[-*•]\s*)?a\s*\d*\s*[:.]/i.test(l)) return null;
    void m[2];
    return isQ ? "q" : "a";
  };

  const rest = (l: string) =>
    l
      .replace(
        /^\s*(?:[-*•]\s*)?(?:\*\*)?\s*(question|pregunta|q|answer|respuesta|a)\b\s*\d*\s*\.?:?\s*(?:\*\*)?\s*/i,
        "",
      )
      .trim();

  const pairs: { front: string; back: string }[] = [];
  let mode: "q" | "a" | null = null;
  let front = "";
  let back = "";

  const flush = () => {
    if (front && back) pairs.push({ front: front.trim(), back: back.trim() });
    front = "";
    back = "";
    mode = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const l = clean(line);
    if (!l) continue;
    const tag = label(line);
    if (tag === "q") {
      flush();
      mode = "q";
      const r = rest(line);
      if (r) front = r;
      continue;
    }
    if (tag === "a") {
      mode = "a";
      const r = rest(line);
      if (r) back = r;
      continue;
    }
    if (mode === "q" && !front) {
      front = l;
      continue;
    }
    if (mode === "a") {
      back = back ? `${back} ${l}` : l;
      continue;
    }
    // línea suelta tras un bloque completo: nueva pregunta potencial
    if (front && back) flush();
    mode = "q";
    front = l;
  }
  flush();
  return pairs;
}

/** Markdown con todo el material de una asignatura, listo para subir a NotebookLM. */
export function buildNotebooklmExport(state: StudyState): string {
  const hoy = todayISO();
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  const start30 = format(addDays(new Date(), -29), "yyyy-MM-dd");
  const out: string[] = [
    `# Mi curso — material de estudio`,
    ``,
    `Exportado de "Mi Curso 4º ESO" el ${hoy}. Notas, exámenes, horario y tarjetas de repaso.`,
    ``,
  ];

  for (const s of state.subjects) {
    const exams = state.exams
      .filter((e) => e.subjectId === s.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    const grades = exams.filter((e) => e.grade !== undefined).map((e) => e.grade as number);
    const media = grades.length
      ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)
      : "sin notas";
    const minutes = state.sessions
      .filter((x) => x.subjectId === s.id && x.date >= start30)
      .reduce((a, x) => a + x.minutes, 0);
    const cards = state.cards.filter((c) => c.subjectId === s.id);

    out.push(`## ${s.name}`, ``);
    out.push(`Nota media: ${media}. Horas estudiadas (últimos 30 días): ${fmt(minutes)}.`, ``);

    if (exams.length > 0) {
      out.push(`### Exámenes`, ``);
      for (const e of exams) {
        const nota = e.grade !== undefined ? ` — nota: ${e.grade}` : "";
        const temas = e.topics ? ` (temas: ${e.topics})` : "";
        out.push(`- ${e.date}: ${e.title}${nota}${temas}`);
      }
      out.push(``);
    }

    const diasConClase = [1, 2, 3, 4, 5, 6, 0]
      .map((d) => ({
        d,
        slots: slotsForWeekday(state.schedule, d).filter((x) => x.subjectId === s.id),
      }))
      .filter((x) => x.slots.length > 0);
    if (diasConClase.length > 0) {
      out.push(`### Horario semanal`, ``);
      for (const { d, slots } of diasConClase) {
        for (const slot of slots) {
          out.push(`- ${WEEKDAY_NAMES[d]}: ${slot.startTime}–${slot.endTime}`);
        }
      }
      out.push(``);
    }

    if (cards.length > 0) {
      out.push(`### Tarjetas de repaso`, ``);
      for (const c of cards) {
        out.push(`- P: ${c.front} / R: ${c.back}`);
      }
      out.push(``);
    }
  }
  return out.join("\n");
}

/** Franjas de un día, ordenadas por hora de inicio. */
export function slotsForWeekday(schedule: ClassSlot[], weekday: number): ClassSlot[] {
  return schedule
    .filter((s) => s.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
}

/** A cuántas tareas, exámenes y franjas de horario sujeta una asignatura. */
export function subjectReferences(
  state: StudyState,
  subjectId: string,
): { tasks: number; exams: number; slots: number } {
  return {
    tasks: state.tasks.filter((t) => t.subjectId === subjectId).length,
    exams: state.exams.filter((e) => e.subjectId === subjectId).length,
    slots: state.schedule.filter((c) => c.subjectId === subjectId).length,
  };
}

export function canRemoveSubject(state: StudyState, subjectId: string): boolean {
  const r = subjectReferences(state, subjectId);
  return r.tasks === 0 && r.exams === 0 && r.slots === 0;
}

export function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToHHmm(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export interface BusyBlock {
  start: string;
  end: string;
  kind: "clase" | "extra";
  label: string;
}

/** Clases + extraescolares de hoy, ordenados por hora de inicio. */
export function busyIntervalsToday(state: StudyState, now = new Date()): BusyBlock[] {
  const weekday = now.getDay();
  const blocks: BusyBlock[] = [];
  for (const slot of slotsForWeekday(state.schedule, weekday)) {
    const subject = state.subjects.find((s) => s.id === slot.subjectId);
    blocks.push({
      start: slot.startTime,
      end: slot.endTime,
      kind: "clase",
      label: subject?.name ?? "Clase",
    });
  }
  for (const e of state.extras.filter((x) => x.weekdays.includes(weekday))) {
    blocks.push({ start: e.startTime, end: e.endTime, kind: "extra", label: e.name });
  }
  return blocks.sort((a, b) => a.start.localeCompare(b.start));
}

/** La clase o extraescolar que está ocurriendo ahora mismo, si la hay. */
export function activeBlockNow(state: StudyState, now = new Date()): BusyBlock | null {
  const hhmm = format(now, "HH:mm");
  return busyIntervalsToday(state, now).find((b) => b.start <= hhmm && hhmm < b.end) ?? null;
}

/** Fin de la jornada de estudio: pasado esto no se sugiere estudiar. */
export const DAY_END = "21:30";
/** Hueco mínimo para que merezca la pena un pomodoro + descanso. */
export const MIN_STUDY_WINDOW_MIN = 45;
/** No sugerir maratones: la franja sugerida se recorta a esto. */
export const MAX_SUGGESTED_MIN = 120;

/** Huecos libres de hoy desde ahora hasta DAY_END. */
export function freeWindowsToday(
  state: StudyState,
  now = new Date(),
  dayEnd = DAY_END,
): { start: string; end: string; minutes: number }[] {
  const endM = hhmmToMinutes(dayEnd);
  let cursor = now.getHours() * 60 + now.getMinutes();
  const windows: { start: number; end: number }[] = [];
  for (const b of busyIntervalsToday(state, now)) {
    const startM = hhmmToMinutes(b.start);
    const endBlock = hhmmToMinutes(b.end);
    if (endBlock <= cursor) continue; // ya pasó
    if (startM > cursor) {
      windows.push({ start: cursor, end: Math.min(startM, endM) });
    }
    cursor = Math.max(cursor, endBlock);
    if (cursor >= endM) break;
  }
  if (cursor < endM) windows.push({ start: cursor, end: endM });
  return windows
    .filter((w) => w.end - w.start >= MIN_STUDY_WINDOW_MIN)
    .map((w) => ({
      start: minutesToHHmm(w.start),
      end: minutesToHHmm(w.end),
      minutes: w.end - w.start,
    }));
}

/**
 * Mejor franja para estudiar hoy: prioriza el hueco justo antes de una
 * extraescolar, luego el anterior a una clase, y de desempate el más largo.
 */
export function bestStudyWindow(
  state: StudyState,
  now = new Date(),
): { start: string; end: string; reason: string } | null {
  const busy = busyIntervalsToday(state, now);
  const windows = freeWindowsToday(state, now);
  let best: { start: string; end: string; reason: string; score: number } | null = null;
  for (const w of windows) {
    const next = busy.find(
      (b) => b.start >= w.end && hhmmToMinutes(b.start) - hhmmToMinutes(w.end) <= 30,
    );
    let score = w.minutes;
    let reason: string;
    if (next && next.kind === "extra") {
      score += 50;
      reason = `antes de ${next.label}`;
    } else if (next) {
      score += 20;
      reason = `antes de ${next.label}`;
    } else {
      reason = "última franja del día";
    }
    const cappedEnd = Math.min(hhmmToMinutes(w.end), hhmmToMinutes(w.start) + MAX_SUGGESTED_MIN);
    const candidate = {
      start: w.start,
      end: minutesToHHmm(cappedEnd),
      reason,
      score,
    };
    if (!best || candidate.score > best.score) best = candidate;
  }
  if (!best) return null;
  return { start: best.start, end: best.end, reason: best.reason };
}
