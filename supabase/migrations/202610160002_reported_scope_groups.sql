begin;
alter table port.reported_asset_observations add column scope_group text not null default 'main'
check(scope_group in ('main','supplementary_industrial_base'));
-- Rebuild the view because PostgreSQL expands SELECT * at view creation.
create or replace view port.published_asset_observations with(security_invoker=true) as
select o.* from port.reported_asset_observations o where o.verification_status='verified'
and not exists(select 1 from port.reported_asset_observations c where c.supersedes_observation_id=o.id and c.verification_status='verified');
commit;
