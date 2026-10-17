begin;
-- Fixed, free public endpoints only. Registry access does not assert a data licence.
create table port.call_source_registry (
 source_area text primary key, label text not null, source_url text not null unique,
 event_kind text not null check(event_kind in ('reported','in_port')), parser text not null
);
insert into port.call_source_registry values
 ('quangtri-cua-viet','Cửa Việt','https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2073&page=NEWS','reported','quangtri-notices/1.0.1'),
 ('quangtri-len-bang','Lèn Bảng','https://cangvuhanghaiquangtri.gov.vn/index.aspx?cat=2076&page=NEWS','reported','lenbang-notices/1.0.0'),
 ('cantho-ct','Cần Thơ','https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=ct&page=vtttc','in_port','cantho-positions/1.0.0'),
 ('cantho-hg','Hậu Giang','https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=hg&page=vtttc','in_port','cantho-positions/1.0.0'),
 ('cantho-st','Mỹ Thới','https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=st&page=vtttc','in_port','cantho-positions/1.0.0');
alter table port.call_source_registry enable row level security;
grant select on port.call_source_registry to anon,authenticated;
create policy public_call_sources on port.call_source_registry for select to anon,authenticated using(true);
alter table port.call_artifacts add column source_area text not null default 'quangtri-cua-viet' references port.call_source_registry;
alter table port.call_artifacts add column event_kind text not null default 'reported' check(event_kind in ('reported','in_port'));
alter table port.call_artifacts drop constraint call_artifacts_raw_sha256_key;
alter table port.call_artifacts add unique(source_area,raw_sha256,parser_version);
alter table port.port_calls drop constraint port_calls_source_area_check;
alter table port.port_calls add foreign key(source_area) references port.call_source_registry;
alter table port.port_calls add column event_kind text not null default 'reported' check(event_kind in ('reported','in_port'));
alter table port.port_calls add column berth text;
drop view port.current_quarantined_calls;
drop view port.published_port_calls;
drop view port.call_coverage;
-- A dated notice is replaced within its source, never by another area's notice.
-- Snapshots replace the whole previous snapshot, including disappeared vessels.
create view port.call_coverage as
 with candidates as (
 select a.*,d.value as notice_day,
 row_number() over(partition by a.source_area,case when a.event_kind='in_port' then '*' else d.value end order by a.fetched_at desc,a.imported_at desc,a.id desc) as position
 from port.call_artifacts a,jsonb_array_elements_text(a.reported_days) d)
 select a.notice_day::date reported_day,a.id artifact_id,a.fetched_at,a.parser_version,
 (select count(*)::int from port.port_calls c where c.artifact_id=a.id and c.reported_day=a.notice_day::date and c.quarantine_reason is not null) quarantined,
 a.source_area,a.event_kind from candidates a where a.position=1;
create view port.published_port_calls as
 select distinct on(c.event_key) c.*,a.source_url,a.raw_sha256,a.fetched_at,a.parser_version,v.identity_confidence
 from port.port_calls c join port.call_coverage d on d.artifact_id=c.artifact_id and d.reported_day=c.reported_day
 join port.call_artifacts a on a.id=c.artifact_id join port.vessels v on v.id=c.vessel_id
 where c.quarantine_reason is null and c.event_kind='reported'
 order by c.event_key,a.fetched_at desc,a.imported_at desc;
create view port.published_in_port_snapshots as
 select c.*,a.source_url,a.raw_sha256,a.fetched_at,a.parser_version,v.identity_confidence
 from port.port_calls c join port.call_coverage d on d.artifact_id=c.artifact_id and d.reported_day=c.reported_day
 join port.call_artifacts a on a.id=c.artifact_id join port.vessels v on v.id=c.vessel_id
 where c.quarantine_reason is null and c.event_kind='in_port';
create view port.current_quarantined_calls with(security_invoker=true) as
 select c.* from port.port_calls c join port.call_coverage d on d.artifact_id=c.artifact_id and d.reported_day=c.reported_day
 where c.quarantine_reason is not null;
grant select on port.published_port_calls,port.published_in_port_snapshots,port.call_coverage to anon,authenticated;
grant select on port.current_quarantined_calls to authenticated;
create or replace function port.import_port_calls(p_bundle jsonb,p_rows jsonb,p_days jsonb,p_parser text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a uuid; v uuid; r jsonb; n integer:=0; q integer:=0; area text; kind text; expected_parser text;
begin
 if not core.is_admin() or auth.uid() is null then raise exception 'Admin import required';end if;
 select source_area,event_kind,parser into area,kind,expected_parser from port.call_source_registry where source_url=p_bundle->>'source_url';
 if area is null or p_parser<>expected_parser or p_bundle->>'raw_sha256'<>encode(sha256(convert_to(p_bundle->>'raw_text','UTF8')),'hex')
 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>5000 or jsonb_array_length(p_days) not between 1 and 100
 or (p_bundle->>'fetched_at')::timestamptz>now()+interval '5 minutes'
 then raise exception 'Invalid evidence bundle';end if;
 if exists(select 1 from port.call_artifacts where source_area=area and raw_sha256=p_bundle->>'raw_sha256' and parser_version=p_parser)then return jsonb_build_object('inserted',0,'replayed',true);end if;
 insert into port.call_artifacts(source_url,raw_sha256,raw_text,fetched_at,imported_by,parser_version,reported_days,source_area,event_kind)
 values(p_bundle->>'source_url',p_bundle->>'raw_sha256',p_bundle->>'raw_text',(p_bundle->>'fetched_at')::timestamptz,auth.uid(),p_parser,p_days,area,kind) returning id into a;
 for r in select * from jsonb_array_elements(p_rows) loop
  if not p_days ? (r->>'reported_day') or r->>'key' !~ '^[a-f0-9]{64}$' or r->>'identity_key'<>'observation:'||(r->>'key') or r->>'identity_confidence'<>'source_observation' then raise exception 'Invalid observation';end if;
  insert into port.vessels(identity_key,name,identity_confidence)values(r->>'identity_key',r->>'vessel_name','source_observation')on conflict do nothing;
  select id into v from port.vessels where identity_key=r->>'identity_key';
  insert into port.port_calls(event_key,artifact_id,vessel_id,vessel_name,source_area,direction,occurred_at,reported_day,raw_time,dwt,row_number,quarantine_reason,event_kind,berth)
  values(r->>'key',a,v,r->>'vessel_name',area,r->>'direction',(r->>'occurred_at')::timestamptz,(r->>'reported_day')::date,r->>'raw_time',(r->>'dwt')::numeric,(r->>'row_number')::integer,r->>'quarantine_reason',kind,r->>'berth')on conflict do nothing;
  if found then n:=n+1;if r->>'quarantine_reason' is not null then q:=q+1;end if;end if;
 end loop;
 return jsonb_build_object('inserted',n,'quarantined',q,'artifact_id',a,'replayed',false);
end $$;
commit;
