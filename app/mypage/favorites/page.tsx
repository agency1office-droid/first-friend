import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { favorites } from "../../../db/schema";
import { getAnimalById } from "../../../lib/public-data";
import { FavoriteAnimalGrid } from "../../components/FavoriteAnimalGrid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "관심 친구" };

export default async function Page() {
  const user = await requireChatGPTUser("/mypage/favorites");
  const rows = await getDb()
    .select()
    .from(favorites)
    .where(eq(favorites.memberId, user.userId))
    .orderBy(desc(favorites.createdAt));
  const resolved = await Promise.all(rows.map((row) => getAnimalById(row.animalId)));
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
