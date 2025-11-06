"use client";

// WARNING: This localStorage store is ONLY for teacher draft metadata and temporary UI state
// NEVER store sensitive data like correct answers, student results, or exam submissions here
// All exam data should be fetched from and validated by the API/database

export type ExamStatus = "draft" | "active" | "completed" | "archived";

export interface StoredQuestion {
  id: string; // Reference to question in database
  points: number;
  // Note: question text, options, and correct answers are NOT stored here
  // They must be fetched from the API to prevent client-side tampering
}

export interface ExamSecuritySettings {
  preventTabSwitching: boolean;
  requireWebcam: boolean;
  lockdownBrowser: boolean; // Includes: dev tools blocking, copy/paste prevention, right-click disable, Alt+Tab block, print prevention
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  allowReview: boolean;
  enableFullscreenMode: boolean;
}

export interface StoredExam {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  status: ExamStatus;
  createdBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  questions: StoredQuestion[]; // Only references, actual data from API
  scheduledFor?: string;
  securitySettings: ExamSecuritySettings;
}

const EXAMS_KEY = "ops_exams_v1";

function nowIso() {
  return new Date().toISOString();
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function broadcast() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examStoreChanged'));
  }
}



export function getExams(): StoredExam[] {
  const exams = read<StoredExam[]>(EXAMS_KEY, []);
  // Auto-promote scheduled drafts whose time has arrived
  const now = Date.now();
  let changed = false;
  const updated = exams.map(e => {
    if (e.status === 'draft' && e.scheduledFor) {
      const sched = Date.parse(e.scheduledFor);
      if (!isNaN(sched) && sched <= now) {
        changed = true;
        return { ...e, status: 'active', updatedAt: nowIso() } as StoredExam;
      }
    }
    return e;
  });
  if (changed) {
    write(EXAMS_KEY, updated);
    return updated;
  }
  return exams;
}

export function getExam(id: string): StoredExam | undefined {
  return getExams().find((e) => e.id === id);
}

export function saveExams(exams: StoredExam[]) {
  write(EXAMS_KEY, exams);
}

export function createExam(partial: Partial<StoredExam>): StoredExam {
  const exams = getExams();
  const defaultSecuritySettings: ExamSecuritySettings = {
    preventTabSwitching: false,
    requireWebcam: false,
    lockdownBrowser: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultsImmediately: true,
    allowReview: true,
    enableFullscreenMode: false,
  };
  const created: StoredExam = {
    id: partial.id ?? `exam_${Math.random().toString(36).slice(2, 8)}`,
    title: partial.title ?? "Untitled Exam",
    description: partial.description ?? "",
    duration: partial.duration ?? 30,
    status: partial.status ?? "draft",
    createdBy: partial.createdBy ?? "unknown_user",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    questions: partial.questions ?? [],
    scheduledFor: partial.scheduledFor,
    securitySettings: partial.securitySettings ?? defaultSecuritySettings,
  };
  exams.unshift(created);
  saveExams(exams);
  broadcast();
  return created;
}

export function updateExam(id: string, changes: Partial<StoredExam>): StoredExam | undefined {
  const exams = getExams();
  const idx = exams.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  const updated: StoredExam = { ...exams[idx], ...changes, id, updatedAt: nowIso() };
  exams[idx] = updated;
  saveExams(exams);
  broadcast();
  return updated;
}

export function deleteExam(id: string): boolean {
  const exams = getExams();
  const next = exams.filter((e) => e.id !== id);
  if (next.length === exams.length) return false;
  saveExams(next);
  broadcast();
  return true;
}

export function duplicateExam(id: string): StoredExam | undefined {
  const exam = getExam(id);
  if (!exam) return undefined;
  const copy: StoredExam = {
    ...exam,
    id: `exam_${Math.random().toString(36).slice(2, 8)}`,
    title: `${exam.title} (Copy)`,
    status: "draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const exams = getExams();
  saveExams([copy, ...exams]);
  broadcast();
  return copy;
}

export function archiveExam(id: string): StoredExam | undefined {
  const archived = updateExam(id, { status: "archived" });
  if (archived) broadcast();
  return archived;
}
