export const storyCategories = { memory: '오늘의 일상', neighborhood: '동네 친구', adoption: '입양 일기', rescue: '보호 이야기' } as const;
export const storyPageSize = 20;
export const storyPhotoLimit = 3;
export const privateStoryPattern = /(01[016789][\s.-]?\d{3,4}[\s.-]?\d{4})|(\d{1,4}번지)|(\d+동\s*\d+호)|(급식소|밥자리|포획\s*장소).{0,20}(앞|뒤|옆|골목|번지|출구)/;
export function storyInput(value: Record<string, unknown>) {
 const title=typeof value.title==='string'?value.title.trim():'',body=typeof value.body==='string'?value.body.trim():'';
 const category=String(value.category||'memory'),status=value.status==='draft'?'draft':'published';
 const images=value.imageKeys ?? (value.imageKey?[value.imageKey]:[]);
 if (!Object.hasOwn(storyCategories,category)||!['draft','published',undefined].includes(value.status as string|undefined)) throw new Error('이야기 종류와 공개 상태를 확인해 주세요.');
 if([...title].length>80||[...body].length>2000)throw new Error('제목은 80자, 본문은 2,000자까지 쓸 수 있어요.');
 if(status==='published'&&(!title||[...body].length<5))throw new Error('제목과 5자 이상의 이야기를 써 주세요.');
 if(!Array.isArray(images)||images.length>3||images.some(k=>typeof k!=='string'||k.length>240)||new Set(images).size!==images.length)throw new Error('사진은 서로 다른 사진 3장까지 올릴 수 있어요.');
 if(status==='published'&&privateStoryPattern.test(title+' '+body))throw new Error('정확한 연락처·주소·동물 위치를 빼고 공개해 주세요.');
 return {title,body,category,status,image_keys:images as string[],image_key:images[0]||null};
}
export function storyQuery(params: URLSearchParams) {
 const page=Number(params.get('page')||1),q=(params.get('q')||'').trim(),category=params.get('category')||'',sort=params.get('sort')||'newest',author=params.get('author')||'';
 if(!Number.isSafeInteger(page)||page<1||page>10000||q.length>80||(category&&!Object.hasOwn(storyCategories,category))||!['newest','cheers'].includes(sort)||(author&&!/^[a-zA-Z0-9-]{1,80}$/.test(author)))throw new Error('검색 조건을 확인해 주세요.');
 return {page,q,category,sort,author};
}
export function storyImageUrl(key:string,thumbnail=false) {
 return key.startsWith('story-media/')?`/api/post-media?id=${encodeURIComponent(key.slice(12))}${thumbnail?'&size=thumb':''}`:`/media/${key}`;
}
