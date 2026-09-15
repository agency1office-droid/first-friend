import type{Metadata}from"next";import{WorldCupFinder}from"../../components/WorldCupFinder";import{getAuthenticatedMember}from"../../chatgpt-auth";export const metadata:Metadata={title:"첫 친구 이상형 월드컵"};
// 로그인한 회원이면 인연 카드에 이름을 쓰고, 관리자에게는 인트로에 결과 미리보기 버튼을 보여 줍니다. 쿠키가 없으면 DB를 읽지 않습니다.
export default async function Page(){const member=await getAuthenticatedMember();return <><h1 className="ff-visually-hidden">첫 친구 이상형 월드컵</h1><WorldCupFinder member={member?{name:member.displayName,admin:member.role==="admin"}:null}/></>}
