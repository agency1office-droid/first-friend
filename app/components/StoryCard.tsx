import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import type { PublicStory } from '../../lib/stories';
import { storyReactionKinds, storyReactions } from '../../lib/story-input';
export function StoryCard({story}:{story:PublicStory}){
 const top=storyReactionKinds.filter(k=>story.reactionCounts[k]>0).sort((a,b)=>story.reactionCounts[b]-story.reactionCounts[a]).slice(0,3);
 return <article className="ff-board-card">
  <div className="ff-board-byline"><Link prefetch={false} href={'/stories?author='+encodeURIComponent(story.authorId)}><span className="ff-board-avatar" aria-hidden>{story.author.slice(0,1)}</span>{story.author}</Link><time dateTime={story.createdAt}>{new Date(story.createdAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}</time></div>
  <Link prefetch={false} className="ff-board-card-link" href={'/stories/'+story.id}><div><span className="ff-board-category">{story.category}</span><h2>{story.title}</h2><p>{story.body}</p></div>{story.image&&<div className="ff-board-thumb"><img src={story.image} alt="" width={88} height={88} loading="lazy"/>{story.images.length>1&&<span>사진 {story.images.length}장</span>}</div>}</Link>
  <div className="ff-board-card-meta">{top.length?<><span className="ff-board-reaction-icons">{top.map(k=><img key={k} src={`/reactions/${k}.svg`} alt={storyReactions[k]} width={18} height={18}/>)}</span><span>반응 {story.reactions}</span></>:'첫 반응을 기다리고 있어요'}</div>
 </article>;
}
