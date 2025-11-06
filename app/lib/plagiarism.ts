import prisma from './prisma';

function normalizeText(s: string) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .toLowerCase()
    .trim();
}

function ngrams(text: string, n = 3) {
  const t = normalizeText(text);
  const tokens = t.split(' ');
  const grams = new Set<string>();
  const joined = t.replace(/\s+/g, '');
  if (joined.length <= n) {
    grams.add(joined);
    return grams;
  }
  for (let i = 0; i + n <= joined.length; i++) {
    grams.add(joined.slice(i, i + n));
  }
  return grams;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 && b.size === 0) return 0;
  const inter = new Set<string>();
  for (const x of a) if (b.has(x)) inter.add(x);
  const union = new Set<string>([...a, ...b]);
  return inter.size / union.size;
}

/**
 * Compute a simple plagiarism percent (0-100) for an attempt by comparing
 * the concatenated short/essay answers of this attempt against other submitted
 * attempts for the same exam. Returns { plagiarismPercent, details }.
 */
export async function computePlagiarismForAttempt(
  attemptId: string,
  examId: string,
  shortQuestionIds: string[],
  studentId: string
) {
  // Fetch this attempt's answers for relevant questions
  const ownAnswers = await prisma.answer.findMany({
    where: {
      attemptId,
      questionId: { in: shortQuestionIds },
    },
    select: { answer: true },
  });

  const ownText = ownAnswers.map(a => (typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer))).join(' ');
  const ownGrams = ngrams(ownText);

  // Fetch other attempts' answers (submitted attempts for this exam)
  const otherAnswers = await prisma.answer.findMany({
    where: {
      questionId: { in: shortQuestionIds },
      attempt: {
        examId,
        studentId: { not: studentId },
        status: 'SUBMITTED',
      },
    },
    select: { attemptId: true, answer: true },
    orderBy: { attemptId: 'asc' },
  });

  // Group by attemptId and compute similarity per attempt
  const grouped: Record<string, string[]> = {};
  for (const row of otherAnswers) {
    if (!grouped[row.attemptId]) grouped[row.attemptId] = [];
    grouped[row.attemptId].push(typeof row.answer === 'string' ? row.answer : JSON.stringify(row.answer));
  }

  const matches: Array<{ attemptId: string; percent: number }> = [];
  let maxPercent = 0;
  for (const [otherAttemptId, texts] of Object.entries(grouped)) {
    const otherText = texts.join(' ');
    const otherGrams = ngrams(otherText);
    const sim = jaccard(ownGrams, otherGrams);
    const percent = Math.round(sim * 100 * 10) / 10; // one decimal
    matches.push({ attemptId: otherAttemptId, percent });
    if (percent > maxPercent) maxPercent = percent;
  }

  return {
    plagiarismPercent: Math.round(maxPercent * 10) / 10,
    details: { matches, ownNgrams: ownGrams.size },
  };
}

export default {
  computePlagiarismForAttempt,
};
