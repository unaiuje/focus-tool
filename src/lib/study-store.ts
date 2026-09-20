import { useSyncExternalStore } from "react";
import { addDays, format } from "date-fns";
import {
  EMPTY_STATE,
  DEFAULT_WEEKLY_GOAL_MIN,
  SUBJECT_SEED,
  type StudyState,
  type Task,
  type Exam,
  type Extra,
  type ClassSlot,
  type Subject,
  type Profile,
  type AppSettings,
  type Flashcard,
} from "./study-types";
import {
  generateReviewTasks,
  LEITNER_INTERVALS,
  parseStudyGuide,
  todayISO,
  uid,
} from "./study-utils";
import {
  loadProfilesServer,
  loadStateServer,
  removeProfileServer,
  saveProfilesServer,
  saveProfileStateServer,
} from "./sync-server";

// ---------- Almacenamiento multi-perfil ----------
//
// Nivel 1 (instantáneo): localStorage del navegador
// - mi-curso-4eso-v2:index            -> { profiles, activeId }
// - mi-curso-4eso-v2:profile:<id>     -> StudyState de esa persona
// - mi-curso-4eso-v1                  -> datos antiguos (un solo usuario);
//                                        solo se leen para migrarlos al primer perfil
// Nivel 2 (definitivo): SQLite en el PC vía server functions (sync-server.ts).
// Cada escritura va a los dos; al arrancar se lee del servidor y, si está
// vacío, se sube lo que tenga este navegador.

const INDEX_KEY = "mi-curso-4eso-v2:index";
const LEGACY_KEY = "mi-curso-4eso-v1";
const profileKey = (id: string) => `mi-curso-4eso-v2:profile:${id}`;

const EMPTY_PROFILES: Profile[] = [];

interface ProfileIndex {
  profiles: Profile[];
  activeId: string | null;
}

let state: StudyState = EMPTY_STATE;
let profiles: Profile[] = EMPTY_PROFILES;
let activeId: string | null = null;
let hydrated = false;
/** Se incrementa con cada mutación o cambio de perfil: invalida respuestas
 *  del servidor que llegan tarde y pisarían datos más nuevos. */
let dataEpoch = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Lanza una escritura al servidor sin bloquear la UI; sin servidor no pasa nada. */
function fire(p: Promise<unknown>) {
  p.catch(() => {
    // modo solo-navegador (p. ej. hosting estático)
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o bloqueado: la app sigue funcionando en memoria
  }
}

/** Rellena campos que falten (p. ej. `schedule` en datos antiguos) y repara corruptos. */
export function normalizeState(raw: unknown): StudyState {
  const p = (raw ?? {}) as Partial<StudyState>;
  const settings = (p.settings ?? {}) as Partial<AppSettings>;
  return {
    subjects:
      Array.isArray(p.subjects) && p.subjects.length > 0
        ? p.subjects
        : SUBJECT_SEED.map((s) => ({ ...s })),
    schedule: Array.isArray(p.schedule) ? p.schedule : [],
    tasks: Array.isArray(p.tasks) ? p.tasks : [],
    exams: Array.isArray(p.exams) ? p.exams : [],
    extras: Array.isArray(p.extras) ? p.extras.map(normalizeExtra) : [],
    sessions: Array.isArray(p.sessions) ? p.sessions : [],
    cards: Array.isArray(p.cards) ? p.cards : [],
    simulacros: Array.isArray(p.simulacros) ? p.simulacros : [],
    settings: {
      weeklyGoalMin:
        typeof settings.weeklyGoalMin === "number"
          ? settings.weeklyGoalMin
          : DEFAULT_WEEKLY_GOAL_MIN,
      reminderHour: typeof settings.reminderHour === "number" ? settings.reminderHour : null,
      termEndDate: typeof settings.termEndDate === "string" ? settings.termEndDate : null,
    },
    checklistDays: Array.isArray(p.checklistDays) ? p.checklistDays : [],
  };
}

/** Admite extras del formato antiguo (un solo `weekday` numérico). */
function normalizeExtra(raw: unknown): Extra {
  const e = (raw ?? {}) as { [k: string]: unknown };
  const weekdays = Array.isArray(e["weekdays"])
    ? e["weekdays"].filter((d): d is number => typeof d === "number")
    : typeof e["weekday"] === "number"
      ? [e["weekday"]]
      : [];
  return {
    id: typeof e["id"] === "string" ? e["id"] : uid(),
    name: typeof e["name"] === "string" ? e["name"] : "Actividad",
    weekdays,
    startTime: typeof e["startTime"] === "string" ? e["startTime"] : "18:00",
    endTime: typeof e["endTime"] === "string" ? e["endTime"] : "19:30",
  };
}

function persist() {
  if (!activeId) return; // sin perfil activo no se escribe nada
  writeJSON(profileKey(activeId), state);
  fire(saveProfileStateServer({ data: { id: activeId, state } }));
}

function persistIndex() {
  writeJSON(INDEX_KEY, { profiles, activeId } satisfies ProfileIndex);
  fire(saveProfilesServer({ data: { profiles } }));
}

function loadProfileState(id: string): StudyState {
  return normalizeState(readJSON<unknown>(profileKey(id)));
}

/** Carga el índice de perfiles y el estado del perfil activo (si lo hay). */
export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const idx = readJSON<Partial<ProfileIndex>>(INDEX_KEY);
  profiles = Array.isArray(idx?.profiles) ? idx.profiles : [];
  activeId =
    idx?.activeId && profiles.some((p) => p.id === idx.activeId)
      ? idx.activeId
      : (profiles[0]?.id ?? null);
  state = activeId ? loadProfileState(activeId) : EMPTY_STATE;
  emit();
  void syncFromServer();
}

/** Trae perfiles y estado del perfil activo desde SQLite. Si el servidor está
 *  vacío pero este navegador tiene datos, los sube (importación transparente).
 *  El perfil activo nunca se decide en el servidor: es cosa de cada navegador. */
async function syncFromServer() {
  const epoch = ++dataEpoch;
  try {
    const serverProfiles = await loadProfilesServer();
    if (epoch !== dataEpoch) return; // el usuario ya hizo algo: manda lo local
    if (serverProfiles.length === 0) {
      if (profiles.length > 0) {
        persistIndex();
        if (activeId) persist();
      }
      return;
    }
    profiles = serverProfiles;
    // el perfil activo del navegador dejó de existir (borrado en otro sitio)
    if (activeId && !profiles.some((p) => p.id === activeId)) {
      activeId = null;
      state = EMPTY_STATE;
    }
    writeJSON(INDEX_KEY, { profiles, activeId } satisfies ProfileIndex);
    if (!activeId) {
      // sin perfil activo en este navegador: gate con la lista del servidor
      emit();
      return;
    }
    const remote = await loadStateServer({ data: { id: activeId } });
    if (epoch !== dataEpoch) return;
    if (remote) state = normalizeState(remote);
    persist(); // refresca la caché local; si no había estado remoto, lo sube
    emit();
  } catch {
    // sin servidor: modo solo-navegador
  }
}

/** ¿Hay datos de la versión antigua (una sola persona) sin migrar? */
export function hasLegacyData(): boolean {
  if (typeof window === "undefined") return false;
  const legacy = readJSON<{ tasks?: unknown }>(LEGACY_KEY);
  return Boolean(legacy && Array.isArray(legacy.tasks));
}

// ---------- Perfiles ----------

export function listProfiles(): Profile[] {
  return profiles;
}

export function activeProfileId(): string | null {
  return activeId;
}

export function useStudyStore(): StudyState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY_STATE,
  );
}

export function useProfiles(): Profile[] {
  return useSyncExternalStore(
    subscribe,
    () => profiles,
    () => EMPTY_PROFILES,
  );
}

export function useActiveProfileId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => activeId,
    () => null,
  );
}

/** Crea un perfil y cambia a él. Si es el primero y hay datos de la v1, los adopta. */
export function createProfile(name: string, opts?: { withExamples?: boolean }): Profile {
  const adopt = profiles.length === 0 && hasLegacyData();
  const profile: Profile = {
    id: uid(),
    name: name.trim() || "Sin nombre",
    createdAt: new Date().toISOString(),
  };
  state = adopt
    ? normalizeState(readJSON(LEGACY_KEY))
    : opts?.withExamples
      ? exampleState()
      : normalizeState(null);
  profiles = [...profiles, profile];
  activeId = profile.id;
  persist();
  persistIndex();
  emit();
  return profile;
}

export function switchProfile(id: string) {
  if (id === activeId || !profiles.some((p) => p.id === id)) return;
  const epoch = ++dataEpoch;
  activeId = id;
  // Caché local; si este navegador no tiene datos del perfil, llegan de SQLite
  state = loadProfileState(id);
  persistIndex();
  emit();
  void (async () => {
    try {
      const remote = await loadStateServer({ data: { id } });
      if (epoch !== dataEpoch || !remote) return;
      state = normalizeState(remote);
      writeJSON(profileKey(id), state); // solo caché: no re-empujar al servidor
      emit();
    } catch {
      // modo solo-navegador
    }
  })();
}

export function renameProfile(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  profiles = profiles.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
  persistIndex();
  emit();
}

/** Borra el perfil y TODOS sus datos. Si era el activo, pasa al primero restante. */
export function deleteProfile(id: string) {
  if (!profiles.some((p) => p.id === id)) return;
  profiles = profiles.filter((p) => p.id !== id);
  if (activeId === id) {
    activeId = profiles[0]?.id ?? null;
    state = activeId ? loadProfileState(activeId) : EMPTY_STATE;
  }
  persistIndex();
  fire(removeProfileServer({ data: { id } }));
  try {
    localStorage.removeItem(profileKey(id));
  } catch {
    // nada crítico: la clave huérfana no afecta a nadie
  }
  emit();
}

/** Vuelve a la pantalla "¿Quién eres?" sin borrar nada. */
export function signOut() {
  activeId = null;
  state = EMPTY_STATE;
  persistIndex();
  emit();
}

/** Estado con datos de ejemplo, para probar la app sin nada real. */
function exampleState(): StudyState {
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
      weekdays: [2, 4],
      startTime: "18:00",
      endTime: "19:30",
    },
    {
      id: uid(),
      name: "Clase de guitarra",
      weekdays: [4],
      startTime: "17:30",
      endTime: "18:30",
    },
  ];
  const schedule: ClassSlot[] = [
    { id: uid(), subjectId: "mates", weekday: 1, startTime: "08:30", endTime: "09:20" },
    { id: uid(), subjectId: "castellano", weekday: 1, startTime: "09:20", endTime: "10:10" },
    { id: uid(), subjectId: "economia", weekday: 2, startTime: "08:30", endTime: "09:20" },
    { id: uid(), subjectId: "mates", weekday: 3, startTime: "08:30", endTime: "09:20" },
    { id: uid(), subjectId: "ingles", weekday: 5, startTime: "10:10", endTime: "11:00" },
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
  const cards: Flashcard[] = [
    {
      id: uid(),
      subjectId: "ingles",
      front: "to achieve",
      back: "conseguir, lograr",
      box: 1,
      due: todayISO(),
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      subjectId: "ingles",
      front: "however",
      back: "sin embargo",
      box: 1,
      due: todayISO(),
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      subjectId: "ingles",
      front: "to borrow",
      back: "pedir prestado",
      box: 1,
      due: todayISO(),
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      subjectId: "mates",
      front: "Fórmula de la ecuación de 2º grado",
      back: "x = (-b ± √(b² - 4ac)) / 2a",
      box: 1,
      due: todayISO(),
      createdAt: new Date().toISOString(),
    },
  ];
  return normalizeState({
    subjects: SUBJECT_SEED.map((s) => ({ ...s })),
    schedule,
    tasks,
    exams: [examMates, examIngles, ...pastExams],
    extras,
    sessions,
    cards,
  });
}

// ---------- Acciones ----------

export function addTask(input: Omit<Task, "id" | "done"> & { done?: boolean }) {
  setState({
    ...state,
    tasks: [...state.tasks, { ...input, id: uid(), done: input.done ?? false }],
  });
}

export function toggleTask(id: string) {
  setState({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
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
  const tasks = state.tasks.map((t) => (t.id === id ? { ...t, result, done: true } : t));
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
    simulacros: state.simulacros.filter((s) => s.examId !== id),
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

export function addClassSlot(input: Omit<ClassSlot, "id">) {
  const slot: ClassSlot = { ...input, id: uid() };
  setState({ ...state, schedule: [...state.schedule, slot] });
}

export function removeClassSlot(id: string) {
  setState({
    ...state,
    schedule: state.schedule.filter((s) => s.id !== id),
  });
}

export function addSubject(input: { name: string; color: string }) {
  const name = input.name.trim();
  if (!name) return;
  const subject: Subject = { id: uid(), name, color: input.color };
  setState({ ...state, subjects: [...state.subjects, subject] });
}

export function updateSubject(id: string, changes: Partial<Pick<Subject, "name" | "color">>) {
  setState({
    ...state,
    subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...changes } : s)),
  });
}

/** Solo borra si ninguna tarea, examen o franja de horario la usa. */
export function removeSubject(id: string) {
  const used =
    state.tasks.some((t) => t.subjectId === id) ||
    state.exams.some((e) => e.subjectId === id) ||
    state.schedule.some((c) => c.subjectId === id);
  if (used) return;
  setState({ ...state, subjects: state.subjects.filter((s) => s.id !== id) });
}

export function logSession(minutes: number, subjectId?: string) {
  setState({
    ...state,
    sessions: [...state.sessions, { id: uid(), date: todayISO(), minutes, subjectId }],
  });
}

// ---------- Tarjetas ----------

/** Clave de contenido: evita duplicar la misma tarjeta en la misma asignatura. */
const cardKey = (subjectId: string, front: string, back: string) =>
  `${subjectId}|${front.toLowerCase()}|${back.toLowerCase()}`;

export function addCard(input: { subjectId: string; front: string; back: string }) {
  const front = input.front.trim();
  const back = input.back.trim();
  if (!input.subjectId || !front || !back) return;
  const key = cardKey(input.subjectId, front, back);
  if (state.cards.some((c) => cardKey(c.subjectId, c.front, c.back) === key)) return;
  const card: Flashcard = {
    id: uid(),
    subjectId: input.subjectId,
    front,
    back,
    box: 1,
    due: todayISO(),
    createdAt: new Date().toISOString(),
  };
  setState({ ...state, cards: [...state.cards, card] });
}

/** Alta en masa. Formato "lista": una por línea, "anverso ; reverso".
 *  Formato "guia": pega la guía de estudio de NotebookLM (Question/Answer)
 *  y la convierte en tarjetas. Devuelve cuántas entraron. */
export function addCardsBulk(
  subjectId: string,
  text: string,
  format: "lista" | "guia" = "lista",
): number {
  if (!subjectId) return 0;
  const pairs =
    format === "guia"
      ? parseStudyGuide(text)
      : text
          .split("\n")
          .map((line) => line.split(";"))
          .filter((parts) => parts.length >= 2 && parts[0]?.trim() && parts[1]?.trim())
          .map((parts) => ({
            front: parts[0]?.trim() ?? "",
            back: parts.slice(1).join(";").trim(),
          }));
  const existing = new Set(state.cards.map((c) => cardKey(c.subjectId, c.front, c.back)));
  const cards: Flashcard[] = pairs
    .filter((p) => p.front && p.back)
    .map((p) => ({
      id: uid(),
      subjectId,
      front: p.front,
      back: p.back,
      box: 1,
      due: todayISO(),
      createdAt: new Date().toISOString(),
    }))
    .filter((c) => {
      const key = cardKey(c.subjectId, c.front, c.back);
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
  if (cards.length === 0) return 0;
  setState({ ...state, cards: [...state.cards, ...cards] });
  return cards.length;
}

export function deleteCard(id: string) {
  setState({ ...state, cards: state.cards.filter((c) => c.id !== id) });
}

/** Repetición espaciada: "mal" vuelve a la caja 1; "bien" sube de caja. */
export function gradeCard(id: string, result: "mal" | "regular" | "bien") {
  const card = state.cards.find((c) => c.id === id);
  if (!card) return;
  const box =
    result === "mal"
      ? 1
      : result === "bien"
        ? Math.min(LEITNER_INTERVALS.length, card.box + 1)
        : card.box;
  const interval = LEITNER_INTERVALS[box - 1] ?? 1;
  const due = format(addDays(new Date(), interval), "yyyy-MM-dd");
  setState({
    ...state,
    cards: state.cards.map((c) => (c.id === id ? { ...c, box, due } : c)),
  });
}

// ---------- Simulacros y ajustes ----------

export function addSimulacro(input: { examId: string; minutes: number; score: number }) {
  const exam = state.exams.find((e) => e.id === input.examId);
  if (!exam) return;
  const minutes = Math.max(1, Math.round(input.minutes));
  const score = Math.min(10, Math.max(0, input.score));
  setState({
    ...state,
    simulacros: [
      ...state.simulacros,
      { id: uid(), examId: exam.id, date: todayISO(), minutes, score },
    ],
    // el esfuerzo del simulacro cuenta también en las gráficas de horas
    sessions: [
      ...state.sessions,
      { id: uid(), date: todayISO(), minutes, subjectId: exam.subjectId },
    ],
  });
}

export function updateSettings(patch: Partial<AppSettings>) {
  const next = { ...state.settings, ...patch };
  if (typeof next.weeklyGoalMin === "number") {
    next.weeklyGoalMin = Math.max(0, Math.min(4200, Math.round(next.weeklyGoalMin)));
  }
  if (typeof next.reminderHour === "number") {
    next.reminderHour = Math.max(0, Math.min(23, Math.round(next.reminderHour)));
  }
  setState({ ...state, settings: next });
}

/** Marca la checklist nocturna de hoy como hecha. */
export function completeChecklistToday() {
  const today = todayISO();
  if (state.checklistDays.includes(today)) return;
  setState({ ...state, checklistDays: [...state.checklistDays, today] });
}

function setState(next: StudyState) {
  state = next;
  dataEpoch++;
  persist();
  emit();
}
