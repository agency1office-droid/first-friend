import Link from "next/link";
import type {Metadata} from 'next';
import {PostForm} from '../../components/PostForm';
import {getChatGPTUser} from '../../chatgpt-auth';
import {LoginSheet} from '../../components/LoginSheet';
import '../board.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'이야기 쓰기',robots:{index:false,follow:false}};
export default async function NewStory(){const user=await getChatGPTUser();if(!user)return <div className="ff-page ff-board-page"><h1 className="ff-visually-hidden">이야기 쓰기</h1><LoginSheet returnTo="/stories/new" prompt="로그인하고 이야기를 남겨 보세요" title="퍼스트프렌드 로그인" description="이야기를 쓰려면 로그인이 필요해요"/></div>;return <div className="ff-page ff-board-page"><header className="ff-board-heading"><h1>이야기 쓰기</h1><Link href="/stories/manage">내 글 관리</Link></header><PostForm/></div>;}
