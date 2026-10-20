begin;
-- Explicit owner decision: release independently composed numeric facts, not PDFs
-- or a declaration that the issuer licensed redistribution of its documents.
create table port.throughput_publication_policy (
 id uuid not null unique default gen_random_uuid(),
 asset_code text primary key check(asset_code='tan_vu'),
 enabled boolean not null default false,
 basis text not null check(basis='structured-facts-only-v1'),
 decision_note text not null check(length(trim(decision_note))>=40),
 updated_at timestamptz not null default now()
);
create table port.throughput_publications (
 id uuid not null unique default gen_random_uuid(),
 fact_id uuid primary key references port.monthly_throughput,
 supersedes_id uuid references port.monthly_throughput,
 asset_code text not null, period date not null, publication_month date not null,
 cargo_tonnes bigint, container_teu bigint, pdf_page integer not null,
 source_url text not null, source_sha256 text not null, fetched_at timestamptz not null,
 publication_basis text not null, publication_note text not null,
 publication_actor text not null, published_at timestamptz not null
);
alter table port.throughput_publication_policy enable row level security;
alter table port.throughput_publications enable row level security;
grant select on port.throughput_publication_policy,port.throughput_publications to anon,authenticated,service_role;
grant insert,update on port.throughput_publication_policy to authenticated;
grant insert on port.throughput_publications to authenticated,service_role;
create policy admin_throughput_policy on port.throughput_publication_policy for all to authenticated using(core.is_admin()) with check(core.is_admin());
create policy public_throughput_policy on port.throughput_publication_policy for select to anon,authenticated using(enabled);
create policy admin_throughput_publications on port.throughput_publications for all to authenticated using(core.is_admin()) with check(core.is_admin());
create function port.newsletter_source_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from core.sources where code='php-monthly-newsletters' and rights_status<>'blocked')
$$;
revoke all on function port.newsletter_source_allowed() from public;
grant execute on function port.newsletter_source_allowed() to anon,authenticated,service_role;
create policy public_throughput_publications on port.throughput_publications for select to anon,authenticated using(
 exists(select 1 from port.throughput_publication_policy p where p.asset_code=throughput_publications.asset_code and p.enabled) and port.newsletter_source_allowed()
);
create function port.guard_throughput_publication() returns trigger language plpgsql set search_path='' as $$
declare f port.monthly_throughput; r core.source_records;
begin
 if not coalesce((core.is_admin() and auth.uid() is not null) or auth.jwt()->>'role'='service_role' or current_user='postgres',false) then raise exception 'Authorized factual publisher required'; end if;
 select * into f from port.monthly_throughput where id=new.fact_id;
 select * into r from core.source_records where id=f.source_record_id;
 if f.id is null or r.id is null or r.raw_storage_key is null or r.content_hash is null or f.verification_status='rejected' or r.source_id<>'3edee246-fd07-5cf0-8c6c-13c9657e2cfb'::uuid
 or r.raw_storage_key<>'catalog-evidence/sha256/'||r.content_hash
 or not exists(select 1 from port.newsletter_documents d where d.source_url=r.source_url and d.latest_sha=r.content_hash)
 or not exists(select 1 from port.throughput_publication_policy p where p.asset_code=f.asset_code and p.enabled)
 or not port.newsletter_source_allowed() then raise exception 'Current archived facts and enabled publication policy required'; end if;
 if length(trim(coalesce(new.publication_note,''))) not between 40 and 4000 then raise exception 'Factual publication note required'; end if;
 new.supersedes_id:=f.supersedes_id;new.asset_code:=f.asset_code;new.period:=f.period;new.publication_month:=f.publication_month;
 new.cargo_tonnes:=f.cargo_tonnes;new.container_teu:=f.container_teu;new.pdf_page:=f.pdf_page;
 new.source_url:=r.source_url;new.source_sha256:=r.content_hash;new.fetched_at:=r.fetched_at;
 new.publication_basis:='structured-facts-only-v1';new.published_at:=now();
 new.publication_actor:=coalesce(auth.uid()::text,auth.jwt()->>'role',current_user);
 return new;
end $$;
create trigger guard_throughput_publication before insert on port.throughput_publications for each row execute function port.guard_throughput_publication();
create trigger immutable_throughput_publication before update or delete on port.throughput_publications for each row execute function core.immutable_record();
create trigger audit_throughput_publication after insert on port.throughput_publications for each row execute function core.audit_change();
create trigger audit_throughput_policy after insert or update on port.throughput_publication_policy for each row execute function core.audit_change();
create function port.publish_throughput_facts(p_ids uuid[],p_note text) returns jsonb language plpgsql set search_path='' as $$
declare n integer;
begin
 if not coalesce((core.is_admin() and auth.uid() is not null) or auth.jwt()->>'role'='service_role' or current_user='postgres',false) then raise exception 'Authorized factual publisher required'; end if;
 if p_ids is null or cardinality(p_ids) not between 1 and 160 then raise exception 'Bounded fact ids required'; end if;
 if not exists(select 1 from port.throughput_publication_policy where asset_code='tan_vu' and enabled) then return jsonb_build_object('published',0,'enabled',false); end if;
 if exists(select 1 from unnest(p_ids) x where not exists(select 1 from port.monthly_throughput f where f.id=x)) then raise exception 'Unknown fact'; end if;
 insert into port.throughput_publications(fact_id,publication_note) select distinct x,p_note from unnest(p_ids) x on conflict(fact_id) do nothing;
 get diagnostics n=row_count;
 return jsonb_build_object('published',n,'enabled',true,'basis','structured-facts-only-v1');
end $$;
revoke all on function port.publish_throughput_facts(uuid[],text) from public,anon;
grant execute on function port.publish_throughput_facts(uuid[],text) to authenticated,service_role;
create or replace view port.published_monthly_throughput with(security_invoker=true) as
 select f.*,r.source_url,r.content_hash as source_sha256,r.fetched_at,d.last_attempt as source_checked_at,d.error as source_error
 from port.monthly_throughput f join core.source_records r on r.id=f.source_record_id
 join port.newsletter_documents d on d.source_url=r.source_url and d.latest_sha=r.content_hash
 where f.verification_status='verified'
 and not exists(select 1 from port.monthly_throughput c where c.supersedes_id=f.id and c.verification_status='verified')
 and not exists(select 1 from port.throughput_publications p where p.fact_id=f.id)
 union all
 select p.fact_id,p.asset_code,p.period,p.publication_month,p.cargo_tonnes,p.container_teu,null::uuid,p.pdf_page,
 'Independently composed numeric facts'::text,'editorial_published'::text,null::uuid,p.published_at,
 'Numeric facts with source citations; no PDF redistribution'::text,null::uuid,
 p.source_url,p.source_sha256,p.fetched_at,d.last_attempt,d.error
 from port.throughput_publications p join port.newsletter_documents d on d.source_url=p.source_url and d.latest_sha=p.source_sha256
 where exists(select 1 from port.throughput_publication_policy policy where policy.asset_code=p.asset_code and policy.enabled) and port.newsletter_source_allowed()
 and not exists(select 1 from port.throughput_publications c where c.supersedes_id=p.fact_id);
commit;
