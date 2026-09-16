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
  auto?: boolean;
  examId?: string;
  result?: "facil" | "regular" | "mal";
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  /** ISO day */
  date: string;
  topics: string;
  grade?: number;
}

export interface Extra {
  id: string;
  name: string;
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface SessionLog {
  id: string;
  /** ISO day */
  date: string;
  subjectId?: string;
  minutes: number;
}

export interface StudyState {
  subjects: Subject[];
  tasks: Task[];
  exams: Exam[];
  extras: Extra[];
  sessions: SessionLog[];
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

export const EMPTY_STATE: StudyState = {
  subjects: SUBJECT_SEED,
  tasks: [],
  exams: [],
  extras: [],
  sessions: [],
};
