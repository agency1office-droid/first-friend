/* eslint-disable @next/next/no-img-element */
import type { PublicStory } from '../../lib/stories';
export function StoryCard({story}:{story:PublicStory}){
 return <article className="ff-board-card">
  <div className="ff-board-byline"><a href={'/stories?author='+encodeURIComponent(story.authorId)}><span className="ff-board-avatar" aria-hidden>{story.author.slice(0,1)}</span>{story.author}</a><time dateTime={story.createdAt}>{new Date(story.createdAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}</time></div>
  <a className="ff-board-card-link" href={'/stories/'+story.id}><div><span className="ff-board-category">{story.category}</span><h2>{story.title}</h2><p>{story.body}</p></div>{story.image&&<div className="ff-board-thumb"><img src={story.image} alt="" width={88} height={88} loading="lazy"/>{story.images.length>1&&<span>사진 {story.images.length}장</span>}</div>}</a>
  <div className="ff-board-card-meta">♡ 응원 {story.reactions}</div>
 </article>;
}
