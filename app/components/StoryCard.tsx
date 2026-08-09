/* eslint-disable @next/next/no-img-element */
type Story={id:number;category:string;title:string;body:string;author:string;image:string;reactions:number};
export function StoryCard({story}:{story:Story}){return <article className="ff-story"><img className="ff-story-image" src={story.image} alt="" loading="lazy"/><div><div className="ff-story-category">{story.category}</div><h3 className="ff-story-title">{story.title}</h3><div className="ff-story-body">{story.body}</div><div className="ff-story-meta">{story.author} · 공감 {story.reactions}</div></div></article>}
