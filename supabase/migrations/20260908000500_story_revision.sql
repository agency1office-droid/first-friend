-- Keep author edits and existing administrator moderation in the same revision contract.
create or replace function public.bump_story_revision() returns trigger language plpgsql set search_path=public as $$
begin
 if row(new.title,new.body,new.category,new.image_keys,new.status,new.hidden)
    is distinct from row(old.title,old.body,old.category,old.image_keys,old.status,old.hidden) then
   new.revision := old.revision+1;
   new.updated_at := current_timestamp::text;
 end if;
 return new;
end $$;
create trigger story_revision before update on public.posts for each row execute function public.bump_story_revision();
notify pgrst,'reload schema';
