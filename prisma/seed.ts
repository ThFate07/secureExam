import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Truncate all tables in reverse order of dependencies
  console.log('🗑️  Truncating existing data...');
  
  try {
    // Delete in order of dependencies (child tables first)
    await prisma.auditLog.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.snapshot.deleteMany({});
    await prisma.monitoringEvent.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.answer.deleteMany({});
    await prisma.attempt.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.examQuestion.deleteMany({});
    await prisma.exam.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.user.deleteMany({});
    
    console.log('✅ Database truncated successfully');
  } catch (error) {
    console.error('⚠️  Error truncating database:', error);
    throw error;
  }

  // Create users (teachers and students)
  console.log('Creating users...');
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  // Teachers
  const teacherInfos = [
    { email: 'teacher@example.com', name: 'Prof. Sarah Johnson' },
    { email: 'teacher.alex@example.com', name: 'Dr. Alex Turner' },
    { email: 'teacher.priya@example.com', name: 'Prof. Priya Nair' },
    { email: 'teacher.lee@example.com', name: 'Dr. Hannah Lee' },
    { email: 'teacher.moh@example.com', name: 'Prof. Mohammed Ali' },
  ];
  const teachers = [] as Array<{ id: string; email: string; name: string }>;
  for (const t of teacherInfos) {
    const created = await prisma.user.create({
      data: { email: t.email, name: t.name, passwordHash: teacherPassword, role: 'TEACHER' },
      select: { id: true, email: true, name: true },
    });
    teachers.push(created);
  }

  // Students up to ~70
  const branches = ['CMPN', 'IT', 'EXTC', 'MECH'];
  const divisions = ['A', 'B', 'C'];
  const years = [1, 2, 3, 4];

  const students = [] as Array<{ id: string; email: string; branch?: string | null; division?: string | null; year?: number | null }>;
  for (let i = 1; i <= 70; i++) {
    const branch = branches[i % branches.length];
    const division = divisions[i % divisions.length];
    const year = years[i % years.length];
    const created = await prisma.user.create({
      data: {
        email: `student${i}@example.com`,
        name: `Student ${i}`,
        passwordHash: studentPassword,
        role: 'STUDENT',
        branch,
        division,
        year,
        rollNumber: `${branch}-${division}-${String(i).padStart(3, '0')}`,
      },
      select: { id: true, email: true, branch: true, division: true, year: true },
    });
    students.push(created);
  }

  console.log(`✅ Users created: ${teachers.length} teachers, ${students.length} students`);

  // Build a larger question bank
  console.log('Creating question bank...');
  const subjects = ['Programming', 'Mathematics', 'Science', 'History'];
  const difficulties = ['easy', 'medium', 'hard'];

  const baseMcq = [
    { title: 'JavaScript Variables', q: 'Which keyword declares a constant?', options: ['var', 'let', 'const', 'static'], answer: '2', tags: ['javascript', 'basics'], subject: 'Programming', difficulty: 'easy' },
    { title: 'Array Methods', q: 'Which method adds at the end of an array?', options: ['push()', 'pop()', 'shift()', 'unshift()'], answer: '0', tags: ['javascript', 'arrays'], subject: 'Programming', difficulty: 'easy' },
    { title: 'Derivatives', q: 'What is the derivative of x^2?', options: ['x', '2x', 'x^2', '2'], answer: '1', tags: ['calculus', 'derivatives'], subject: 'Mathematics', difficulty: 'medium' },
    { title: 'Chemistry Basics', q: 'What is the chemical formula for water?', options: ['H2O', 'O2', 'CO2', 'NaCl'], answer: '0', tags: ['chemistry', 'basics'], subject: 'Science', difficulty: 'easy' },
    { title: 'US History', q: 'Who was the first President of the USA?', options: ['Abraham Lincoln', 'John Adams', 'George Washington', 'Thomas Jefferson'], answer: '2', tags: ['history', 'usa'], subject: 'History', difficulty: 'easy' },
  ];

  const createdQuestions: string[] = [];
  // Create ~45 MCQs
  for (let i = 0; i < 45; i++) {
    const t = baseMcq[i % baseMcq.length];
    const q = await prisma.question.create({
      data: {
        title: `${t.title} #${Math.floor(i / baseMcq.length) + 1}`,
        type: 'MCQ',
        question: t.q,
        options: t.options,
        correctAnswer: t.answer,
        points: 1,
        tags: t.tags,
        subject: t.subject,
        difficulty: t.difficulty,
      },
      select: { id: true },
    });
    createdQuestions.push(q.id);
  }

  // Create ~15 short-answer/essay
  for (let i = 0; i < 15; i++) {
    const subj = subjects[i % subjects.length];
    const diff = difficulties[i % difficulties.length];
    const q = await prisma.question.create({
      data: {
        title: `${subj} Essay Q${i + 1}`,
        type: i % 2 === 0 ? 'SHORT_ANSWER' : 'ESSAY',
        question: `Explain the concept related to ${subj.toLowerCase()} (Q${i + 1}). Provide a concise yet complete answer.`,
        points: 5,
        tags: [subj.toLowerCase(), 'essay'],
        subject: subj,
        difficulty: diff,
      },
      select: { id: true },
    });
    createdQuestions.push(q.id);
  }

  console.log(`✅ Questions created: ${createdQuestions.length}`);

  // Create multiple exams (2 per teacher)
  console.log('Creating multiple exams...');
  const exams = [] as Array<{ id: string; title: string; createdById: string }>
  for (const t of teachers) {
    for (let e = 1; e <= 2; e++) {
      const title = `${t.name.split(' ')[1] || t.name} Exam ${e}`;
      const settings = {
        shuffleQuestions: e % 2 === 0,
        shuffleOptions: e % 2 === 1,
        showResultsImmediately: e % 2 === 0,
        allowReview: e % 2 === 1,
        preventTabSwitching: true,
        requireWebcam: e % 2 === 0,
        enableScreenMonitoring: true,
        lockdownBrowser: false,
        enableFullscreenMode: e % 2 === 1,
      };
      const exam = await prisma.exam.create({
        data: {
          title,
          description: `Auto-generated exam ${e} by ${t.name}.`,
          duration: 45 + (e * 15),
          maxAttempts: 2,
          status: 'PUBLISHED',
          passingScore: 60,
          createdById: t.id,
          settings,
          startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        select: { id: true, title: true, createdById: true },
      });
      exams.push(exam);

      // Attach 10-12 questions to each exam
      const count = 10 + ((e + exams.length) % 3); // 10-12
      const picked = [...createdQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
      await prisma.examQuestion.createMany({
        data: picked.map((qid, idx) => ({ examId: exam.id, questionId: qid, order: idx })),
      });
    }
  }

  console.log(`✅ Exams created: ${exams.length}`);

  // Enroll students across exams (randomized)
  console.log('Enrolling students across exams...');
  for (const exam of exams) {
    const pool = [...students].sort(() => Math.random() - 0.5).slice(0, 20 + (Math.random() * 15 | 0)); // 20-35 students
    if (pool.length === 0) continue;
    await prisma.enrollment.createMany({
      data: pool.map((s) => ({ examId: exam.id, studentId: s.id })),
    });
  }

  console.log('✅ Enrollments created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('═══════════════════════════════════════');
  console.log('Teachers:');
  for (const t of teachers) console.log(`  ${t.email} / teacher123`);
  console.log('Sample Students:');
  for (const s of students.slice(0, 5)) console.log(`  ${s.email} / student123`);
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
