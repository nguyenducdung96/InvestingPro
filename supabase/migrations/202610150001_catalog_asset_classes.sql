-- Expand Slice 1 for river ports and separately identifiable inland depots.
-- No operating facts, ingestion connector or financial tables.
begin;
alter table catalog.entities drop constraint entities_kind_check;
alter table catalog.entities add constraint entities_kind_check
  check(kind in ('port_authority','port','terminal','berth','company','icd'));
alter table port.company_asset_interests drop constraint company_asset_interests_asset_kind_check;
alter table port.company_asset_interests add constraint company_asset_interests_asset_kind_check
  check(asset_kind in ('port','terminal','berth','icd'));
alter table port.ports alter column authority_id drop not null;
alter table port.ports add column port_category text not null default 'unknown'
  check(port_category in ('marine','river','unknown'));
alter table port.ports add constraint marine_authority_required
  check(port_category <> 'marine' or authority_id is not null);
create table port.icds (
  id uuid primary key,
  kind text not null default 'icd' check(kind='icd'),
  address text,
  foreign key(id,kind) references catalog.entities(id,kind)
);
alter table port.icds enable row level security;
grant select on port.icds to anon,authenticated;
grant insert,update on port.icds to authenticated;
grant all on port.icds to service_role;
create policy admin_write on port.icds for all to authenticated
  using(core.is_admin()) with check(core.is_admin());
create policy public_catalog on port.icds for select to anon,authenticated
  using(exists(select 1 from catalog.entities e where e.id=icds.id));
create trigger audit_change after insert or update on port.icds
  for each row execute function core.audit_change();
-- Forward repair: keep the added tables/columns until dependent data has been
-- migrated; never drop evidence or rewrite a reviewed interest as a rollback.
commit;
