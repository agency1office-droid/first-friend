import Link from "next/link";
import {notFound} from 'next/navigation';
import {requireChatGPTUser} from '../../../chatgpt-auth';
import {getStory} from '../../../../lib/stories';
import {PostForm} from '../../../components/PostForm';
import '../../board.css';
export const dynamic='force-dynamic';
export const metadata={title:'이야기 수정',robots:{index:false,follow:false}};
export default async function EditStory({params}:{params:Promise<{id:string}>}){const {id}=await params,user=await requireChatGPTUser('/stories/manage/'+id),story=await getStory(id,user.userId);if(!story)notFound();return <div className="ff-page ff-board-page"><header className="ff-board-heading"><h1>{story.status==='draft'?'이어서 쓰기':'이야기 수정'}</h1><Link href="/stories/manage">내 글 관리</Link></header><PostForm initial={story}/></div>;}
