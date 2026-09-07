-- Business data is accessed through the server's authenticated API, never anon REST.
do $$
declare t text; seq text;
begin
  foreach t in array array['applications','favorites','lost_reports','members','posts','reports','adoption_agreements','application_messages','direct_animals','handover_reservations','post_reactions','readiness_assessments','application_events','moderation_actions','notifications','return_requests','saved_searches','verification_requests','account_sanctions','admin_audit_logs','animal_media','family_opinions','family_rooms','lost_matches','lost_messages','lost_timeline_events','shelter_needs','shelter_profiles','shelter_updates','support_records','volunteer_applications','volunteer_posts','adoption_certifications','sanction_appeals','shelter_update_reactions','auth_accounts','auth_sessions','animal_name_suggestions','animal_name_votes','community_answers','community_questions','drawing_matches','drawing_posts','fundraiser_pledges','fundraisers','volunteer_badges','shelter_follows','api_rate_limit_events','api_idempotency_keys'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from public,anon,authenticated',t);
    execute format('grant all on table public.%I to service_role',t);
    seq:=pg_get_serial_sequence('public.'||quote_ident(t),'id');
    if seq is not null then
      execute format('revoke all on sequence %s from public,anon,authenticated',seq);
      execute format('grant usage,select on sequence %s to service_role',seq);
    end if;
  end loop;
end $$;

-- Hidden animals must also be excluded from direct public REST reads.
drop policy if exists "public active animals read" on public.public_animals;
create policy "public active animals read" on public.public_animals
for select to anon,authenticated using(active and not hidden);

create or replace function public.consume_api_rate_limit(p_scope text,p_subject_hash text,p_window_seconds integer,p_max_requests integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_count integer;
begin
  if p_scope is null or p_subject_hash is null or p_window_seconds is null or p_window_seconds<1 or p_max_requests is null or p_max_requests<1 then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_scope||':'||p_subject_hash,0));
  -- A short upload/AI window must not erase a longer authentication window.
  delete from api_rate_limit_events where scope=p_scope and created_at<now()-make_interval(secs=>p_window_seconds*2);
  select count(*) into current_count from api_rate_limit_events
    where scope=p_scope and subject_hash=p_subject_hash and created_at>=now()-make_interval(secs=>p_window_seconds);
  if current_count>=p_max_requests then return false; end if;
  insert into api_rate_limit_events(scope,subject_hash) values(p_scope,p_subject_hash);
  return true;
end $$;
revoke all on function public.consume_api_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_api_rate_limit(text,text,integer,integer) to service_role;

