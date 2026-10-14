-- Expand-only Slice 1. No production seed, connector, metric or port-call tables.
begin;
create schema if not exists core;
create schema if not exists catalog;
create schema if not exists port;

create function core.is_admin() returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
$$;
create table core.sources (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  name text not null, owner text not null, source_class text not null check (source_class in ('official_government','official_regulator','official_exchange','official_statistics','official_port_authority','official_company','licensed_commercial')),
  base_url text not null check (base_url ~ '^https?://'),
  rights_status text not null default 'to_verify' check (rights_status in ('to_verify','approved','blocked')),
  rights_notes text not null, terms_url text, robots_checked_at timestamptz,
  verified_at timestamptz, created_at timestamptz not null default now()
);
create table core.source_records (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references core.sources,
  source_url text not null check (source_url ~ '^https?://'),
  canonical_url text not null check (canonical_url ~ '^https?://' and canonical_url !~* '(jsessionid|[?&](session|token|access_token)=)'),
  external_id text not null, published_at timestamptz, updated_at timestamptz,
  fetched_at timestamptz not null, reporting_period_start date, reporting_period_end date,
  content_type text not null, content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  raw_storage_key text not null check (length(raw_storage_key)>0),
  parser_name text not null, parser_version text not null,
  quality_status text not null check (quality_status in ('verified','preliminary','estimated','incomplete')),
  supersedes_source_record_id uuid references core.source_records,
  created_at timestamptz not null default now(),
  unique(source_id,external_id,content_hash), unique(id,source_id),
  check (reporting_period_end is null or reporting_period_start <= reporting_period_end)
);
create function core.immutable_record() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Evidence and audit records are immutable; append a correction'; end $$;
create trigger immutable_source_record before update or delete on core.source_records for each row execute function core.immutable_record();

create table catalog.entities (
  id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('port_authority','port','terminal','berth','company')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), name text not null check(length(trim(name))>0),
  source_record_id uuid not null references core.source_records,
  quality_status text not null default 'incomplete' check (quality_status in ('verified','preliminary','estimated','incomplete')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(kind,slug), unique(id,kind)
);
create table port.port_authorities (
  id uuid primary key, kind text not null default 'port_authority' check(kind='port_authority'), region text,
  foreign key(id,kind) references catalog.entities(id,kind)
);
create table port.ports (
  id uuid primary key, kind text not null default 'port' check(kind='port'), authority_id uuid not null references port.port_authorities,
  latitude numeric check(latitude between -90 and 90), longitude numeric check(longitude between -180 and 180),
  foreign key(id,kind) references catalog.entities(id,kind)
);
create table port.terminals (
  id uuid primary key, kind text not null default 'terminal' check(kind='terminal'), port_id uuid not null references port.ports, terminal_type text,
  foreign key(id,kind) references catalog.entities(id,kind)
);
create table port.berths (
  id uuid primary key, kind text not null default 'berth' check(kind='berth'), terminal_id uuid not null references port.terminals,
  foreign key(id,kind) references catalog.entities(id,kind)
);
create index ports_authority on port.ports(authority_id,id);
create index terminals_port on port.terminals(port_id,id);
create index berths_terminal on port.berths(terminal_id,id);
create table catalog.companies (
  id uuid primary key, kind text not null default 'company' check(kind='company'), legal_name text not null,
  enterprise_id text unique, official_website text check(official_website ~ '^https?://'), ir_url text check(ir_url ~ '^https?://'),
  foreign key(id,kind) references catalog.entities(id,kind)
);
create table catalog.company_listings (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references catalog.companies,
  ticker text not null check(ticker ~ '^[A-Z0-9]{1,12}$'), exchange text not null check(exchange in ('HOSE','HNX','UPCOM','OTC')),
  valid_from date not null, valid_to date, source_record_id uuid not null references core.source_records,
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),
  verified_at timestamptz, verified_by uuid, unique(exchange,ticker,valid_from),
  check(valid_to is null or valid_to>valid_from),
  check(verification_status <> 'verified' or (verified_at is not null and verified_by is not null))
);

create table port.company_asset_interests (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references catalog.companies,
  asset_id uuid not null, asset_kind text not null check(asset_kind in ('port','terminal','berth')),
  interest_type text not null check(interest_type in ('ownership','operator','joint_venture','concession','lease','indirect')),
  ownership_pct numeric(7,4) check(ownership_pct between 0 and 100),
  valid_from date not null, valid_to date,
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),
  verification_source_id uuid not null references core.sources,
  source_record_id uuid not null,
  evidence_excerpt text not null check(length(trim(evidence_excerpt))>0),
  resolution_method text not null check(resolution_method in ('official_identifier','document_evidence','fuzzy_name')),
  confidence numeric not null check(confidence between 0 and 1),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, reviewed_by uuid, reviewed_at timestamptz, review_note text,
  supersedes_interest_id uuid references port.company_asset_interests,
  foreign key(asset_id,asset_kind) references catalog.entities(id,kind),
  foreign key(source_record_id,verification_source_id) references core.source_records(id,source_id),
  check(valid_to is null or valid_to>valid_from),
  check(verification_status <> 'verified' or (resolution_method <> 'fuzzy_name' and reviewed_by is not null and reviewed_at is not null and length(trim(review_note))>0))
);
create table port.entity_mappings (
  id uuid primary key default gen_random_uuid(), entity_id uuid not null references catalog.entities,
  verification_source_id uuid not null references core.sources, source_record_id uuid not null,
  external_id text not null, external_name text not null,
  valid_from date not null, valid_to date,
  resolution_method text not null check(resolution_method in ('official_identifier','document_evidence','fuzzy_name')),
  confidence numeric not null check(confidence between 0 and 1),
  evidence_excerpt text not null check(length(trim(evidence_excerpt))>0),
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid,
  reviewed_by uuid, reviewed_at timestamptz, review_note text,
  supersedes_mapping_id uuid references port.entity_mappings,
  foreign key(source_record_id,verification_source_id) references core.source_records(id,source_id),
  check(valid_to is null or valid_to>valid_from),
  check(verification_status <> 'verified' or (resolution_method <> 'fuzzy_name' and reviewed_by is not null and reviewed_at is not null and length(trim(review_note))>0))
);
create index interests_company_period on port.company_asset_interests(company_id,valid_from,valid_to) where verification_status='verified';
create index interests_review on port.company_asset_interests(created_at,id) where verification_status='pending';
create index mappings_review on port.entity_mappings(created_at,id) where verification_status='pending';
create index mappings_external on port.entity_mappings(verification_source_id,external_id);

create table core.audit_events (
  id uuid primary key default gen_random_uuid(), table_name text not null, record_id uuid not null,
  actor_id uuid, action text not null, before_row jsonb, after_row jsonb, created_at timestamptz not null default now()
);
create trigger immutable_audit before update or delete on core.audit_events for each row execute function core.immutable_record();
create function core.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into core.audit_events(table_name,record_id,actor_id,action,before_row,after_row)
  values(tg_table_schema||'.'||tg_table_name,coalesce(new.id,old.id),auth.uid(),tg_op,
    case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
  return coalesce(new,old);
end $$;

-- Serialize decisions on the same asset / source, then check half-open intervals.
-- Multiple companies may own or operate the same asset; only duplicate claims conflict.
create function port.guard_mapping() returns trigger language plpgsql set search_path = '' as $$
declare has_overlap boolean;
begin
  if tg_op='UPDATE' and old.verification_status <> 'pending' then
    raise exception 'Reviewed mapping is immutable; append a superseding decision';
  end if;
  new.updated_at := now();
  if tg_op='INSERT' then new.created_by := auth.uid(); end if;
  if new.verification_status <> 'pending' then
    if not core.is_admin() then raise exception 'Admin review required' using errcode='42501'; end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
    if new.review_note is null or length(trim(new.review_note))=0 then raise exception 'Review note required'; end if;
  else
    new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
  end if;
  if new.verification_status='verified' then
    if new.resolution_method='fuzzy_name' then raise exception 'Fuzzy matching cannot be verified'; end if;
    if not exists(select 1 from core.sources s join core.source_records r on r.source_id=s.id where r.id=new.source_record_id and s.rights_status='approved' and r.quality_status='verified') then raise exception 'Verified evidence and approved rights required'; end if;
    if tg_table_name='company_asset_interests' then
      perform id from catalog.entities where id=new.asset_id for update;
      select exists(select 1 from port.company_asset_interests m where m.id<>new.id and m.company_id=new.company_id and m.asset_id=new.asset_id and m.interest_type=new.interest_type and m.verification_status='verified' and daterange(m.valid_from,m.valid_to,'[)') && daterange(new.valid_from,new.valid_to,'[)') and not exists(select 1 from port.company_asset_interests x where x.supersedes_interest_id=m.id and x.verification_status='verified')) into has_overlap;
      if new.supersedes_interest_id is not null and not exists(select 1 from port.company_asset_interests m where m.id=new.supersedes_interest_id and m.id<>new.id and m.verification_status='verified' and not exists(select 1 from port.company_asset_interests x where x.supersedes_interest_id=m.id and x.verification_status='verified') and m.company_id=new.company_id and m.asset_id=new.asset_id and m.interest_type=new.interest_type) then raise exception 'Invalid correction target'; end if;
      -- A correction may overlap precisely the row it replaces.
      if has_overlap and not (new.supersedes_interest_id is not null and not exists(select 1 from port.company_asset_interests m where m.id<>new.id and m.id<>new.supersedes_interest_id and m.company_id=new.company_id and m.asset_id=new.asset_id and m.interest_type=new.interest_type and m.verification_status='verified' and daterange(m.valid_from,m.valid_to,'[)') && daterange(new.valid_from,new.valid_to,'[)') and not exists(select 1 from port.company_asset_interests x where x.supersedes_interest_id=m.id and x.verification_status='verified'))) then raise exception 'Overlapping verified interest'; end if;
    else
      perform id from core.sources where id=new.verification_source_id for update;
      if new.supersedes_mapping_id is not null and not exists(select 1 from port.entity_mappings m where m.id=new.supersedes_mapping_id and m.id<>new.id and m.verification_status='verified' and not exists(select 1 from port.entity_mappings x where x.supersedes_mapping_id=m.id and x.verification_status='verified') and m.verification_source_id=new.verification_source_id and m.external_id=new.external_id) then raise exception 'Invalid correction target'; end if;
      select exists(select 1 from port.entity_mappings m where m.id<>new.id and m.id is distinct from new.supersedes_mapping_id and m.verification_source_id=new.verification_source_id and m.external_id=new.external_id and m.verification_status='verified' and daterange(m.valid_from,m.valid_to,'[)') && daterange(new.valid_from,new.valid_to,'[)') and not exists(select 1 from port.entity_mappings x where x.supersedes_mapping_id=m.id and x.verification_status='verified')) into has_overlap;
      if has_overlap then raise exception 'Overlapping verified external mapping'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger guard_interest before insert or update on port.company_asset_interests for each row execute function port.guard_mapping();
create trigger guard_entity_mapping before insert or update on port.entity_mappings for each row execute function port.guard_mapping();

-- RLS is the security boundary, including direct PostgREST requests.
grant usage on schema core,catalog,port to anon,authenticated,service_role;
grant execute on function core.is_admin() to anon,authenticated,service_role;
do $$ declare t text; s text; begin
  foreach s in array array['core','catalog','port'] loop
    for t in select tablename from pg_tables where schemaname=s loop
      execute format('alter table %I.%I enable row level security',s,t);
      execute format('grant select on %I.%I to anon,authenticated',s,t);
      execute format('grant all on %I.%I to service_role',s,t);
      if t <> 'audit_events' then
        execute format('grant insert,update on %I.%I to authenticated',s,t);
        execute format('create policy admin_write on %I.%I for all to authenticated using (core.is_admin()) with check (core.is_admin())',s,t);
        execute format('create trigger audit_change after insert or update on %I.%I for each row execute function core.audit_change()',s,t);
      else
        execute format('create policy admin_read on %I.%I for select to authenticated using (core.is_admin())',s,t);
      end if;
    end loop;
  end loop;
end $$;
create policy public_sources on core.sources for select to anon,authenticated using(rights_status='approved');
create policy public_records on core.source_records for select to anon,authenticated using(quality_status='verified' and exists(select 1 from core.sources s where s.id=source_id and s.rights_status='approved'));
create policy public_entities on catalog.entities for select to anon,authenticated using(quality_status='verified' and exists(select 1 from core.source_records r where r.id=source_record_id));
create policy public_companies on catalog.companies for select to anon,authenticated using(exists(select 1 from catalog.entities e where e.id=companies.id));
create policy public_listings on catalog.company_listings for select to anon,authenticated using(verification_status='verified' and exists(select 1 from core.source_records r where r.id=source_record_id) and exists(select 1 from catalog.companies c where c.id=company_id));
do $$ declare t text; begin foreach t in array array['port_authorities','ports','terminals','berths'] loop
  execute format('create policy public_catalog on port.%I for select to anon,authenticated using(exists(select 1 from catalog.entities e where e.id=%I.id))',t,t);
end loop; end $$;
create policy public_interests on port.company_asset_interests for select to anon,authenticated using(verification_status='verified' and exists(select 1 from core.source_records r where r.id=source_record_id) and exists(select 1 from catalog.entities e where e.id=asset_id) and exists(select 1 from catalog.companies c where c.id=company_id));
create policy public_mappings on port.entity_mappings for select to anon,authenticated using(verification_status='verified' and exists(select 1 from core.source_records r where r.id=source_record_id) and exists(select 1 from catalog.entities e where e.id=entity_id));
revoke all on function core.audit_change() from public;
revoke all on function core.immutable_record() from public;
revoke all on function port.guard_mapping() from public;
commit;
