import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { StudyState, Task, Exam } from "./study-types";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Días de repaso espaciado antes de un examen: -7, -3, -1 */
export const SPACED_OFFSETS = [7, 3, 1];

export function generateReviewTasks(exam: Exam, subjectName: string): Task[] {
  const examDay = parseISO(exam.date);
  const today = startOfDay(new Date());
  const tasks: Task[] = [];
  for (const offset of SPACED_OFFSETS) {
    const day = addDays(examDay, -offset);
    if (isBefore(day, today)) continue;
    const label =
      offset === 7
        ? "Primer repaso"
        : offset === 3
          ? "Segundo repaso"
          : "Repaso final";
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
    const avg = grades.length
      ? grades.reduce((a, b) => a + b, 0) / grades.length
      : null;
    if (avg !== null && avg < 7) {
      result.push({
        subjectId: s.id,
        reason: `Nota media: ${avg.toFixed(1)} — por debajo de 7`,
      });
      continue;
    }
    const badReviews = state.tasks.filter(
      (t) => t.subjectId === s.id && t.result === "mal",
    );
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
      minutes: state.sessions
        .filter((s) => s.date === iso)
        .reduce((a, s) => a + s.minutes, 0),
    });
  }
  return out;
}
