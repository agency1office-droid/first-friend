import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getAnimalById } from "../../../lib/public-data";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { FavoriteAnimalGrid } from "../../components/FavoriteAnimalGrid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "관심 친구" };

export default async function Page() {
  const user = await requireChatGPTUser("/mypage/favorites");
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
