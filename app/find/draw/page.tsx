import type { Metadata } from "next";import { PerfectFreehandCanvas } from "../../components/Finder";
export const metadata:Metadata={title:"그림으로 친구 찾기"};export default function Page(){return <><h1 className="ff-visually-hidden">그림으로 친구 찾기</h1><PerfectFreehandCanvas/></>}
