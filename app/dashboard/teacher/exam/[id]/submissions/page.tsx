"use client";

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Input } from '../../../../../components/ui/input';
import { Badge } from '../../../../../components/ui/badge';
import { ArrowLeft, FileDown, Filter, Search, BarChart3, Users, Clock, Percent, FileText } from 'lucide-react';
import { api } from '../../../../../lib/api/client';

interface ExamSubmission {
  id: string;
  studentId: string;
  score: number | null;
  totalPoints?: number | null;
  totalQuestions?: number;
  percentage?: number;
  plagiarismPercent?: number | null;
  status?: string;
  submittedAt?: string;
  completedAt?: string;
  timeSpent?: number;
  attempt?: {
    timeSpent: number | null;
  };
  student?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Exam {
  id: string;
  title: string;
  description?: string;
}

export default function ExamSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const [exam, setExam] = useState<Exam | null>(null);
  const [search, setSearch] = useState('');
  const [minPercent, setMinPercent] = useState('');
  const [maxPercent, setMaxPercent] = useState('');
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch exam and submissions from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch exam data
        const examData = await api.exams.get(examId);
        setExam(examData);
        
        // Fetch submissions
        const submissionsData = await api.exams.submissions(examId);
        setSubmissions(submissionsData.submissions || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchData();
    }
  }, [examId]);

  const results = useMemo(() => {
    return submissions.map(s => {
      // Handle both data structures - normalize to common format
      const totalPoints = s.totalPoints ?? s.totalQuestions ?? 0;
      const score = s.score ?? 0;
      const percentage = s.percentage ?? (totalPoints > 0 ? (score / totalPoints) * 100 : 0);
      const completedAt = s.completedAt ?? s.submittedAt ?? '';
      const timeSpent = s.timeSpent ?? (s.attempt?.timeSpent ? Math.floor(s.attempt.timeSpent / 60) : 0);
      
      return {
        ...s,
        percentage,
        totalQuestions: totalPoints,
        completedAt,
        timeSpent,
      };
    });
  }, [submissions]);

  const filtered = results.filter(r => {
    const studentName = r.student?.name?.toLowerCase() || '';
    const studentEmail = r.student?.email?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      studentName.includes(searchLower) || 
      studentEmail.includes(searchLower) ||
      r.studentId.toLowerCase().includes(searchLower);
    const matchesMin = !minPercent || r.percentage >= Number(minPercent);
    const matchesMax = !maxPercent || r.percentage <= Number(maxPercent);
    return matchesSearch && matchesMin && matchesMax;
  });

  const avg = filtered.length ? (filtered.reduce((s, r) => s + r.percentage, 0) / filtered.length).toFixed(1) : '—';
  const high = filtered.length ? Math.max(...filtered.map(r => r.percentage)) : '—';
  const low = filtered.length ? Math.min(...filtered.map(r => r.percentage)) : '—';
  const median = filtered.length ? (() => { const sorted=[...filtered].map(r=>r.percentage).sort((a,b)=>a-b); const mid=Math.floor(sorted.length/2); return sorted.length%2? sorted[mid] : ((sorted[mid-1]+sorted[mid])/2).toFixed(1); })() : '—';

  const exportCSV = () => {
    const header = ['Result ID','Student ID','Score','Total Questions','Percentage','Completed At','Time Spent (min)'];
    const rows = filtered.map(r => [r.id, r.studentId, r.score, r.totalQuestions, r.percentage, r.completedAt, r.timeSpent]);
    const csv = [header, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `exam_${examId}_results.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!exam && !loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => router.push('/dashboard/teacher')} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <p className="text-gray-600">Exam not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <h1 className="text-2xl font-bold">Submissions - {exam?.title || 'Loading...'}</h1>
        </div>
        <Button onClick={exportCSV}><FileDown className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
            <div>
              <p className="text-gray-500">Attempts</p>
              <p className="text-xl font-semibold">{results.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Average %</p>
              <p className="text-xl font-semibold">{avg}</p>
            </div>
            <div>
              <p className="text-gray-500">Median %</p>
              <p className="text-xl font-semibold">{median}</p>
            </div>
            <div>
              <p className="text-gray-500">High %</p>
              <p className="text-xl font-semibold">{high}</p>
            </div>
            <div>
              <p className="text-gray-500">Low %</p>
              <p className="text-xl font-semibold">{low}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Search Student</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input className="pl-10" placeholder="Student ID" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Min %</label>
              <Input type="number" min={0} max={100} value={minPercent} onChange={e => setMinPercent(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Max %</label>
              <Input type="number" min={0} max={100} value={maxPercent} onChange={e => setMaxPercent(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setSearch(''); setMinPercent(''); setMaxPercent(''); }}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Attempts ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filtered.length === 0 && <p className="text-sm text-gray-600">No submissions match your filters.</p>}
          {filtered.map(r => (
            <div key={r.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1 text-sm flex-1">
                <p><span className="font-medium">Student:</span> {r.student?.name || r.studentId}</p>
                <p className="text-xs text-gray-500">{r.student?.email || r.studentId}</p>
                <p><span className="font-medium">Completed:</span> {new Date(r.completedAt).toLocaleString()}</p>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {r.timeSpent} min</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-blue-600">
                  {r.score?.toFixed(1) || 0}/{r.totalPoints || r.totalQuestions || 0}
                </Badge>
                <Badge className={r.percentage && r.percentage >= 70 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  <Percent className="h-3 w-3 mr-1" />{r.percentage?.toFixed(1) || 0}%
                </Badge>
                {r.status && (
                  <Badge className={r.status === 'GRADED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                    {r.status}
                  </Badge>
                )}
                {typeof r.plagiarismPercent === 'number' && (
                  <Badge className={r.plagiarismPercent >= 50 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                    Plagiarism: {r.plagiarismPercent}%
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/teacher/exam/${examId}/submissions/${r.id}/review`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Review
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
