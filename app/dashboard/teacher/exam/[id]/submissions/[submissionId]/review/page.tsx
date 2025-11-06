"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '../../../../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../../../components/ui/card';
import { Input } from '../../../../../../../components/ui/input';
import { Textarea } from '../../../../../../../components/ui/textarea';
import { Label } from '../../../../../../../components/ui/label';
import { Badge } from '../../../../../../../components/ui/badge';
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, User, FileText } from 'lucide-react';

interface AnswerData {
  id: string;
  questionId: string;
  answer: string | number;
  pointsAwarded: number | null;
  isCorrect: boolean | null;
  question: {
    id: string;
    title: string;
    question: string;
    type: string;
    points: number;
    options?: string[];
    correctAnswer?: string | number;
  };
}

interface SubmissionData {
  id: string;
  score: number | null;
  totalPoints: number | null;
  status: string;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  student: {
    id: string;
    name: string;
    email: string;
  };
  attempt: {
    id: string;
    startTime: string;
    endTime: string | null;
    timeSpent: number | null;
    exam: {
      id: string;
      title: string;
      examQuestions: Array<{
        order: number;
        question: {
          id: string;
          title: string;
          question: string;
          type: string;
          points: number;
          options?: string[];
          correctAnswer?: string | number;
        };
      }>;
    };
    answers: AnswerData[];
  };
}

export default function SubmissionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch submission details
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/submissions/${submissionId}`);
        const data = await response.json();

        if (data.success) {
          setSubmission(data.data.submission);
          setFeedback(data.data.submission.feedback || '');
          
          // Initialize grades map
          const gradesMap = new Map<string, number>();
          data.data.submission.attempt.answers.forEach((answer: AnswerData) => {
            if (answer.pointsAwarded !== null) {
              gradesMap.set(answer.questionId, answer.pointsAwarded);
            } else if (answer.question.type === 'SHORT_ANSWER' || answer.question.type === 'ESSAY') {
              // Set default 0 for ungraded essay/short answer questions
              gradesMap.set(answer.questionId, 0);
            }
          });
          setGrades(gradesMap);
        } else {
          setError(data.error || 'Failed to load submission');
        }
      } catch (err) {
        console.error('Failed to fetch submission:', err);
        setError('Failed to load submission');
      } finally {
        setLoading(false);
      }
    };

    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  const handleGradeChange = (questionId: string, points: number, maxPoints: number) => {
    const newGrades = new Map(grades);
    const clampedPoints = Math.max(0, Math.min(points, maxPoints));
    newGrades.set(questionId, clampedPoints);
    setGrades(newGrades);
  };

  const handleSaveGrades = async () => {
    if (!submission) return;

    setSaving(true);
    setError(null);

    try {
      const gradesArray = Array.from(grades.entries()).map(([questionId, pointsAwarded]) => ({
        questionId,
        pointsAwarded,
      }));

      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grades: gradesArray,
          feedback: feedback.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Grades saved successfully!');
        // Refresh submission data
        const refreshResponse = await fetch(`/api/submissions/${submissionId}`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setSubmission(refreshData.data.submission);
        }
      } else {
        setError(data.error || 'Failed to save grades');
      }
    } catch (err) {
      console.error('Failed to save grades:', err);
      setError('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!submission || error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <p className="text-red-600">{error || 'Submission not found'}</p>
      </div>
    );
  }

  // Sort answers by exam question order
  const sortedAnswers = [...submission.attempt.answers].sort((a, b) => {
    const aOrder = submission.attempt.exam.examQuestions.findIndex(
      eq => eq.question.id === a.questionId
    );
    const bOrder = submission.attempt.exam.examQuestions.findIndex(
      eq => eq.question.id === b.questionId
    );
    return aOrder - bOrder;
  });

  const totalPoints = submission.attempt.exam.examQuestions.reduce(
    (sum, eq) => sum + eq.question.points,
    0
  );
  const currentScore = Array.from(grades.values()).reduce((sum, pts) => sum + pts, 0);
  const percentage = totalPoints > 0 ? ((currentScore / totalPoints) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Submission</h1>
            <p className="text-sm text-gray-600">{submission.attempt.exam.title}</p>
          </div>
        </div>
        <Button onClick={handleSaveGrades} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Grades'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <p className="font-medium">{submission.student.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="font-medium">{submission.student.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500">Time Spent:</span>
              <p className="font-medium">
                {submission.attempt.timeSpent
                  ? `${Math.floor(submission.attempt.timeSpent / 60)} min ${submission.attempt.timeSpent % 60} sec`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Score Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Current Score</p>
              <p className="text-2xl font-bold">{currentScore.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Points</p>
              <p className="text-2xl font-bold">{totalPoints}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Percentage</p>
              <p className="text-2xl font-bold">{percentage}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge className={submission.status === 'GRADED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {submission.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answers Review */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Answers Review
        </h2>

        {sortedAnswers.map((answer, index) => {
          const question = answer.question;
          const maxPoints = question.points;
          const currentGrade = grades.get(question.id) ?? (answer.pointsAwarded ?? 0);
          const isAutoGraded = question.type === 'MCQ' || question.type === 'TRUE_FALSE';
          const needsManualGrading = question.type === 'SHORT_ANSWER' || question.type === 'ESSAY';

          return (
            <Card key={answer.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Question {index + 1}: {question.title || `Q${index + 1}`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isAutoGraded && answer.isCorrect !== null && (
                      <Badge variant={answer.isCorrect ? 'default' : 'destructive'}>
                        {answer.isCorrect ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />Correct</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" />Incorrect</>
                        )}
                      </Badge>
                    )}
                    {needsManualGrading && (
                      <Badge className="bg-yellow-100 text-yellow-800">Manual Grading Required</Badge>
                    )}
                    <Badge variant="outline">{maxPoints} points</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Question:</p>
                  <p className="text-base">{question.question}</p>
                </div>

                {question.type === 'MCQ' && question.options && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Options:</p>
                    <ul className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <li
                          key={optIndex}
                          className={`p-2 rounded ${
                            typeof answer.answer === 'number' && answer.answer === optIndex
                              ? 'bg-blue-100 border border-blue-300'
                              : ''
                          }`}
                        >
                          {optIndex === question.correctAnswer ? (
                            <span className="text-green-600 font-medium">✓ </span>
                          ) : null}
                          {option}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-500 mt-2">
                      Student selected: Option {typeof answer.answer === 'number' ? answer.answer + 1 : 'N/A'}
                    </p>
                  </div>
                )}

                {(question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Student's Answer:</p>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[100px]">
                      <p className="whitespace-pre-wrap">
                        {typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-4 border-t">
                  <Label htmlFor={`grade-${answer.id}`} className="text-sm font-medium">
                    Points Awarded:
                  </Label>
                  <Input
                    id={`grade-${answer.id}`}
                    type="number"
                    min={0}
                    max={maxPoints}
                    value={currentGrade}
                    onChange={(e) => handleGradeChange(question.id, parseFloat(e.target.value) || 0, maxPoints)}
                    className="w-24"
                    disabled={saving}
                  />
                  <span className="text-sm text-gray-500">/ {maxPoints}</span>
                  {isAutoGraded && answer.pointsAwarded !== null && (
                    <span className="text-xs text-gray-400">
                      (Auto-graded: {answer.pointsAwarded} pts)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add feedback for the student (optional)..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}


