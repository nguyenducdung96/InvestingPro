begin;
-- Owner-authorized publication of structured public schedules, never actual calls.
create table port.tanvu_plan_versions (
 id uuid primary key default gen_random_uuid(), report_day date not null,
 source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 source_url text not null, fetched_at timestamptz not null, parser_version text not null,
 events jsonb not null check(jsonb_typeof(events)='array'),
 source_empty_sections jsonb not null default '[]',
 unique(report_day,source_sha256,parser_version)
);
create trigger immutable_tanvu_plan_version before update or delete on port.tanvu_plan_versions
 for each row execute function core.immutable_record();
alter table port.tanvu_plan_versions enable row level security;
revoke all on port.tanvu_plan_versions from public,anon,authenticated;

create table port.tanvu_plan_days (
 report_day date primary key, version_id uuid references port.tanvu_plan_versions(id),
 source_sha256 text, source_url text, parser_version text,
 last_success timestamptz, last_attempt timestamptz not null, source_error text,
 arrival_rows integer, departure_rows integer, arrival_dwt numeric, departure_dwt numeric,
 arrival_dwt_missing integer, departure_dwt_missing integer,
 ambiguous_groups integer, source_empty_sections jsonb not null default '[]'
);
alter table port.tanvu_plan_days enable row level security;
grant select on port.tanvu_plan_days to anon,authenticated;
create policy public_tanvu_schedule_numbers on port.tanvu_plan_days for select to anon,authenticated using(true);
create table port.tanvu_plan_runs (
 id text primary key, checked_at timestamptz not null, through_day date not null,
 status text not null check(status in ('running','success','failed')),
 requested_days integer not null, parsed_days integer not null, error text
);
alter table port.tanvu_plan_runs enable row level security;
grant select on port.tanvu_plan_runs to anon,authenticated;
create policy public_tanvu_run_status on port.tanvu_plan_runs for select to anon,authenticated using(true);

create function port.record_tanvu_plan_run(p_run jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Schedule importer required'; end if;
 if length(coalesce(p_run->>'id','')) not between 1 and 120
  or coalesce(p_run->>'status','') not in ('running','success','failed')
  or (p_run->>'requested_days')::int not between 1 and 20000
  or (p_run->>'parsed_days')::int not between 0 and (p_run->>'requested_days')::int
  or p_run->>'checked_at' is null or p_run->>'through_day' is null
  then raise exception 'Invalid schedule run'; end if;
 insert into port.tanvu_plan_runs(id,checked_at,through_day,status,requested_days,parsed_days,error)
 values(p_run->>'id',(p_run->>'checked_at')::timestamptz,(p_run->>'through_day')::date,p_run->>'status',
 (p_run->>'requested_days')::int,(p_run->>'parsed_days')::int,left(p_run->>'error',300))
 on conflict(id) do update set checked_at=excluded.checked_at,status=excluded.status,error=excluded.error
 where excluded.checked_at>=port.tanvu_plan_runs.checked_at;
end $$;

create function port.import_tanvu_plan_days(p_days jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d jsonb; e jsonb; v_id uuid; v_day date; v_fetched timestamptz; n int:=0; a int; r int;
 ad numeric; rd numeric; am int; rm int; ambiguous int; old_events jsonb;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Schedule importer required'; end if;
 if p_days is null or jsonb_typeof(p_days)<>'array' or jsonb_array_length(p_days) not between 1 and 31 then raise exception 'Invalid schedule batch'; end if;
 for d in select * from jsonb_array_elements(p_days) loop
  v_day:=(d->>'date')::date;v_fetched:=(d->>'fetched_at')::timestamptz;
  if v_day is null or v_day<'2025-01-01' or v_day>=(now() at time zone 'Asia/Ho_Chi_Minh')::date
    or v_fetched is null or v_fetched>now()+interval '5 minutes'
    or coalesce(d->>'source_url','') !~ '^https://csdltau[.]cangvuhaiphong[.]gov[.]vn/pages/ship_plan[.]aspx[?]d=-?[0-9]+$'
    or coalesce(d->>'status','') not in ('parsed','failed') then raise exception 'Invalid schedule source or day'; end if;
  if d->>'status'='failed' then
   insert into port.tanvu_plan_days(report_day,last_attempt,source_error)
   values(v_day,v_fetched,left(coalesce(d->>'error','Source failed'),300))
   on conflict(report_day) do update set last_attempt=excluded.last_attempt,source_error=excluded.source_error
   where excluded.last_attempt>=port.tanvu_plan_days.last_attempt;
   continue;
  end if;
  if coalesce(d->>'sha256','') !~ '^[a-f0-9]{64}$'
   or coalesce(d->>'parser_version','') !~ '^haiphong-plan-pilot/[0-9]+[.][0-9]+[.][0-9]+$'
   or jsonb_typeof(d->'events') is distinct from 'array' or jsonb_array_length(d->'events')>500
   or jsonb_typeof(d->'source_empty_sections') is distinct from 'array'
   or exists(select 1 from jsonb_array_elements_text(d->'source_empty_sections') x where x not in ('Vao','Roi','DiChuyen'))
   then raise exception 'Invalid schedule evidence'; end if;
  for e in select * from jsonb_array_elements(d->'events') loop
   if exists(select 1 from jsonb_object_keys(e) k where k not in ('direction','vessel_name','planned_time','dwt','from_berth','to_berth'))
    or coalesce(e->>'direction','') not in ('arrival','departure')
    or length(trim(coalesce(e->>'vessel_name',''))) not between 1 and 200
    or length(coalesce(e->>'from_berth','')) not between 1 and 300
    or length(coalesce(e->>'to_berth','')) not between 1 and 300
    or coalesce(e->>'planned_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or (case e->>'direction' when 'arrival' then e->>'to_berth' else e->>'from_berth' end) is distinct from 'TAN VU'
    or jsonb_typeof(e->'dwt') is null or jsonb_typeof(e->'dwt') not in ('number','null')
    or (e->>'dwt')::numeric<0 or (e->>'dwt')::numeric>1000000
    then raise exception 'Invalid Tan Vu schedule row'; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(d->'events'))<>(select count(distinct jsonb_build_array(x->>'direction',x->>'vessel_name',x->>'planned_time',x->>'from_berth',x->>'to_berth')) from jsonb_array_elements(d->'events') x)
   then raise exception 'Duplicate schedule key'; end if;
  select count(*) into ambiguous from (select x->>'direction',x->>'vessel_name',x->>'from_berth',x->>'to_berth' from jsonb_array_elements(d->'events') x group by 1,2,3,4 having count(*)>1) g;
  insert into port.tanvu_plan_versions(report_day,source_sha256,source_url,fetched_at,parser_version,events,source_empty_sections)
  values(v_day,d->>'sha256',d->>'source_url',v_fetched,d->>'parser_version',d->'events',d->'source_empty_sections')
  on conflict(report_day,source_sha256,parser_version) do nothing returning id into v_id;
  if v_id is null then
   select id,events into v_id,old_events from port.tanvu_plan_versions where report_day=v_day and source_sha256=d->>'sha256' and parser_version=d->>'parser_version';
   if old_events is distinct from d->'events' then raise exception 'Same evidence/parser has changed rows'; end if;
  else n:=n+1; end if;
  select count(*) filter(where x->>'direction'='arrival'), count(*) filter(where x->>'direction'='departure'),
   coalesce(sum((x->>'dwt')::numeric) filter(where x->>'direction'='arrival'),0),
   coalesce(sum((x->>'dwt')::numeric) filter(where x->>'direction'='departure'),0),
   count(*) filter(where x->>'direction'='arrival' and x->>'dwt' is null),
   count(*) filter(where x->>'direction'='departure' and x->>'dwt' is null)
  into a,r,ad,rd,am,rm from jsonb_array_elements(d->'events') x;
  insert into port.tanvu_plan_days(report_day,version_id,source_sha256,source_url,parser_version,last_success,last_attempt,
    arrival_rows,departure_rows,arrival_dwt,departure_dwt,arrival_dwt_missing,departure_dwt_missing,ambiguous_groups,source_empty_sections)
  values(v_day,v_id,d->>'sha256',d->>'source_url',d->>'parser_version',v_fetched,v_fetched,
    a,r,case when am=0 then ad end,case when rm=0 then rd end,am,rm,ambiguous,d->'source_empty_sections')
  on conflict(report_day) do update set version_id=excluded.version_id,source_sha256=excluded.source_sha256,
   source_url=excluded.source_url,parser_version=excluded.parser_version,last_success=excluded.last_success,
   last_attempt=excluded.last_attempt,source_error=null,arrival_rows=excluded.arrival_rows,departure_rows=excluded.departure_rows,
   arrival_dwt=excluded.arrival_dwt,departure_dwt=excluded.departure_dwt,arrival_dwt_missing=excluded.arrival_dwt_missing,
   departure_dwt_missing=excluded.departure_dwt_missing,ambiguous_groups=excluded.ambiguous_groups,source_empty_sections=excluded.source_empty_sections
  where excluded.last_attempt>=port.tanvu_plan_days.last_attempt;
 end loop;
 return jsonb_build_object('versions_inserted',n,'days_received',jsonb_array_length(p_days),'semantics','authority_published_plan');
end $$;

create function port.tanvu_plan_events(p_day date) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('report_day',d.report_day,'source_url',d.source_url,'source_sha256',d.source_sha256,
 'fetched_at',d.last_success,'parser_version',d.parser_version,'semantics','authority_published_plan','events',v.events)
 from port.tanvu_plan_days d join port.tanvu_plan_versions v on v.id=d.version_id where d.report_day=p_day
$$;
revoke all on function port.import_tanvu_plan_days(jsonb),port.record_tanvu_plan_run(jsonb) from public,anon,authenticated;
grant execute on function port.import_tanvu_plan_days(jsonb),port.record_tanvu_plan_run(jsonb) to service_role;
revoke all on function port.tanvu_plan_events(date) from public;
grant execute on function port.tanvu_plan_events(date) to anon,authenticated;
notify pgrst,'reload schema';
commit;
