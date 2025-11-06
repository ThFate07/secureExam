import { PrismaClient, AttemptStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function generate() {
  console.log('🔧 Generating mock submissions...');

  // Pick some published exams
  const exams = await prisma.exam.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      examQuestions: { include: { question: true }, orderBy: { order: 'asc' } },
      enrollments: { include: { student: true } },
    },
    take: 3,
  });

  if (exams.length === 0) {
    console.log('No published exams found. Aborting.');
    return;
  }

  let submissionsCreated = 0;

  for (const exam of exams) {
    // Take up to 10 students per exam
    const students = exam.enrollments.map(e => e.student).slice(0, 10);
    for (const student of students) {
      // Skip if student already has a submission for an attempt in this exam
      const existing = await prisma.submission.findFirst({
        where: { attempt: { examId: exam.id, studentId: student.id } },
      });
      if (existing) continue;

      // Create attempt
      const start = new Date(Date.now() - (15 + Math.floor(Math.random() * 20)) * 60 * 1000);
      const end = new Date();
      const attempt = await prisma.attempt.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          status: AttemptStatus.SUBMITTED,
          startTime: start,
          endTime: end,
          timeSpent: Math.floor((end.getTime() - start.getTime()) / 1000),
          ipAddress: '127.0.0.1',
          userAgent: 'mock-generator',
        },
      });

      let totalPoints = 0;
      let totalScore = 0;

      for (const eq of exam.examQuestions) {
        const q = eq.question;
        totalPoints += q.points;

        let answer: unknown = null;
        let isCorrect: boolean | null = null;
        let pointsAwarded: number | null = null;

        if (q.type === 'MCQ') {
          const options = Array.isArray(q.options) ? q.options : [];
          const pick = Math.floor(Math.random() * Math.max(1, options.length));
          answer = pick;
          const correctIndex = typeof q.correctAnswer === 'string' ? parseInt(q.correctAnswer) : (q.correctAnswer as number | null);
          isCorrect = correctIndex !== null && pick === correctIndex;
          pointsAwarded = isCorrect ? q.points : 0;
          totalScore += pointsAwarded;
        } else if (q.type === 'TRUE_FALSE') {
          const pickBool = Math.random() > 0.5;
          answer = pickBool ? 'true' : 'false';
          const correct = String(q.correctAnswer) === String(answer);
          isCorrect = correct;
          pointsAwarded = correct ? q.points : 0;
          totalScore += pointsAwarded;
        } else {
          // SHORT_ANSWER or ESSAY -> needs manual grading
          answer = `Mock answer for ${q.title || 'question'} by ${student.name}`;
          isCorrect = null;
          pointsAwarded = null;
        }

        await prisma.answer.create({
          data: {
            attemptId: attempt.id,
            questionId: q.id,
            answer: answer as never,
            isCorrect,
            pointsAwarded,
            timeSpent: 30 + Math.floor(Math.random() * 90),
            flaggedForReview: false,
          },
        });
      }

      // Create submission (status depends on whether all questions auto-graded)
      const hasManual = exam.examQuestions.some(eq => eq.question.type === 'SHORT_ANSWER' || eq.question.type === 'ESSAY');
      await prisma.submission.create({
        data: {
          attemptId: attempt.id,
          studentId: student.id,
          score: totalScore,
          totalPoints,
          status: hasManual ? 'PENDING' : 'GRADED',
          feedback: hasManual ? 'Pending manual grading for long answers.' : 'Auto-graded.',
        },
      });

      submissionsCreated++;
    }
  }

  console.log(`✅ Created ${submissionsCreated} mock submissions.`);
}

generate()
  .catch((e) => {
    console.error('❌ Error generating mock submissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

