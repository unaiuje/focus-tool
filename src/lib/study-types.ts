export interface Subject {
  id: string;
  name: string;
  color: string;
}

export type TaskKind = "pomodoro" | "repaso" | "tarea";

export interface Task {
  id: string;
  subjectId: string;
  title: string;
  /** ISO day: yyyy-MM-dd */
  date: string;
  kind: TaskKind;
  done: boolean;
  auto?: boolean | undefined;
  examId?: string | undefined;
  result?: "facil" | "regular" | "mal" | undefined;
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  /** ISO day */
  date: string;
  topics: string;
  grade?: number | undefined;
}

export interface Extra {
  id: string;
  name: string;
  /** Días a la semana, 0 = domingo ... 6 = sábado (p. ej. martes y jueves: [2, 4]) */
  weekdays: number[];
  startTime: string;
  endTime: string;
}

/** Franja fija de clase: asignatura + día + hora. */
export interface ClassSlot {
  id: string;
  subjectId: string;
  /** 0 = domingo ... 6 = sábado (mismo convenio que Extra) */
  weekday: number;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
}

/** Persona que usa la app en este dispositivo. Cada una tiene sus datos. */
export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

export interface SessionLog {
  id: string;
  /** ISO day */
  date: string;
  subjectId?: string | undefined;
  minutes: number;
}

/** Tarjeta de estudio con repetición espaciada (cajas de Leitner). */
export interface Flashcard {
  id: string;
  subjectId: string;
  front: string;
  back: string;
  /** 1..5: a más caja, más días entre repasos */
  box: number;
  /** ISO day en que vuelve a tocar */
  due: string;
  createdAt: string;
}

/** Examen simulado: cuenta atrás + nota de autoevaluación. */
export interface Simulacro {
  id: string;
  examId: string;
  /** ISO day */
  date: string;
  minutes: number;
  /** 0-10 */
  score: number;
}

export interface AppSettings {
  /** Objetivo de estudio semanal en minutos (0 = sin objetivo). */
  weeklyGoalMin: number;
  /** Hora del recordatorio diario (0-23); null = desactivado. */
  reminderHour: number | null;
  /** Fin de la evaluación, "yyyy-MM-dd"; null = sin fecha. */
  termEndDate: string | null;
}

export interface StudyState {
  subjects: Subject[];
  schedule: ClassSlot[];
  tasks: Task[];
  exams: Exam[];
  extras: Extra[];
  sessions: SessionLog[];
  cards: Flashcard[];
  simulacros: Simulacro[];
  settings: AppSettings;
  /** Días (ISO) en que la checklist nocturna quedó hecha. */
  checklistDays: string[];
}

export const SUBJECT_SEED: Subject[] = [
  { id: "mates", name: "Matemáticas", color: "#2563eb" },
  { id: "castellano", name: "Castellano", color: "#dc2626" },
  { id: "catalan", name: "Catalán", color: "#ea580c" },
  { id: "sociales", name: "Sociales", color: "#ca8a04" },
  { id: "ingles", name: "Inglés", color: "#7c3aed" },
  { id: "tecno", name: "Tecnología", color: "#0891b2" },
  { id: "economia", name: "Economía", color: "#16a34a" },
  { id: "filosofia", name: "Filosofía", color: "#db2777" },
  { id: "etica", name: "Ética", color: "#65a30d" },
  { id: "edfisica", name: "Ed. Física", color: "#e11d48" },
];

/** Paleta para asignaturas nuevas. */
export const SUBJECT_PALETTE = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#ea580c",
  "#65a30d",
  "#e11d48",
];

/** Objetivo semanal por defecto: 7 horas. */
export const DEFAULT_WEEKLY_GOAL_MIN = 420;

export const EMPTY_STATE: StudyState = {
  // clonado: cada perfil debe tener su propia copia editable
  subjects: SUBJECT_SEED.map((s) => ({ ...s })),
  schedule: [],
  tasks: [],
  exams: [],
  extras: [],
  sessions: [],
  cards: [],
  simulacros: [],
  settings: { weeklyGoalMin: DEFAULT_WEEKLY_GOAL_MIN, reminderHour: null, termEndDate: null },
  checklistDays: [],
};
