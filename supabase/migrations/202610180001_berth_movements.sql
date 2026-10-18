begin;
insert into port.call_source_registry values
 ('danang-berth-reported','Cảng Đà Nẵng · cập/rời cầu container','https://danangport.com/tra-cuu-tau-container/','reported','danang-berth-reports/1.0.0');
alter table port.port_calls drop constraint port_calls_time_basis_check;
alter table port.port_calls add constraint port_calls_time_basis_check
 check(time_basis in ('port_arrival','anchorage_start','berth_movement'));
-- Keep the movement scope visible to downstream SQL consumers as well as the API.
create or replace view port.published_port_calls as
 select distinct on(c.event_key) c.*,a.source_url,a.raw_sha256,a.fetched_at,a.parser_version,v.identity_confidence,
 case when c.time_basis='berth_movement' then 'berth' else 'port' end as movement_scope
 from port.port_calls c join port.call_coverage d on d.artifact_id=c.artifact_id and d.reported_day=c.reported_day
 join port.call_artifacts a on a.id=c.artifact_id join port.vessels v on v.id=c.vessel_id
 where c.quarantine_reason is null and c.event_kind='reported'
 order by c.event_key,a.fetched_at desc,a.imported_at desc;
commit;
