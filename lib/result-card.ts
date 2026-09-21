import { careSections, evaluateCare, type CareAnswers } from './care-readiness';

export type QuizId = 'care-readiness' | 'adoption-prep' | 'pet-knowledge';
export type Medal = 'bronze' | 'silver' | 'gold';
export type QuizCardData = { quiz: QuizId; badge: string; tone: Medal; holder: string; rows: { label: string; value: string }[] };
export type WorldcupCardData = { headline: string; breed: string; number: string; meta: string; shelter: string; photo: string };
export const medalValue = { bronze: 0, silver: 1, gold: 2 };
export const quizNames = { 'care-readiness': '입양 환경 점검', 'adoption-prep': '입양 준비', 'pet-knowledge': '상식 퀴즈' };

export function quizCard(body: Record<string, unknown>, holder: string) {
  const quiz = body.quiz as QuizId;
  if (!Object.hasOwn(quizNames, quiz)) throw new Error('퀴즈를 확인해 주세요.');
  let ratio = body.ratio as number;
  let title: string;
  let tone: Medal;
  let rows: QuizCardData['rows'];
  if (quiz === 'care-readiness') {
    const answers = body.answers as CareAnswers;
    const species = body.species === 'cat' ? 'cat' : 'dog';
    if (!answers || !careSections(species).flatMap(s => s.questions).every(q =>
      ['ready', 'planning', 'unchecked', ...(q.na ? ['na'] : []), ...(q.blocked ? ['blocked'] : [])].includes(answers[q.id]))) throw new Error('점검한 항목을 확인해 주세요.');
    const result = evaluateCare(answers, species);
    ratio = result.score / 100;
    tone = result.tone;
    title = result.message;
    const grade = tone === 'gold' ? '준비된 예비 반려인' : tone === 'silver' ? '차근차근 준비하는 예비 반려인' : '첫걸음을 시작한 예비 반려인';
    rows = [{ label: '함께할 준비', value: `${result.score}%` }, { label: '항목', value: `${result.readyCount}/${result.total}` }, { label: '등급', value: grade }];
  } else {
    const total = quiz === 'pet-knowledge' ? 15 : 17;
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1 || Math.abs(ratio * total - Math.round(ratio * total)) > 0.000001) throw new Error('점수를 확인해 주세요.');
    const count = Math.round(ratio * total);
    tone = ratio >= 1 ? 'gold' : ratio >= 0.8 ? 'silver' : 'bronze';
    title = count === total ? (quiz === 'pet-knowledge' ? '최고의 반려인' : '완벽한 반려인') : ratio < 0.8 ? '배워가는 반려인' : quiz === 'adoption-prep' && count === Math.ceil(total * 0.8) ? '따뜻한 반려인' : '세심한 반려인';
    rows = [{ label: '점수', value: `${count}/${total}` }, { label: '등급', value: title }];
  }
  const card: QuizCardData = { quiz, badge: quiz === 'care-readiness' ? '입양 환경 점검 확인서' : quiz === 'pet-knowledge' ? '반려 상식 수료증' : '입양 준비 수료증', tone, holder, rows };
  return { ratio, title, medal: medalValue[tone], card };
}

export function completionDate(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 60000 || date.getTime() < Date.UTC(2020, 0, 1)) throw new Error('완료 날짜를 확인해 주세요.');
  return date.toISOString();
}

export function resultDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)).replaceAll('-', '.');
}

export function legacyQuizCard(row: { quiz: QuizId; ratio: number; medal: number }, holder: string): QuizCardData {
  if (row.quiz !== 'care-readiness') return quizCard(row, holder).card;
  const tone: Medal = row.medal === 2 ? 'gold' : row.medal === 1 ? 'silver' : 'bronze';
  return { quiz: row.quiz, badge: '입양 환경 점검 확인서', tone, holder, rows: [
    { label: '함께할 준비', value: `${Math.round(row.ratio * 100)}%` },
    { label: '등급', value: tone === 'gold' ? '준비된 예비 반려인' : tone === 'silver' ? '차근차근 준비하는 예비 반려인' : '첫걸음을 시작한 예비 반려인' },
  ] };
}
