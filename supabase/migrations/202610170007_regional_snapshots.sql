begin;
-- Source snapshots may report only a day or omit the year. Preserve that precision.
insert into port.call_source_registry values
 ('cantho-tv','Trà Vinh','https://cangvuhanghaicantho.gov.vn/Index.aspx?kv=tv&page=vtttc','in_port','cantho-positions/1.0.0'),
 ('hcm-in-port','TP.HCM / Cái Mép–Thị Vải','https://cangvuhanghaitphcm.gov.vn/index.aspx?page=shipinport&cat=3106','in_port','hcm-positions/1.0.0'),
 ('quangninh-in-port','Quảng Ninh','https://kht1.cangvuhanghaiquangninh.gov.vn/vitritau.aspx','in_port','quangninh-positions/1.0.0'),
 ('hue-chanmay-in-port','Chân Mây','https://cangvuhanghaithuathienhue.gov.vn/index.aspx?cat=3130&page=news','in_port','hue-positions/1.0.0'),
 ('hue-thuanan-in-port','Thuận An','https://cangvuhanghaithuathienhue.gov.vn/index.aspx?page=news&cat=3131','in_port','hue-positions/1.0.0'),
 ('binhthuan-open-anchorage','Bình Thuận / Cà Ná · vị trí neo','http://123.25.223.242/web/guest/public-kh#/tra-cuu/ke_hoach/0/0/ViTriTauTaiCang','in_port','binhthuan-open-anchorage/1.0.0'),
 ('haiphong-in-port','Hải Phòng','https://csdltau.cangvuhaiphong.gov.vn/pages/position.aspx','in_port','haiphong-positions/1.0.0');
drop view port.current_quarantined_calls;
drop view port.published_port_calls;
drop view port.published_in_port_snapshots;
alter table port.port_calls add column time_day date;
alter table port.port_calls add column time_basis text not null default 'port_arrival' check(time_basis in ('port_arrival','anchorage_start'));
alter table port.port_calls add column time_precision text generated always as
 (case when occurred_at is not null then 'minute' when time_day is not null then 'day' else 'unknown' end) stored;
alter table port.port_calls drop constraint port_calls_check;
alter table port.port_calls add constraint call_time_required check(event_kind='in_port' or quarantine_reason is not null or occurred_at is not null);
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
  insert into port.port_calls(event_key,artifact_id,vessel_id,vessel_name,source_area,direction,occurred_at,reported_day,raw_time,dwt,row_number,quarantine_reason,event_kind,berth,time_day,time_basis)
  values(r->>'key',a,v,r->>'vessel_name',area,r->>'direction',(r->>'occurred_at')::timestamptz,(r->>'reported_day')::date,r->>'raw_time',(r->>'dwt')::numeric,(r->>'row_number')::integer,r->>'quarantine_reason',kind,r->>'berth',(r->>'time_day')::date,coalesce(r->>'time_basis','port_arrival'))on conflict do nothing;
  if found then n:=n+1;if r->>'quarantine_reason' is not null then q:=q+1;end if;end if;
 end loop;
 return jsonb_build_object('inserted',n,'quarantined',q,'artifact_id',a,'replayed',false);
end $$;
commit;
