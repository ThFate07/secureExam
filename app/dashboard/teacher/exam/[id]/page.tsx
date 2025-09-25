"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useExamStore } from '../../../../hooks/useExamStore';

export default function ExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  const { currentExam, updateExam, archiveExam, deleteExam, duplicateExam, getResults } = useExamStore(examId);
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localDuration, setLocalDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentExam) {
      setLocalTitle(currentExam.title);
      setLocalDescription(currentExam.description);
      setLocalDuration(currentExam.duration);
    }
  }, [currentExam]);

  const handleSave = useCallback(() => {
    if (!currentExam) return;
    setSaving(true);
    updateExam(currentExam.id, {
      title: localTitle.trim() || 'Untitled Exam',
      description: localDescription.trim(),
      duration: localDuration > 0 ? localDuration : 30,
    });
    setSaving(false);
    alert('Exam saved.');
  }, [currentExam, localTitle, localDescription, localDuration, updateExam]);

  const results = currentExam ? getResults(currentExam.id) : [];
  const totalAttempts = results.length;
  const averageScore = totalAttempts ? (results.reduce((s, r) => s + r.percentage, 0) / totalAttempts).toFixed(1) : '—';

  if (!currentExam) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-4 flex items-center">
          <Button variant="outline" onClick={() => router.push('/dashboard/teacher')} className="mr-4"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <h1 className="text-2xl font-semibold">Exam Not Found</h1>
        </div>
        <p className="text-gray-600">The exam may have been deleted.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <h1 className="text-3xl font-bold">Edit Exam</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/exam/${examId}/submissions`)}>View Submissions</Button>
          <Button variant="outline" onClick={() => duplicateExam(currentExam.id)}>Duplicate</Button>
          <Button variant="outline" onClick={() => archiveExam(currentExam.id)}>Archive</Button>
          <Button variant="destructive" onClick={() => { if (confirm('Delete this exam?')) { deleteExam(currentExam.id); router.push('/dashboard/teacher'); } }}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
          <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={localTitle} onChange={e => setLocalTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={localDescription} onChange={e => setLocalDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input id="duration" type="number" min={1} value={localDuration} onChange={e => setLocalDuration(Number(e.target.value))} className="w-32" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({currentExam.questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentExam.questions.length === 0 && (
            <p className="text-sm text-gray-600">No questions yet. (Question management not implemented in this demo)</p>
          )}
          {currentExam.questions.map((q, idx) => (
            <div key={q.id} className="border rounded p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{idx + 1}. {q.question}</p>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{q.points} pts</span>
              </div>
              {q.options && (
                <ul className="text-sm list-disc ml-6 space-y-1">
                  {q.options.map((opt, i) => (
                    <li key={i} className={q.correctAnswer === i ? 'text-green-600 font-medium' : ''}>{opt}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Add Question (stub)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Attempts</p>
            <p className="text-lg font-semibold">{totalAttempts}</p>
          </div>
            <div>
            <p className="text-gray-500">Average %</p>
            <p className="text-lg font-semibold">{averageScore}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="text-lg font-semibold">{new Date(currentExam.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Updated</p>
            <p className="text-lg font-semibold">{new Date(currentExam.updatedAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}