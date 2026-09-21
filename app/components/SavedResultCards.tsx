"use client";
import { useEffect, useRef, useState } from 'react';
import { ActionButton } from 'seed-design/ui/action-button';
import { List, ListButtonItem } from 'seed-design/ui/list';
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot } from 'seed-design/ui/bottom-sheet';
import { CertificateResult, type CertificateHandle } from './CertificateCard';
import { WorldCupCard, loadCardAssets, type CardAssets } from './WorldCupCard';
import { exportCardPng } from '../../lib/card-export';
import { quizNames, resultDate, type QuizCardData, type QuizId, type WorldcupCardData } from '../../lib/result-card';
import { syncPendingResults } from '../../lib/pending-results';

type QuizRecord = { quiz: QuizId; title: string; ratio: number; medal: number; card: QuizCardData | null; completed_at: string };
type WorldRecord = { run_id: string; animal_id: string; card: WorldcupCardData; completed_at: string };
type Records = { quizzes: QuizRecord[]; worldcup: WorldRecord[]; hasMore: boolean };

function SavedWorldCard({ record }: { record: WorldRecord }) {
  const ref = useRef<SVGSVGElement>(null);
  const [assets, setAssets] = useState<CardAssets | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    loadCardAssets({ id: record.animal_id, thumbnail: record.card.photo, image: record.card.photo }, `${window.location.origin}/friends/${record.animal_id}`)
      .then(value => { if (active) setAssets({ ...value, date: resultDate(record.completed_at) }); })
      .catch(() => { if (active) setError('카드 이미지를 불러오지 못했어요. 잠시 후 다시 열어 주세요.'); });
    return () => { active = false; };
  }, [record]);
  async function save() {
    if (!ref.current || !assets) return;
    try {
      const url = URL.createObjectURL(await exportCardPng(ref.current));
      const link = document.createElement('a'); link.href = url; link.download = `firstfriend-${record.run_id}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setError('카드를 저장하지 못했어요. 다시 시도해 주세요.'); }
  }
  return <><WorldCupCard ref={ref} {...record.card} assets={assets} />{error && <p role="alert">{error}</p>}<ActionButton size="large" disabled={!assets} onClick={() => void save()}>카드 저장</ActionButton></>;
}

export function SavedResultCards() {
  const [records, setRecords] = useState<Records>({ quizzes: [], worldcup: [], hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<QuizRecord | WorldRecord | null>(null);
  const cert = useRef<CertificateHandle>(null);
  async function load(offset = 0) {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/result-cards?offset=${offset}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json() as Records;
      setRecords(current => ({ ...data, worldcup: offset ? [...current.worldcup, ...data.worldcup] : data.worldcup }));
    } catch { setError('결과 카드를 불러오지 못했어요. 다시 시도해 주세요.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    void syncPendingResults().then(() => { if (active) void load(); });
    const refresh = () => { if (active) void load(); };
    window.addEventListener('ff-quiz-completion-updated', refresh);
    return () => { active = false; window.removeEventListener('ff-quiz-completion-updated', refresh); };
  }, []);
  const quizRecord = selected && 'quiz' in selected ? selected : null;
  const card = quizRecord?.card;
  return <section className="ff-section ff-saved-results">
    <h2 className="ff-section-title">나의 결과 카드</h2>
    <p className="ff-meta">테스트는 최고 기록을, 월드컵은 매번 만난 친구를 남겨요.</p>
    <h3>테스트 최고 기록</h3>
    <List>{records.quizzes.map(row => <ListButtonItem key={row.quiz} onClick={() => setSelected(row)} title={quizNames[row.quiz]} detail={`${resultDate(row.completed_at)} · ${Math.round(row.ratio * 100)}점`} suffix={<span>{['동메달', '은메달', '금메달'][row.medal]} ›</span>} />)}</List>
    {!loading && !records.quizzes.length && <p className="ff-meta">퀴즈를 완료하면 첫 결과 카드가 생겨요.</p>}
    <h3>월드컵에서 만난 친구</h3>
    <List>{records.worldcup.map(row => <ListButtonItem key={row.run_id} onClick={() => setSelected(row)} title={`${row.card.number} ${row.card.breed}`} detail={`${resultDate(row.completed_at)} · ${row.card.shelter}`} suffix={<span>카드 보기 ›</span>} />)}</List>
    {!loading && !records.worldcup.length && <p className="ff-meta">월드컵을 마치면 인연 카드가 차곡차곡 쌓여요.</p>}
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">결과 카드를 불러오고 있어요.</p>}
    {(error || records.hasMore) && <ActionButton variant="neutralWeak" disabled={loading} onClick={() => void load(error ? 0 : records.worldcup.length)}>{error ? '다시 불러오기' : '더 보기'}</ActionButton>}
    <BottomSheetRoot open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><BottomSheetContent className="ff-saved-result-sheet" title="나의 결과 카드"><BottomSheetBody className="ff-saved-result-detail">
      {card && quizRecord && <><CertificateResult key={`${quizRecord.quiz}-${quizRecord.completed_at}`} ref={cert} archived={{ date: resultDate(quizRecord.completed_at), number: `FF-${quizRecord.quiz}-${quizRecord.completed_at.slice(0, 10)}` }} quiz={card.quiz} badge={card.badge} toneOverride={card.tone} memberName={card.holder} rows={card.rows} illustration={card.tone === 'bronze' ? '/readiness-result-failed.webp' : '/readiness-result.webp'} share={{ title: card.badge, text: quizRecord.title }} /><ActionButton size="large" onClick={() => void cert.current?.save()}>카드 저장</ActionButton></>}
      {quizRecord && !card && <p>이전 기록: {quizRecord.title}<br />{resultDate(quizRecord.completed_at)} · {Math.round(quizRecord.ratio * 100)}점<br />카드 저장 기능이 생기기 전 기록이에요.</p>}
      {selected && 'run_id' in selected && <SavedWorldCard key={selected.run_id} record={selected} />}
    </BottomSheetBody></BottomSheetContent></BottomSheetRoot>
  </section>;
}
