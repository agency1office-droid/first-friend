import Link from "next/link";
import type { PublicStory } from '../../lib/stories';
import { StoryCard } from './StoryCard';
export function StoryFeed({stories}:{stories:PublicStory[]}){
 return <div className="ff-board-list">{stories.length?stories.map(story=><StoryCard story={story} key={story.id}/>):<div className="ff-board-empty"><strong>아직 이야기가 없어요</strong><p>함께한 순간을 첫 이야기로 남겨 주세요.</p><Link href="/stories/new">이야기 쓰기 →</Link></div>}</div>;
}
