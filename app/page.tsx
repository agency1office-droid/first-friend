import Link from "next/link";
import type { AnimalPage } from "../lib/public-animal-store";
import { HomeAnimalFeed } from "./components/HomeAnimalFeed";
import { HomeSearchFab } from "./components/HomeSearchFab";

export const dynamic="force-static";

const initialPage: AnimalPage = { items: [], total: 0, nextCursor: null, syncedAt: null, stale: false };

export default function Home(){return <div className="ff-page ff-home-page"><HomeAnimalFeed initialPage={initialPage}/><HomeSearchFab/><section className="ff-home-intro" aria-label="퍼스트 프렌드 소개"><h2>가까운 보호소에서 새로운 가족을 만나보세요</h2><p>보호 중인 동물의 사진과 공고, 보호소 위치를 확인하고 만남을 준비해요.</p><nav aria-label="입양 준비 안내"><Link href="/find">보호동물 찾기</Link><Link href="/shelters">보호소 찾기</Link><Link href="/guide">입양 절차 알아보기</Link></nav></section></div>}
