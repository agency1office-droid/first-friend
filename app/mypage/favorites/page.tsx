import type { Metadata } from "next";
import { chatGPTSignInPath, getChatGPTUser } from "../../chatgpt-auth";
import { getAnimalById } from "../../../lib/public-data";
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
  const { data: rows } = await getSupabaseServerClient().from("favorites").select("animal_id").eq("member_id", user.userId).order("created_at", { ascending: false });
  const resolved = await Promise.all((rows || []).map((row) => getAnimalById(row.animal_id)));
  const animals = resolved.filter((animal) => animal !== undefined);

  return <div className="ff-page">
    <header className="ff-page-header">
      <div className="ff-kicker">다시 천천히 살펴보기</div>
      <h1 className="ff-title">관심 친구</h1>
      <p className="ff-description">최근 스크랩한 친구부터 보여드려요. 공고가 종료되면 상세 정보가 제한될 수 있어요.</p>
    </header>
    <FavoriteAnimalGrid animals={animals}/>
  </div>;
}
