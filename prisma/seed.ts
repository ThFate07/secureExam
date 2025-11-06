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

  // Create users
  console.log('Creating users...');
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@example.com',
      name: 'Prof. Sarah Johnson',
      passwordHash: teacherPassword,
      role: 'TEACHER',
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'student1@example.com',
      name: 'John Smith',
      passwordHash: studentPassword,
      role: 'STUDENT',
      branch: 'CMPN',
      division: 'A',
      year: 2,
      rollNumber: 'CMPN-A-001',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@example.com',
      name: 'Emma Davis',
      passwordHash: studentPassword,
      role: 'STUDENT',
      branch: 'CMPN',
      division: 'A',
      year: 2,
      rollNumber: 'CMPN-A-002',
    },
  });

  // Create additional students for testing class-based enrollment
  const additionalStudents = [
    { email: 'student3@example.com', name: 'Michael Brown', branch: 'CMPN', division: 'B', year: 2, rollNumber: 'CMPN-B-001' },
    { email: 'student4@example.com', name: 'Sarah Wilson', branch: 'CMPN', division: 'B', year: 2, rollNumber: 'CMPN-B-002' },
    { email: 'student5@example.com', name: 'James Taylor', branch: 'IT', division: 'A', year: 2, rollNumber: 'IT-A-001' },
    { email: 'student6@example.com', name: 'Emily Anderson', branch: 'IT', division: 'A', year: 2, rollNumber: 'IT-A-002' },
    { email: 'student7@example.com', name: 'David Martinez', branch: 'EXTC', division: 'A', year: 3, rollNumber: 'EXTC-A-001' },
    { email: 'student8@example.com', name: 'Olivia Garcia', branch: 'EXTC', division: 'B', year: 3, rollNumber: 'EXTC-B-001' },
  ];

  for (const student of additionalStudents) {
    await prisma.user.create({
      data: {
        email: student.email,
        name: student.name,
        passwordHash: studentPassword,
        role: 'STUDENT',
        branch: student.branch,
        division: student.division,
        year: student.year,
        rollNumber: student.rollNumber,
      },
    });
  }

  console.log('✅ Users created');

  // Create questions
  console.log('Creating questions...');
  const question1 = await prisma.question.create({
    data: {
      title: 'JavaScript Variables',
      type: 'MCQ',
      question: 'Which keyword is used to declare a constant in JavaScript?',
      options: ['var', 'let', 'const', 'static'],
      correctAnswer: '2',
      points: 1,
      tags: ['javascript', 'basics'],
      subject: 'Programming',
      difficulty: 'easy',
    },
  });

  const question2 = await prisma.question.create({
    data: {
      title: 'Array Methods',
      type: 'MCQ',
      question: 'Which method adds an element to the end of an array?',
      options: ['push()', 'pop()', 'shift()', 'unshift()'],
      correctAnswer: '0',
      points: 1,
      tags: ['javascript', 'arrays'],
      subject: 'Programming',
      difficulty: 'easy',
    },
  });

  const question3 = await prisma.question.create({
    data: {
      title: 'Async JavaScript',
      type: 'MCQ',
      question: 'Which of the following is used to handle asynchronous operations in JavaScript?',
      options: ['Callbacks', 'Promises', 'Async/Await', 'All of the above'],
      correctAnswer: '3',
      points: 2,
      tags: ['javascript', 'async'],
      subject: 'Programming',
      difficulty: 'medium',
    },
  });

  const question4 = await prisma.question.create({
    data: {
      title: 'Explain Closures',
      type: 'SHORT_ANSWER',
      question: 'Explain what a closure is in JavaScript with an example.',
      points: 5,
      tags: ['javascript', 'closures'],
      subject: 'Programming',
      difficulty: 'hard',
    },
  });

  const question5 = await prisma.question.create({
    data: {
      title: 'Math Operations',
      type: 'MCQ',
      question: 'What is 12 + 15?',
      options: ['25', '27', '28', '30'],
      correctAnswer: '1',
      points: 1,
      tags: ['math', 'basics'],
      subject: 'Mathematics',
      difficulty: 'easy',
    },
  });

  const question6 = await prisma.question.create({
    data: {
      title: 'Calculus',
      type: 'MCQ',
      question: 'What is the derivative of x^2?',
      options: ['x', '2x', 'x^2', '2'],
      correctAnswer: '1',
      points: 1,
      tags: ['calculus', 'derivatives'],
      subject: 'Mathematics',
      difficulty: 'medium',
    },
  });

  const question7 = await prisma.question.create({
    data: {
      title: 'Chemistry Basics',
      type: 'MCQ',
      question: 'What is the chemical formula for water?',
      options: ['H2O', 'O2', 'CO2', 'NaCl'],
      correctAnswer: '0',
      points: 1,
      tags: ['chemistry', 'basics'],
      subject: 'Science',
      difficulty: 'easy',
    },
  });

  const question8 = await prisma.question.create({
    data: {
      title: 'US History',
      type: 'MCQ',
      question: 'Who was the first President of the USA?',
      options: ['Abraham Lincoln', 'John Adams', 'George Washington', 'Thomas Jefferson'],
      correctAnswer: '2',
      points: 1,
      tags: ['history', 'usa'],
      subject: 'History',
      difficulty: 'easy',
    },
  });

  const question9 = await prisma.question.create({
    data: {
      title: 'Data Structures',
      type: 'MCQ',
      question: 'Which data structure uses FIFO (First In First Out)?',
      options: ['Stack', 'Queue', 'Tree', 'Graph'],
      correctAnswer: '1',
      points: 1,
      tags: ['datastructures', 'algorithms'],
      subject: 'Computer Science',
      difficulty: 'easy',
    },
  });

  console.log('✅ Questions created');

  // Create exam
  console.log('Creating exam...');
  const exam = await prisma.exam.create({
    data: {
      title: 'JavaScript Fundamentals Test',
      description: 'A comprehensive test covering basic to intermediate JavaScript concepts.',
      duration: 30, // 30 minutes
      maxAttempts: 2,
      status: 'PUBLISHED',
      passingScore: 70,
      createdById: teacher.id,
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
        showResultsImmediately: false,
        allowReview: true,
        preventTabSwitching: true,
        requireWebcam: true,
        lockdownBrowser: false,
      },
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  console.log('✅ Exam created');

  // Add questions to exam
  console.log('Adding questions to exam...');
  await prisma.examQuestion.createMany({
    data: [
      { examId: exam.id, questionId: question1.id, order: 0 },
      { examId: exam.id, questionId: question2.id, order: 1 },
      { examId: exam.id, questionId: question3.id, order: 2 },
      { examId: exam.id, questionId: question4.id, order: 3 },
    ],
  });

  console.log('✅ Questions added to exam');

  // Enroll students
  console.log('Enrolling students...');
  await prisma.enrollment.createMany({
    data: [
      { examId: exam.id, studentId: student1.id },
      { examId: exam.id, studentId: student2.id },
    ],
  });

  console.log('✅ Students enrolled');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('Initial Accounts:');
  console.log('═══════════════════════════════════════');
  console.log('Teacher:');
  console.log('  Email: teacher@example.com');
  console.log('  Password: teacher123');
  console.log('');
  console.log('Students:');
  console.log('  Email: student1@example.com');
  console.log('  Password: student123');
  console.log('');
  console.log('  Email: student2@example.com');
  console.log('  Password: student123');
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
