"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  duplicateExam,
  archiveExam,
  type StoredExam
} from '../lib/examStore';

export function useExamStore(examId?: string) {
  const [exams, setExams] = useState<StoredExam[]>([]);
  const [currentExam, setCurrentExam] = useState<StoredExam | undefined>();
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const all = getExams();
    setExams(all);
    if (examId) setCurrentExam(getExam(examId));
  }, [examId]);

  useEffect(() => {
    refresh();
    setLoading(false);
    const handler = () => refresh();
    window.addEventListener('examStoreChanged', handler as EventListener);
    return () => window.removeEventListener('examStoreChanged', handler as EventListener);
  }, [refresh]);

  const create = useCallback((data: Partial<StoredExam>) => createExam(data), []);
  const update = useCallback((id: string, data: Partial<StoredExam>) => updateExam(id, data), []);
  const remove = useCallback((id: string) => deleteExam(id), []);
  const duplicate = useCallback((id: string) => duplicateExam(id), []);
  const archive = useCallback((id: string) => archiveExam(id), []);

  return {
    exams,
    currentExam,
    loading,
    refresh,
    createExam: create,
    updateExam: update,
    deleteExam: remove,
    duplicateExam: duplicate,
    archiveExam: archive,
  };
}

export type { StoredExam };