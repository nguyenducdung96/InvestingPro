begin;
-- A report-period observation is not an effective ownership interval.
create table port.catalog_dossiers (
  id uuid primary key, company_id uuid not null references catalog.companies,
  ticker text not null, reporting_period_end date not null,
  source_record_id uuid not null references core.source_records,
  reviewed_pages integer[] not null check(cardinality(reviewed_pages)>0),
  review_outcome text not null check(review_outcome in ('reported_assets','no_assertable_assets')),
  review_note text not null check(length(trim(review_note))>0),
  gaps jsonb not null check(jsonb_typeof(gaps)='array'),
  scope_version text not null, unique(company_id,reporting_period_end,scope_version)
);
create table port.reported_asset_observations (
  id uuid primary key, dossier_id uuid not null references port.catalog_dossiers,
  company_id uuid not null references catalog.companies,
  asset_id uuid references catalog.entities, asset_name text not null check(length(trim(asset_name))>0),
  asset_kind text not null check(asset_kind in ('terminal','berth','river_port','icd','port')),
  reported_role text not null check(length(trim(reported_role))>0),
  via jsonb not null check(jsonb_typeof(via)='array'),
  berth_scope jsonb not null check(jsonb_typeof(berth_scope)='array'),
  reporting_period_end date not null, relationship_started_on date,
  date_basis text, source_record_id uuid not null references core.source_records,
  supporting_evidence jsonb not null default '[]' check(jsonb_typeof(supporting_evidence)='array'),
  evidence_pages integer[] not null check(cardinality(evidence_pages)>0),
  evidence_note text not null check(length(trim(evidence_note))>0),
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),
  reviewed_by uuid, reviewed_at timestamptz, review_note text,
  supersedes_observation_id uuid references port.reported_asset_observations,
  check(relationship_started_on is null or length(trim(coalesce(date_basis,'')))>0)
);
create function port.guard_reported_observation() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and old.verification_status<>'pending' then raise exception 'Reviewed observation is immutable; append a correction'; end if;
  if not exists(select 1 from port.catalog_dossiers d where d.id=new.dossier_id and d.company_id=new.company_id and d.reporting_period_end=new.reporting_period_end) then raise exception 'Observation/dossier scope mismatch'; end if;
  if new.verification_status<>'pending' then
    if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required'; end if;
    if length(trim(coalesce(new.review_note,'')))<20 then raise exception 'Review note required'; end if;
    new.reviewed_by:=auth.uid(); new.reviewed_at:=now();
  else new.reviewed_by:=null; new.reviewed_at:=null; new.review_note:=null;
  end if;
  if new.verification_status='verified' then
    if not exists(select 1 from core.source_records r join core.sources s on s.id=r.source_id where r.id=new.source_record_id and r.quality_status='verified' and s.rights_status='approved') then raise exception 'Verified evidence and approved rights required'; end if;
    if not exists(select 1 from catalog.entities where id=new.company_id and quality_status='verified') then raise exception 'Verified company required'; end if;
    if new.asset_id is not null and not exists(select 1 from catalog.entities where id=new.asset_id and quality_status='verified') then raise exception 'Verified asset required'; end if;
  end if;
  return new;
end $$;
create trigger guard_reported before insert or update on port.reported_asset_observations for each row execute function port.guard_reported_observation();
create trigger immutable_dossier before update or delete on port.catalog_dossiers for each row execute function core.immutable_record();
create trigger audit_dossier after insert on port.catalog_dossiers for each row execute function core.audit_change();
create trigger audit_reported after insert or update on port.reported_asset_observations for each row execute function core.audit_change();
create index reported_company_period on port.reported_asset_observations(company_id,reporting_period_end,id);
alter table port.catalog_dossiers enable row level security;
alter table port.reported_asset_observations enable row level security;
grant select on port.catalog_dossiers,port.reported_asset_observations to anon,authenticated;
grant insert,update on port.catalog_dossiers,port.reported_asset_observations to authenticated;
grant all on port.catalog_dossiers,port.reported_asset_observations to service_role;
create policy admin_dossiers on port.catalog_dossiers for all to authenticated using(core.is_admin()) with check(core.is_admin());
create policy admin_observations on port.reported_asset_observations for all to authenticated using(core.is_admin()) with check(core.is_admin());
create policy public_reported on port.reported_asset_observations for select to anon,authenticated using(
  verification_status='verified' and exists(select 1 from core.source_records r join core.sources s on s.id=r.source_id where r.id=source_record_id and r.quality_status='verified' and s.rights_status='approved')
  and exists(select 1 from catalog.entities e where e.id=company_id and e.quality_status='verified')
  and (asset_id is null or exists(select 1 from catalog.entities e where e.id=asset_id and e.quality_status='verified'))
);
create view port.published_asset_observations with(security_invoker=true) as
select o.* from port.reported_asset_observations o where o.verification_status='verified'
and not exists(select 1 from port.reported_asset_observations c where c.supersedes_observation_id=o.id and c.verification_status='verified');
grant select on port.published_asset_observations to anon,authenticated,service_role;
create function port.review_reported_observation(p_id uuid,p_decision text,p_note text) returns jsonb
language plpgsql set search_path='' as $$
declare o port.reported_asset_observations; replacement uuid;
begin
  if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required'; end if;
  if p_decision not in ('verified','rejected') or p_decision is null or length(trim(coalesce(p_note,''))) not between 20 and 4000 then raise exception 'Valid decision and review note required'; end if;
  select * into o from port.reported_asset_observations where id=p_id for update;
  if not found or o.verification_status<>'pending' then raise exception 'Pending observation required'; end if;
  if p_decision='verified' then
    select r.id into replacement from core.source_records r join core.source_records original on original.id=o.source_record_id
      where r.source_id=original.source_id and r.content_hash=original.content_hash and r.quality_status='verified' order by r.fetched_at desc,r.id limit 1;
    if replacement is null then raise exception 'Review original evidence first'; end if;
  end if;
  update port.reported_asset_observations set source_record_id=coalesce(replacement,source_record_id),verification_status=p_decision,review_note=p_note where id=p_id returning * into o;
  return to_jsonb(o);
end $$;
revoke all on function port.review_reported_observation(uuid,text,text) from public,anon;
grant execute on function port.review_reported_observation(uuid,text,text) to authenticated;
commit;
