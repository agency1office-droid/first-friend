import type { Metadata } from "next";
import { getShelters } from "../../../lib/public-data";
import { ShelterMap } from "../../components/ShelterMap";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내 주변 보호소 지도", description: "현재 위치를 기준으로 가까운 동물보호소와 각 보호소 채널을 확인하세요." };
export default async function Page() { const shelters = await getShelters(100); return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">내 주변 도움 연결</div><h1 className="ff-title">지도에서 가까운<br/>보호소를 찾아요</h1><p className="ff-description">위치 권한은 브라우저 안에서 거리 계산에만 쓰며 서버에 저장하지 않습니다.</p></header>{shelters.length ? <ShelterMap shelters={shelters} jsKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY || ""}/> : <div className="ff-empty">보호소 데이터를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</div>}</div> }
