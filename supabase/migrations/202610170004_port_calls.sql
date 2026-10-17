begin;
-- The first adapter covers the source's Cua Viet area. No guessed mapping to a
-- terminal or to a differently scoped canonical port is created.
create table port.call_artifacts (
 id uuid primary key default gen_random_uuid(), source_url text not null,
 raw_sha256 text not null unique check(raw_sha256 ~ '^[a-f0-9]{64}$'),
 raw_text text not null check(octet_length(raw_text) between 1 and 5000000),
 fetched_at timestamptz not null, imported_at timestamptz not null default now(),
 imported_by uuid not null, parser_version text not null,
 reported_days jsonb not null check(jsonb_typeof(reported_days)='array')
);
create table port.vessels (
 id uuid primary key default gen_random_uuid(), identity_key text not null unique,
 name text not null, imo text check(imo ~ '^[0-9]{7}$'),
 identity_confidence text not null check(identity_confidence='source_observation')
);
create table port.port_calls (
 id uuid primary key default gen_random_uuid(), event_key text not null,
 artifact_id uuid not null references port.call_artifacts,
 vessel_id uuid not null references port.vessels, vessel_name text not null,
 source_area text not null check(source_area='quangtri-cua-viet'),
 direction text not null check(direction in ('arrival','departure')),
 occurred_at timestamptz, reported_day date not null, raw_time text not null,
 dwt numeric check(dwt>=0 and dwt<=600000), row_number integer not null check(row_number>0),
 quarantine_reason text, unique(artifact_id,event_key),
 check(quarantine_reason is not null or occurred_at is not null)
);
create index on port.port_calls(occurred_at,id);
create index on port.port_calls(event_key);
alter table port.call_artifacts enable row level security;
alter table port.vessels enable row level security;
alter table port.port_calls enable row level security;
grant select on port.call_artifacts,port.vessels,port.port_calls to authenticated;
grant all on port.call_artifacts,port.vessels,port.port_calls to service_role;
create policy admin_call_artifacts on port.call_artifacts for select to authenticated using(core.is_admin());
create policy admin_vessels on port.vessels for select to authenticated using(core.is_admin());
create policy admin_port_calls on port.port_calls for select to authenticated using(core.is_admin());
create trigger immutable_call_artifacts before update or delete on port.call_artifacts for each row execute function core.immutable_record();
create trigger immutable_vessels before update or delete on port.vessels for each row execute function core.immutable_record();
create trigger immutable_port_calls before update or delete on port.port_calls for each row execute function core.immutable_record();
create trigger audit_call_artifacts after insert on port.call_artifacts for each row execute function core.audit_change();
-- Public facts exclude source HTML, crew, cargo, agency and private storage.
-- Latest full dated notice replaces an older notice, including removed rows.
create view port.published_port_calls as
 with latest_days as (
  select distinct on (d.value) d.value as notice_day,a.id from port.call_artifacts a,
  jsonb_array_elements_text(a.reported_days) d order by d.value,a.fetched_at desc,a.imported_at desc,a.id desc
 )
 select distinct on(c.event_key) c.*,a.source_url,a.raw_sha256,a.fetched_at,a.parser_version,
 v.identity_confidence from port.port_calls c join latest_days l on l.id=c.artifact_id and l.notice_day=c.reported_day::text
 join port.call_artifacts a on a.id=c.artifact_id join port.vessels v on v.id=c.vessel_id
 where c.quarantine_reason is null order by c.event_key,a.fetched_at desc,a.imported_at desc;
grant select on port.published_port_calls to anon,authenticated;
create view port.call_coverage as
 select distinct on (d.value) d.value::date reported_day,a.id artifact_id,a.fetched_at,a.parser_version,
 (select count(*)::int from port.port_calls c where c.artifact_id=a.id and c.reported_day=d.value::date and c.quarantine_reason is not null) quarantined
 from port.call_artifacts a,jsonb_array_elements_text(a.reported_days) d
 order by d.value,a.fetched_at desc,a.imported_at desc,a.id desc;
grant select on port.call_coverage to anon,authenticated;
create function port.import_port_calls(p_bundle jsonb,p_rows jsonb,p_days jsonb,p_parser text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a uuid; v uuid; r jsonb; n integer:=0; q integer:=0;
begin
 if not core.is_admin() or auth.uid() is null then raise exception 'Admin import required';end if;
 if p_bundle->>'source_url'<>'https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2073&page=NEWS'
 or p_parser<>'quangtri-notices/1.0.0' or p_bundle->>'raw_sha256'<>encode(sha256(convert_to(p_bundle->>'raw_text','UTF8')),'hex')
 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>5000 or jsonb_array_length(p_days) not between 1 and 100
 or (p_bundle->>'fetched_at')::timestamptz>now()+interval '5 minutes'
 then raise exception 'Invalid evidence bundle';end if;
 if exists(select 1 from port.call_artifacts where raw_sha256=p_bundle->>'raw_sha256')then return jsonb_build_object('inserted',0,'replayed',true);end if;
 insert into port.call_artifacts(source_url,raw_sha256,raw_text,fetched_at,imported_by,parser_version,reported_days)
 values(p_bundle->>'source_url',p_bundle->>'raw_sha256',p_bundle->>'raw_text',(p_bundle->>'fetched_at')::timestamptz,auth.uid(),p_parser,p_days) returning id into a;
 for r in select * from jsonb_array_elements(p_rows) loop
  if not p_days ? (r->>'reported_day') or r->>'key' !~ '^[a-f0-9]{64}$' or r->>'identity_key'<>'observation:'||(r->>'key') or r->>'identity_confidence'<>'source_observation' then raise exception 'Invalid observation';end if;
  insert into port.vessels(identity_key,name,identity_confidence)values(r->>'identity_key',r->>'vessel_name','source_observation')on conflict do nothing;
  select id into v from port.vessels where identity_key=r->>'identity_key';
  insert into port.port_calls(event_key,artifact_id,vessel_id,vessel_name,source_area,direction,occurred_at,reported_day,raw_time,dwt,row_number,quarantine_reason)
  values(r->>'key',a,v,r->>'vessel_name','quangtri-cua-viet',r->>'direction',(r->>'occurred_at')::timestamptz,(r->>'reported_day')::date,r->>'raw_time',(r->>'dwt')::numeric,(r->>'row_number')::integer,r->>'quarantine_reason')on conflict do nothing;
  if found then n:=n+1;if r->>'quarantine_reason' is not null then q:=q+1;end if;end if;
 end loop;
 return jsonb_build_object('inserted',n,'quarantined',q,'artifact_id',a,'replayed',false);
end $$;
revoke all on function port.import_port_calls(jsonb,jsonb,jsonb,text) from public,anon;
grant execute on function port.import_port_calls(jsonb,jsonb,jsonb,text) to authenticated;
commit;
