begin;
-- Review the active notice only. Previous quarantined versions remain in the
-- immutable history but must not inflate today's admin work queue.
create view port.current_quarantined_calls with(security_invoker=true) as
 select c.* from port.port_calls c join port.call_coverage d
 on d.artifact_id=c.artifact_id and d.reported_day=c.reported_day
 where c.quarantine_reason is not null;
grant select on port.current_quarantined_calls to authenticated;
commit;
