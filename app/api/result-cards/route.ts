import { getChatGPTUser } from '../../chatgpt-auth';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { getAnimalById } from '../../../lib/public-data';
import { completionDate, legacyQuizCard, type WorldcupCardData } from '../../../lib/result-card';

const headers = { 'cache-control': 'private, no-store' };
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: '로그인 후 기록을 확인할 수 있어요.' }, { status: 401, headers });
  const offset = Number(new URL(request.url).searchParams.get('offset') ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return Response.json({ error: '페이지를 확인해 주세요.' }, { status: 400, headers });
  const db = getSupabaseServerClient();
  const [quizzes, worldcup] = await Promise.all([
    db.from('member_quiz_completions').select('quiz,ratio,title,medal,card,completed_at').eq('member_id', user.userId),
    db.from('member_worldcup_results').select('run_id,animal_id,card,completed_at').eq('member_id', user.userId).order('completed_at', { ascending: false }).order('run_id', { ascending: false }).range(offset, offset + 20),
  ]);
  if (quizzes.error || worldcup.error) return Response.json({ error: '결과 카드를 불러오지 못했어요. 다시 시도해 주세요.' }, { status: 503, headers });
  return Response.json({ quizzes: quizzes.data.map(row => ({ ...row, card: row.card ?? legacyQuizCard(row, user.displayName) })), worldcup: worldcup.data.slice(0, 20), hasMore: worldcup.data.length > 20 }, { headers });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: '로그인하면 이번 결과를 저장할 수 있어요.' }, { status: 401, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: '요청 주소를 확인해 주세요.' }, { status: 403, headers });
  let body, completedAt;
  try {
    body = await request.json(); completedAt = completionDate(body.completedAt);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.runId) || typeof body.animalId !== 'string' || body.animalId.length > 100) throw new Error();
  } catch { return Response.json({ error: '월드컵 결과를 확인해 주세요.' }, { status: 400, headers }); }
  const db = getSupabaseServerClient();
  const existing = await db.from('member_worldcup_results').select('run_id').eq('member_id', user.userId).eq('run_id', body.runId).maybeSingle();
  if (existing.error) return Response.json({ error: '결과를 저장하지 못했어요.' }, { status: 503, headers });
  if (existing.data) return Response.json({ saved: true }, { headers });
  const animal = await getAnimalById(body.animalId);
  if (!animal) return Response.json({ error: '친구 정보를 확인할 수 없어요.' }, { status: 404, headers });
  const rawBreed = animal.name.split(' · ')[0]?.trim() || animal.breed;
  const card: WorldcupCardData = {
    headline: `${user.displayName.trim().slice(0, 8)}님과 이어진 친구`,
    breed: /^(기타|품종\s*미상|미상)$/.test(rawBreed) ? (animal.species === '고양이' ? '고양이 친구' : '강아지 친구') : rawBreed,
    number: animal.name.split(' · ')[1] ?? '', meta: [animal.age.includes('60일미만') ? '60일 미만' : animal.age.replace(/^(\d{4})(?:\([^)]*\))*\(년생\)$/, '$1년생'), animal.sex, animal.region.trim().split(/\s+/).slice(0, 2).join(' ')].filter(Boolean).join(' · '),
    shelter: animal.shelter, photo: animal.thumbnail || animal.image,
  };
  const { error } = await db.from('member_worldcup_results').upsert({ member_id: user.userId, run_id: body.runId, animal_id: animal.id, card, completed_at: completedAt }, { onConflict: 'member_id,run_id', ignoreDuplicates: true });
  if (error) return Response.json({ error: '결과를 저장하지 못했어요. 다시 시도해 주세요.' }, { status: 503, headers });
  return Response.json({ saved: true }, { headers });
}
