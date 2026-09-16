import { useSyncExternalStore } from "react";
import { addDays, format } from "date-fns";
import {
  EMPTY_STATE,
  type StudyState,
  type Task,
  type Exam,
  type Extra,
} from "./study-types";
import { generateReviewTasks, todayISO, uid } from "./study-utils";

const STORAGE_KEY = "mi-curso-4eso-v1";

let state: StudyState = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // almacenamiento lleno o bloqueado: la app sigue funcionando en memoria
  }
}

function setState(next: StudyState) {
  state = next;
  persist();
  emit();
}

/** Carga datos guardados; si es la primera vez, crea ejemplos con tus asignaturas. */
export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudyState;
      state = { ...EMPTY_STATE, ...parsed, subjects: EMPTY_STATE.subjects };
      emit();
      return;
    }
  } catch {
    // datos corruptos -> se regeneran ejemplos
  }
  seedExamples();
}

function seedExamples() {
  const today = new Date();
  const inDays = (n: number) => format(addDays(today, n), "yyyy-MM-dd");
  const examMates: Exam = {
    id: uid(),
    subjectId: "mates",
    title: "Ecuaciones y sistemas",
    date: inDays(6),
    topics: "Ecuaciones de 2º grado, sistemas 2x2, problemas",
  };
  const examIngles: Exam = {
    id: uid(),
    subjectId: "ingles",
    title: "Unit 4: Past tenses",
    date: inDays(10),
    topics: "Past simple, past continuous, vocabulario",
    grade: undefined,
  };
  const pastExams: Exam[] = [
    {
      id: uid(),
      subjectId: "mates",
      title: "Polinomios",
      date: format(addDays(today, -12), "yyyy-MM-dd"),
      topics: "",
      grade: 8.5,
    },
    {
      id: uid(),
      subjectId: "economia",
      title: "La empresa y el mercado",
      date: format(addDays(today, -8), "yyyy-MM-dd"),
      topics: "",
      grade: 7.5,
    },
    {
      id: uid(),
      subjectId: "sociales",
      title: "El siglo XIX",
      date: format(addDays(today, -5), "yyyy-MM-dd"),
      topics: "",
      grade: 6.5,
    },
  ];
  const extras: Extra[] = [
    {
      id: uid(),
      name: "Baloncesto",
      weekday: 2,
      startTime: "18:00",
      endTime: "19:30",
    },
    {
      id: uid(),
      name: "Clase de guitarra",
      weekday: 4,
      startTime: "17:30",
      endTime: "18:30",
    },
  ];
  const tasks: Task[] = [
    ...generateReviewTasks(examMates, "Matemáticas"),
    ...generateReviewTasks(examIngles, "Inglés"),
    {
      id: uid(),
      subjectId: "sociales",
      title: "Hacer esquema del tema 5",
      date: todayISO(),
      kind: "pomodoro",
      done: false,
    },
  ];
  const sessions = [1, 2, 4, 5].map((d) => ({
    id: uid(),
    date: format(addDays(today, -d), "yyyy-MM-dd"),
    subjectId: "mates",
    minutes: 25,
  }));
  setState({
    subjects: EMPTY_STATE.subjects,
    tasks,
    exams: [examMates, examIngles, ...pastExams],
    extras,
    sessions,
  });
}

export function useStudyStore(): StudyState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY_STATE,
  );
}

// ---------- Acciones ----------

export function addTask(
  input: Omit<Task, "id" | "done"> & { done?: boolean },
) {
  setState({
    ...state,
    tasks: [...state.tasks, { ...input, id: uid(), done: input.done ?? false }],
  });
}

export function toggleTask(id: string) {
  setState({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t,
    ),
  });
}

export function removeTask(id: string) {
  setState({ ...state, tasks: state.tasks.filter((t) => t.id !== id) });
}

export function moveTask(id: string, date: string) {
  setState({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, date } : t)),
  });
}

export function setTaskResult(id: string, result: Task["result"]) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  const tasks = state.tasks.map((t) =>
    t.id === id ? { ...t, result, done: true } : t,
  );
  // Active recall: si va mal, se reprograma automáticamente para mañana
  if (result === "mal") {
    tasks.push({
      ...task,
      id: uid(),
      done: false,
      result: undefined,
      date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      title: task.title + " (repetir)",
    });
  }
  setState({ ...state, tasks });
}

export function addExam(input: Omit<Exam, "id">) {
  const exam: Exam = { ...input, id: uid() };
  const subject = state.subjects.find((s) => s.id === exam.subjectId);
  const reviewTasks = generateReviewTasks(exam, subject?.name ?? "");
  setState({
    ...state,
    exams: [...state.exams, exam],
    tasks: [...state.tasks, ...reviewTasks],
  });
}

export function removeExam(id: string) {
  setState({
    ...state,
    exams: state.exams.filter((e) => e.id !== id),
    tasks: state.tasks.filter((t) => t.examId !== id),
  });
}

export function setExamGrade(id: string, grade: number | undefined) {
  setState({
    ...state,
    exams: state.exams.map((e) => (e.id === id ? { ...e, grade } : e)),
  });
}

export function addExtra(input: Omit<Extra, "id">) {
  setState({ ...state, extras: [...state.extras, { ...input, id: uid() }] });
}

export function removeExtra(id: string) {
  setState({ ...state, extras: state.extras.filter((e) => e.id !== id) });
}

export function logSession(minutes: number, subjectId?: string) {
  setState({
    ...state,
    sessions: [
      ...state.sessions,
      { id: uid(), date: todayISO(), minutes, subjectId },
    ],
  });
}
