begin;
-- Independently composed factual editions have their own explicit publication
-- decision. They do not approve source documents, API redistribution or pending
-- effective ownership records. Original review states remain immutable.
create table port.editorial_catalog_editions (
 id uuid primary key default gen_random_uuid(),
 content_hash text not null unique check(content_hash ~ '^[a-f0-9]{64}$'),
 published_at timestamptz not null default now(), published_by uuid not null,
 review_note text not null check(length(trim(review_note)) between 40 and 4000),
 basis text not null check(basis='structured-facts-only-v1'),
 entries jsonb not null check(jsonb_typeof(entries)='array')
);
alter table port.editorial_catalog_editions enable row level security;
grant select on port.editorial_catalog_editions to anon,authenticated;
grant all on port.editorial_catalog_editions to service_role;
create policy public_editorial_editions on port.editorial_catalog_editions for select to anon,authenticated using(true);
create trigger immutable_editorial_edition before update or delete on port.editorial_catalog_editions for each row execute function core.immutable_record();
create trigger audit_editorial_edition after insert on port.editorial_catalog_editions for each row execute function core.audit_change();
create function port.publish_editorial_catalog(p_id text,p_entries jsonb,p_note text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e jsonb; a jsonb; n integer;
begin
 if not core.is_admin() or auth.uid() is null then raise exception 'Admin publication required'; end if;
 if jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)<>41 then raise exception 'Exact editorial scope required'; end if;
 if (select count(distinct x->>'ticker') from jsonb_array_elements(p_entries) x)<>41 then raise exception 'Duplicate ticker'; end if;
 for e in select * from jsonb_array_elements(p_entries) loop
  if exists(select 1 from jsonb_object_keys(e) k where k not in ('ticker','company_id','name','market_as_reported','period','source','assets','research_paths')) then raise exception 'Non-editorial fields'; end if;
  if not exists(select 1 from port.catalog_dossiers d join core.source_records r on r.id=d.source_record_id where d.company_id=(e->>'company_id')::uuid and d.ticker=e->>'ticker' and d.reporting_period_end=(e->>'period')::date and r.content_hash=e->'source'->>'sha256' and r.source_url=e->'source'->>'url' and to_jsonb(d.reviewed_pages)=e->'source'->'pages') then raise exception 'Unknown evidence/scope'; end if;
  if jsonb_typeof(e->'assets')<>'array' or jsonb_typeof(e->'research_paths')<>'array' or length(e->>'name') not between 1 and 300 or e->'source'->>'url' !~ '^https://' then raise exception 'Invalid public dossier'; end if;
  if exists(select 1 from jsonb_object_keys(e->'source') k where k not in ('url','sha256','pages')) then raise exception 'Private evidence fields'; end if;
  if jsonb_array_length(e->'assets')<>(select count(*) from port.reported_asset_observations o where o.company_id=(e->>'company_id')::uuid and o.reporting_period_end=(e->>'period')::date) or (select count(distinct x) from jsonb_array_elements(e->'assets') x)<>jsonb_array_length(e->'assets') then raise exception 'Incomplete or duplicate facts'; end if;
  for a in select * from jsonb_array_elements(e->'assets') loop
   if exists(select 1 from jsonb_object_keys(a) k where k not in ('name','kind','role','via','berth_scope','scope_group','started_on','documented_date','date_basis')) then raise exception 'Non-editorial asset fields'; end if;
   if not exists(select 1 from port.reported_asset_observations o where o.company_id=(e->>'company_id')::uuid and o.reporting_period_end=(e->>'period')::date and o.asset_name=a->>'name' and o.asset_kind=a->>'kind' and o.reported_role=a->>'role' and o.via=a->'via' and o.berth_scope=a->'berth_scope' and o.scope_group=a->>'scope_group' and o.relationship_started_on is not distinct from (a->>'started_on')::date and o.documented_date is not distinct from (a->>'documented_date')::date) then raise exception 'Unmatched editorial fact'; end if;
  end loop;
  for a in select * from jsonb_array_elements(e->'research_paths') loop
   if exists(select 1 from jsonb_object_keys(a) k where k not in ('ticker','asset')) or not exists(select 1 from port.dossier_research_paths p join port.catalog_dossiers d on d.id=p.dossier_id where d.company_id=(e->>'company_id')::uuid and d.reporting_period_end=(e->>'period')::date and p.child_ticker=a->>'ticker' and p.asset_name=a->>'asset') then raise exception 'Invalid research reference'; end if;
  end loop;
 end loop;
 if exists(select 1 from port.editorial_catalog_editions where content_hash=p_id and entries is distinct from p_entries) then raise exception 'Edition identity conflict'; end if;
 insert into port.editorial_catalog_editions(content_hash,published_by,review_note,basis,entries) values(p_id,auth.uid(),p_note,'structured-facts-only-v1',p_entries) on conflict do nothing;
 get diagnostics n=row_count;
 return jsonb_build_object('inserted',n,'companies',41);
end $$;
revoke all on function port.publish_editorial_catalog(text,jsonb,text) from public,anon;
grant execute on function port.publish_editorial_catalog(text,jsonb,text) to authenticated;
commit;
