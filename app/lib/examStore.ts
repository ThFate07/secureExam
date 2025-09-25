"use client";

import { demoExams, demoStudentResults } from "./demoData";

// Minimal, consistent types for storing exams/results locally
export type ExamStatus = "draft" | "active" | "completed" | "archived";

export interface StoredQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: number; // index when options exist
  points: number;
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
  questions: StoredQuestion[];
  // Optional scheduled start datetime (UTC ISO). When reached, a draft exam becomes active automatically.
  scheduledFor?: string;
}

export interface StoredExamResultAnswer {
  questionId: string;
  selectedAnswer: number | string;
  isCorrect?: boolean;
}

export interface StoredExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number; // points scored (or correct count)
  totalQuestions: number;
  percentage: number;
  completedAt: string; // ISO string
  timeSpent: number; // minutes
  answers: StoredExamResultAnswer[];
}

const EXAMS_KEY = "ops_exams_v1";
const RESULTS_KEY = "ops_exam_results_v1";

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

export function seedIfEmpty() {
  const existing = read<StoredExam[]>(EXAMS_KEY, []);
  if (existing.length === 0) {
    // Normalize demoExams to StoredExam shape
  type DemoExam = typeof demoExams[number];
  const seeded: StoredExam[] = (demoExams as DemoExam[]).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      duration: e.duration,
      status: (e.status as ExamStatus) ?? "active",
      createdBy: e.createdBy ?? "demo_teacher_456",
      createdAt: (e.createdAt instanceof Date ? e.createdAt : new Date()).toISOString(),
      updatedAt: (e.createdAt instanceof Date ? e.createdAt : new Date()).toISOString(),
      questions: (e.questions as NonNullable<DemoExam["questions"]>).map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points ?? 1,
      })),
    }));
    write(EXAMS_KEY, seeded);

    // Seed results
    type DemoResult = typeof demoStudentResults[number];
    const results: StoredExamResult[] = (demoStudentResults as DemoResult[]).map((r, idx: number) => ({
      id: `result_${idx + 1}`,
      examId: r.examId,
      studentId: r.studentId,
      score: r.score,
      totalQuestions: r.totalQuestions,
      percentage: r.percentage,
      completedAt: (r.completedAt instanceof Date ? r.completedAt : new Date()).toISOString(),
      timeSpent: r.timeSpent ?? 0,
      answers: r.answers,
    }));
    write(RESULTS_KEY, results);
  }
}

export function getExams(): StoredExam[] {
  seedIfEmpty();
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
  const created: StoredExam = {
    id: partial.id ?? `exam_${Math.random().toString(36).slice(2, 8)}`,
    title: partial.title ?? "Untitled Exam",
    description: partial.description ?? "",
    duration: partial.duration ?? 30,
    status: partial.status ?? "draft",
    createdBy: partial.createdBy ?? "demo_teacher_456",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    questions: partial.questions ?? [],
    scheduledFor: partial.scheduledFor,
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
  // Optionally also remove results for this exam
  const results = read<StoredExamResult[]>(RESULTS_KEY, []);
  write(RESULTS_KEY, results.filter((r) => r.examId !== id));
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

// Results
export function getResultsByExam(examId: string): StoredExamResult[] {
  seedIfEmpty();
  const results = read<StoredExamResult[]>(RESULTS_KEY, []);
  return results.filter((r) => r.examId === examId);
}

export function upsertResult(result: StoredExamResult) {
  const results = read<StoredExamResult[]>(RESULTS_KEY, []);
  const idx = results.findIndex((r) => r.id === result.id);
  if (idx === -1) results.push(result);
  else results[idx] = result;
  write(RESULTS_KEY, results);
  broadcast();
}

export function computeTotalPoints(exam: StoredExam): number {
  return exam.questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
}
