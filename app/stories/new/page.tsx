import Link from "next/link";
import type {Metadata} from 'next';
import {PostForm} from '../../components/PostForm';
import {requireChatGPTUser} from '../../chatgpt-auth';
import '../board.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'이야기 쓰기',robots:{index:false,follow:false}};
export default async function NewStory(){await requireChatGPTUser('/stories/new');return <div className="ff-page ff-board-page"><header className="ff-board-heading"><h1>이야기 쓰기</h1><Link href="/stories/manage">내 글 관리</Link></header><PostForm/></div>;}
