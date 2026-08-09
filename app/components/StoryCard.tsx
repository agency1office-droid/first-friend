/* eslint-disable @next/next/no-img-element */
type Story = { id: number; category: string; title: string; body: string; author: string; image: string; reactions: number };
export function StoryCard({ story }: { story: Story }) {
  return <article className="story-card">
    <img src={story.image} alt="" loading="lazy" />
    <div className="story-body"><div className="story-category">{story.category}</div><h3 className="story-title">{story.title}</h3><p className="story-text">{story.body}</p><div className="story-footer"><span>{story.author}</span><span>♡ 응원 {story.reactions}</span></div></div>
  </article>;
}
