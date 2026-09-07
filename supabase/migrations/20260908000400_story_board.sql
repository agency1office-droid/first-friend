begin;
alter table public.posts add column if not exists status text not null default 'published' check (status in ('draft','published','deleted'));
alter table public.posts add column if not exists image_keys text[] not null default '{}';
alter table public.posts add column if not exists published_at text;
alter table public.posts add column if not exists revision integer not null default 1;
alter table public.posts add column if not exists client_key uuid;
alter table public.posts add column if not exists reaction_count integer not null default 0;
update public.posts set published_at=created_at where status='published' and published_at is null;
update public.posts set image_keys=array[image_key] where image_key is not null and cardinality(image_keys)=0;
alter table public.posts add constraint posts_image_count check (cardinality(image_keys)<=3);
create unique index if not exists posts_member_client_key on public.posts(member_id,client_key) where client_key is not null;
create index if not exists posts_public_feed on public.posts(status,hidden,published_at desc,id desc);
create index if not exists posts_member_feed on public.posts(member_id,status,updated_at desc);
create index if not exists posts_images on public.posts using gin(image_keys);
update public.posts p set reaction_count=(select count(*) from public.post_reactions r where r.post_id=p.id);
create table if not exists public.post_media (
 id uuid primary key, member_id text not null references public.members(id),
 object_key text not null unique, thumb_key text not null unique, created_at timestamptz not null default now()
);
alter table public.post_media enable row level security;
revoke all on public.post_media from anon, authenticated;
grant all on public.post_media to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('story-media','story-media',false,8388608,array['image/webp']) on conflict(id) do nothing;
create or replace function public.set_story_reaction(p_member text,p_post bigint,p_active boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 perform 1 from posts where id=p_post and status='published' and hidden=false for update;
 if not found then raise exception 'story unavailable'; end if;
 if not exists(select 1 from members where id=p_member and sanctioned=false) then raise exception 'member unavailable'; end if;
 if p_active then
  insert into post_reactions(member_id,post_id,reaction) values(p_member,p_post,'cheer') on conflict(member_id,post_id) do nothing;
 else delete from post_reactions where member_id=p_member and post_id=p_post;
 end if;
 select count(*) into n from post_reactions where post_id=p_post;
 update posts set reaction_count=n where id=p_post;
 return jsonb_build_object('active',p_active,'count',n);
end $$;
revoke all on function public.set_story_reaction(text,bigint,boolean) from public,anon,authenticated;
grant execute on function public.set_story_reaction(text,bigint,boolean) to service_role;
notify pgrst,'reload schema';
commit;
