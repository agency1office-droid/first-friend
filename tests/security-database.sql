begin;
do $$
begin
 assert not has_table_privilege('anon','members','select');
 assert not has_table_privilege('authenticated','auth_sessions','select');
 assert not has_table_privilege('anon','api_rate_limit_events','insert');
 assert not has_table_privilege('anon','api_idempotency_keys','select');
 assert has_table_privilege('service_role','members','select,insert,update');
 assert exists(select 1 from pg_class where oid='public.members'::regclass and relrowsecurity);
 insert into api_rate_limit_events(scope,subject_hash,created_at) values('security-long','test',now()-interval '20 minutes');
 assert consume_api_rate_limit('security-short','test',300,1);
 assert not consume_api_rate_limit('security-long','test',3600,1),'short window erased login limits';
 assert not consume_api_rate_limit('security-short','test',300,1);
 assert not consume_api_rate_limit('security-short','test',null,1);
 assert not has_function_privilege('anon','public.consume_api_rate_limit(text,text,integer,integer)','execute');
end $$;
rollback;
