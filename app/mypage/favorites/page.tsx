import type { Metadata } from "next";
import { chatGPTSignInPath, getChatGPTUser } from "../../chatgpt-auth";
import { getAnimalsByIds } from "../../../lib/public-data";
import type { Animal } from "../../../lib/data";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { FavoriteAnimalGrid } from "../../components/FavoriteAnimalGrid";
import { Callout } from "seed-design/ui/callout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "관심 친구" };

export default async function Page() {
  const user = await getChatGPTUser();
  if (!user) return <div className="ff-page">
    <header className="ff-page-header">
      <div className="ff-kicker">다시 천천히 살펴보기</div>
      <h1 className="ff-title">관심 친구</h1>
      <p className="ff-description">마음에 담아둔 친구를 다시 보려면 로그인이 필요해요.</p>
    </header>
    <Callout tone="informative" title="로그인 후 스크랩한 친구를 확인할 수 있어요" description="로그인하면 관심 친구와 저장 검색을 안전하게 이어서 볼 수 있어요." linkProps={{ href: chatGPTSignInPath("/mypage/favorites"), children: "로그인·회원가입" }} />
  </div>;
  const { data: rows, error: listError } = await getSupabaseServerClient().from("favorites").select("animal_id").eq("member_id", user.userId).order("created_at", { ascending: false });
  let error: unknown = listError;
  let resolved: Array<Animal | undefined> = [];
  if (!error) {
    try { resolved = await getAnimalsByIds((rows || []).map(row => row.animal_id)); }
    catch (cause) { error = cause; }
  }
  const animals = resolved.filter((animal) => animal !== undefined);

  return <div className="ff-page">
    <header className="ff-page-header">
      <div className="ff-kicker">다시 천천히 살펴보기</div>
      <h1 className="ff-title">관심 친구</h1>
      <p className="ff-description">최근 스크랩한 친구부터 보여드려요. 공고가 종료되면 상세 정보가 제한될 수 있어요.</p>
    </header>
    {error ? <Callout tone="critical" title="관심 친구를 불러오지 못했어요" description="잠시 후 다시 확인해 주세요." linkProps={{ href: "/mypage/favorites", children: "다시 확인하기" }} /> : <>
      {resolved.length > animals.length && <Callout tone="informative" title="일부 친구의 정보를 확인하고 있어요" description={`스크랩 ${resolved.length}건 중 ${resolved.length - animals.length}건의 공고를 지금 불러올 수 없어요. 스크랩 기록은 유지돼요.`} />}
      {(animals.length > 0 || resolved.length === 0) && <FavoriteAnimalGrid animals={animals}/>}
    </>}
  </div>;
}
