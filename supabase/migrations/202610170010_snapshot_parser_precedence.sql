begin;
-- Reparse identical bytes with the current parser without allowing older content
-- to displace a more recently fetched, different source response.
create or replace view port.call_coverage as
 with content_times as (
  select a.*,max(a.fetched_at) over(partition by a.source_area,a.raw_sha256) as content_fetched_at
  from port.call_artifacts a
 ), candidates as (
  select a.*,d.value as notice_day,
   row_number() over(partition by a.source_area,case when a.event_kind='in_port' then '*' else d.value end
    order by case when a.event_kind='in_port' then a.content_fetched_at else a.fetched_at end desc,
     (a.event_kind='in_port' and a.parser_version=s.parser) desc,a.fetched_at desc,a.imported_at desc,a.id desc) as position
  from content_times a join port.call_source_registry s on s.source_area=a.source_area,
   jsonb_array_elements_text(a.reported_days) d
 )
 select a.notice_day::date reported_day,a.id artifact_id,a.fetched_at,a.parser_version,
  (select count(*)::int from port.port_calls c where c.artifact_id=a.id and c.reported_day=a.notice_day::date and c.quarantine_reason is not null) quarantined,
  a.source_area,a.event_kind from candidates a where a.position=1;
commit;
