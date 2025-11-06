"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../../components/ui/card';
import { Badge } from '../../../../../../components/ui/badge';
import { ArrowLeft, Clock, Percent } from 'lucide-react';
import { apiClient } from '../../../../../../lib/api/client';

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const submissionId = params.submissionId as string;

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get(`/api/exams/${examId}/submissions/${submissionId}`);
        setSubmission(data.submission);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };

    if (examId && submissionId) load();
  }, [examId, submissionId]);

  if (loading) return <div className="p-8 max-w-4xl mx-auto"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div>;
  if (error) return <div className="p-8 max-w-4xl mx-auto"><p className="text-red-600">{error}</p></div>;
  if (!submission) return <div className="p-8 max-w-4xl mx-auto"><p className="text-gray-600">Submission not found.</p></div>;

  const attempt = submission.attempt;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <h1 className="text-2xl font-bold">Submission - {submission.student?.name || submission.studentId}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">Submitted: {new Date(submission.submittedAt).toLocaleString()}</Badge>
          {typeof submission.plagiarismPercent === 'number' && (
            <Badge className={submission.plagiarismPercent >= 50 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
              <Percent className="h-3 w-3 mr-1" /> Plagiarism: {submission.plagiarismPercent}%
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attempt summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Student ID</p>
              <p className="font-semibold">{submission.student?.id}</p>
            </div>
            <div>
              <p className="text-gray-500">Time Spent</p>
              <p className="font-semibold"><Clock className="h-4 w-4 inline mr-1"/>{attempt?.timeSpent ? Math.round((attempt.timeSpent || 0) / 60) : '—'} min</p>
            </div>
            <div>
              <p className="text-gray-500">Score</p>
              <p className="font-semibold">{submission.score ?? '—'} / {submission.totalPoints ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Answers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {attempt?.answers?.length === 0 && <p className="text-sm text-gray-600">No answers recorded.</p>}
          {attempt?.answers?.map((a: any) => (
            <div key={a.id} className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Question ({a.question?.type})</p>
              <p className="font-medium">{a.question?.title || a.question?.question}</p>
              <div className="mt-2">
                <p className="text-sm text-gray-500">Student Answer</p>
                <pre className="bg-gray-50 p-2 rounded text-sm">{typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer)}</pre>
              </div>
              <div className="mt-2 flex items-center gap-4">
                {(a.isCorrect === true || a.isCorrect === false) && (
                  <Badge className={a.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{a.isCorrect ? 'Correct' : 'Incorrect'}</Badge>
                )}
                {a.pointsAwarded != null && <Badge variant="outline">Points: {a.pointsAwarded}</Badge>}
                {a.flaggedForReview && <Badge className="bg-yellow-100 text-yellow-800">Flagged</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Plagiarism details: show percent and top matches if available */}
      {typeof submission.plagiarismPercent === 'number' && (
        <Card>
          <CardHeader>
            <CardTitle>Plagiarism</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Overall plagiarism: <span className="font-semibold">{submission.plagiarismPercent}%</span></p>
            {submission.plagiarismDetails?.matches && submission.plagiarismDetails.matches.length > 0 && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-gray-500">Top matches:</p>
                <ul className="list-disc list-inside">
                  {submission.plagiarismDetails.matches.map((m: any) => (
                    <li key={m.attemptId}>{m.attemptId} — {m.percent}%</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
