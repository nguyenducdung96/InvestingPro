begin;
create table port.dossier_research_paths (
  id uuid primary key, dossier_id uuid not null references port.catalog_dossiers,
  child_ticker text not null, asset_name text not null,
  via jsonb not null check(jsonb_typeof(via)='array'),
  evidence_path jsonb not null check(jsonb_typeof(evidence_path)='array' and jsonb_array_length(evidence_path)>=2),
  berth_scope jsonb not null check(jsonb_typeof(berth_scope)='array'),
  decision text not null check(decision='requires_chain_and_period_review')
);
alter table port.dossier_research_paths enable row level security;
grant select,insert on port.dossier_research_paths to authenticated;
grant all on port.dossier_research_paths to service_role;
create policy admin_research_paths on port.dossier_research_paths for all to authenticated using(core.is_admin()) with check(core.is_admin());
create trigger preserve_research_path before update or delete on port.dossier_research_paths for each row execute function core.immutable_record();
create trigger audit_research_path after insert on port.dossier_research_paths for each row execute function core.audit_change();
create index research_path_dossier on port.dossier_research_paths(dossier_id);
commit;
