begin;
alter table port.reported_asset_observations add column documented_date date;
-- Preserve permission/certificate dates without calling them commencement dates.
-- Existing reviewed decisions are never rewritten.
update port.reported_asset_observations set documented_date=relationship_started_on,
  relationship_started_on=case when date_basis='reported_first_vessel_and_operation' then relationship_started_on else null end
where verification_status='pending' and relationship_started_on is not null;
create or replace view port.published_asset_observations with(security_invoker=true) as
select o.* from port.reported_asset_observations o where o.verification_status='verified'
and not exists(select 1 from port.reported_asset_observations c where c.supersedes_observation_id=o.id and c.verification_status='verified');
commit;
