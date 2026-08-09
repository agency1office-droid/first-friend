/* eslint-disable @next/next/no-img-element */
import type { PublicStory } from "../../lib/stories";

export function StoryCard({ story }: { story: PublicStory }) { return <article className="ff-story"><a href={`/stories/${story.id}`}><img className="ff-story-image" src={story.image} alt="" loading="lazy"/></a><div><div className="ff-story-category">{story.category}</div><a href={`/stories/${story.id}`}><h3 className="ff-story-title">{story.title}</h3></a><div className="ff-story-body">{story.body}</div><div className="ff-story-meta">{story.author} · 응원 {story.reactions}</div></div></article>; }
