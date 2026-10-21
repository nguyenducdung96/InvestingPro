begin;
-- The importer may read the same public totals/status as any visitor, not private versions.
grant select on port.tanvu_plan_days,port.tanvu_plan_runs to service_role;
commit;
