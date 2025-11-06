"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { ArrowLeft, Save, BookOpen, Timer, Info } from 'lucide-react';
import { ExamSecuritySettings } from '../../../lib/examStore';
import SecuritySettings from '../../../components/exam/SecuritySettings';
import { api } from '../../../lib/api/client';

interface FormState {
  title: string;
  description: string;
  duration: number; // minutes
  scheduleEnabled: boolean;
  scheduledFor: string; // local datetime string (YYYY-MM-DDTHH:MM)
  securitySettings: ExamSecuritySettings;
}

interface QuestionData {
  id: string;
  question: string;
  options?: string[] | unknown;
  correctAnswer?: number | string;
  points: number;
  type?: string;
  title?: string;
}

const CreateExamPage: React.FC = () => {
  const router = useRouter();
  
  const defaultSecuritySettings: ExamSecuritySettings = {
    preventTabSwitching: false,
    requireWebcam: false,
    lockdownBrowser: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultsImmediately: true,
    allowReview: true,
    maxTabSwitchWarnings: 3,
    enableFullscreenMode: false,
  };

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    duration: 30,
    scheduleEnabled: false,
    scheduledFor: '',
    securitySettings: defaultSecuritySettings,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [questionsFromDB, setQuestionsFromDB] = useState<QuestionData[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const data = await api.questions.list();
        setQuestionsFromDB(data.questions || []);
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        // Fallback to sample questions if API fails
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  // Demo sample questions (fallback)
  const sampleQuestions = useMemo(() => ([
    { id: 'q_math_1', question: 'What is 12 + 15?', options: ['25', '27', '28', '30'], correctAnswer: 1, points: 1, type: 'MCQ' },
    { id: 'q_math_2', question: 'Derivative of x^2 is?', options: ['x', '2x', 'x^2', '2'], correctAnswer: 1, points: 1, type: 'MCQ' },
    { id: 'q_sci_1', question: 'Water chemical formula?', options: ['H2O', 'O2', 'CO2', 'NaCl'], correctAnswer: 0, points: 1, type: 'MCQ' },
    { id: 'q_hist_1', question: 'Who was the first President of the USA?', options: ['Abraham Lincoln', 'John Adams', 'George Washington', 'Thomas Jefferson'], correctAnswer: 2, points: 1, type: 'MCQ' },
    { id: 'q_cs_1', question: 'Which data structure uses FIFO?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correctAnswer: 1, points: 1, type: 'MCQ' },
  ]), []);

  // Use database questions if available, otherwise use sample questions
  const availableQuestions = questionsFromDB.length > 0 ? questionsFromDB : sampleQuestions;

  const filteredQuestions = availableQuestions.filter(q =>
    q.question.toLowerCase().includes(search.toLowerCase())
  );

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const onChange = (field: keyof FormState, value: string | boolean | ExamSecuritySettings) => {
    setForm(prev => {
      if (field === 'scheduleEnabled') {
        const enabled = Boolean(value);
        return { ...prev, scheduleEnabled: enabled, scheduledFor: enabled ? prev.scheduledFor : '' };
      }
      return { ...prev, [field]: field === 'duration' ? Number(value) : value };
    });
  };

  const onSecuritySettingsChange = (securitySettings: ExamSecuritySettings) => {
    onChange('securitySettings', securitySettings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (form.duration <= 0) {
      setError('Duration must be greater than 0');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      setError('Please select at least one question');
      return;
    }
    
    // Validate schedule
    let scheduledForIso: string | undefined;
    if (form.scheduleEnabled) {
      if (!form.scheduledFor) {
        setError('Please pick a schedule date/time');
        return;
      }
      const local = new Date(form.scheduledFor);
      if (isNaN(local.getTime())) {
        setError('Invalid schedule date/time');
        return;
      }
      const now = Date.now();
      if (local.getTime() <= now + 60_000) { // require at least 1 min in future
        setError('Scheduled time must be at least 1 minute in the future');
        return;
      }
      scheduledForIso = local.toISOString();
    }

    setSaving(true);
    
    try {
      // Prepare exam data for API
      const examData: Record<string, unknown> = {
        title: form.title.trim(),
        duration: form.duration,
        maxAttempts: 1,
        questionIds: selectedQuestionIds,
        settings: {
          shuffleQuestions: form.securitySettings.shuffleQuestions,
          shuffleOptions: form.securitySettings.shuffleOptions,
          showResultsImmediately: form.securitySettings.showResultsImmediately,
          allowReview: form.securitySettings.allowReview,
          preventTabSwitching: form.securitySettings.preventTabSwitching,
          requireWebcam: form.securitySettings.requireWebcam,
          lockdownBrowser: form.securitySettings.lockdownBrowser,
          maxTabSwitchWarnings: form.securitySettings.maxTabSwitchWarnings,
          enableFullscreenMode: form.securitySettings.enableFullscreenMode,
        },
      };

      // Add description only if it's not empty
      if (form.description.trim()) {
        examData.description = form.description.trim();
      }

      // Only add optional fields if they have values
      if (scheduledForIso) {
        examData.startTime = scheduledForIso;
      }

      // Create exam in database via API
      const createdExam = await api.exams.create(examData);
      
      // Navigate to exam details page
      router.push(`/dashboard/teacher/exam/${createdExam.id}`);
    } catch (err) {
      console.error('Failed to create exam:', err);
      setError(err instanceof Error ? err.message : 'Failed to create exam. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">Create New Exam</h1>
          <p className="text-gray-600 mt-2">Set up your assessment with questions and security settings</p>
  </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" form="createExamForm" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Creating...' : 'Create Exam'}
          </Button>
        </div>
      </div>

      <form id="createExamForm" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Exam Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Exam Title</Label>
                  <Input id="title" value={form.title} onChange={e => onChange('title', e.target.value)} placeholder="e.g. Midterm Assessment" />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Enter a detailed description of the exam (optional)..." 
                    value={form.description} 
                    onChange={e => onChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="duration" className="flex items-center gap-2">Duration (minutes)</Label>
                  <div className="flex items-center gap-2">
                    <Input id="duration" type="number" min={1} value={form.duration} onChange={e => onChange('duration', e.target.value)} className="w-32" />
                    <Timer className="h-4 w-4 text-gray-500" />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.scheduleEnabled}
                      onChange={e => onChange('scheduleEnabled', e.target.checked)}
                    />
                    <span>Schedule exam to go live later</span>
                  </Label>
                  {form.scheduleEnabled && (
                    <div className="space-y-1">
                      <Label htmlFor="scheduledFor">Go Live Date & Time</Label>
                      <Input
                        id="scheduledFor"
                        type="datetime-local"
                        value={form.scheduledFor}
                        onChange={e => onChange('scheduledFor', e.target.value)}
                        min={new Date(Date.now() + 60_000).toISOString().slice(0,16)}
                      />
                      <p className="text-xs text-gray-500">Exam will automatically switch from draft to active at this time (UTC converted).</p>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-600 flex items-center gap-1"><Info className="h-4 w-4" /> {error}</p>
                )}
              </CardContent>
            </Card>

            <SecuritySettings
              settings={form.securitySettings}
              onChange={onSecuritySettingsChange}
            />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Question Bank (Demo)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input id="search" placeholder="Find question..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="max-h-72 overflow-auto space-y-2 pr-1">
                  {loadingQuestions ? (
                    <p className="text-sm text-gray-500">Loading questions...</p>
                  ) : filteredQuestions.map(q => {
                    const selected = selectedQuestionIds.includes(q.id);
                    const displayOptions = Array.isArray(q.options) ? q.options : [];
                    return (
                      <button
                        type="button"
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`w-full text-left border rounded-md p-3 hover:bg-gray-50 transition flex flex-col gap-1 ${selected ? 'border-blue-600 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{q.question}</span>
                          {selected && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">Selected</span>}
                        </div>
                        {displayOptions.length > 0 && (
                          <ul className="list-disc ml-5 text-xs text-gray-600 space-y-0.5">
                            {displayOptions.slice(0,4).map((o: string, i: number) => <li key={i}>{o}</li>)}
                          </ul>
                        )}
                        <div className="text-xs text-gray-500">Points: {q.points}</div>
                      </button>
                    );
                  })}
                  {filteredQuestions.length === 0 && (
                    <p className="text-sm text-gray-500">No questions match your search.</p>
                  )}
                </div>
                <div className="text-xs text-gray-600">Selected: {selectedQuestionIds.length} question{selectedQuestionIds.length!==1?'s':''}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateExamPage;