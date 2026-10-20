begin;
-- Scheduler may ingest pending evidence only; this never approves source rights.
create function port.import_newsletter_intake(p_documents jsonb,p_records jsonb,p_facts jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare n integer;
begin
 if not coalesce((core.is_admin() and auth.uid() is not null) or auth.jwt()->>'role'='service_role',false) then raise exception 'Authorized newsletter importer required'; end if;
 if p_documents is null or p_records is null or p_facts is null or jsonb_typeof(p_documents)<>'array' or jsonb_typeof(p_records)<>'array' or jsonb_typeof(p_facts)<>'array' or jsonb_array_length(p_documents)>80 or jsonb_array_length(p_records)>160 or jsonb_array_length(p_facts)>160 then raise exception 'Invalid intake size'; end if;
 if exists(select 1 from jsonb_array_elements(p_documents) d where coalesce(d->>'source_url','') !~ '^https://haiphongport[.]com[.]vn/FileUpload/Documents/[^?#]+[.]pdf$' or coalesce(d->>'latest_sha','') !~ '^[a-f0-9]{64}$') then raise exception 'Invalid source scope'; end if;
 if exists(select 1 from jsonb_array_elements(p_records) r where coalesce(r->>'source_url','') !~ '^https://haiphongport[.]com[.]vn/FileUpload/Documents/[^?#]+[.]pdf$' or coalesce(r->>'content_hash','') !~ '^[a-f0-9]{64}$' or coalesce(r->>'raw_storage_key','')<>'catalog-evidence/sha256/'||(r->>'content_hash')) then raise exception 'Archived source metadata required'; end if;
 insert into core.sources(id,code,name,owner,source_class,base_url,rights_notes) values
 ('3edee246-fd07-5cf0-8c6c-13c9657e2cfb','php-monthly-newsletters','Cảng Hải Phòng · bản tin tháng','Cảng Hải Phòng','official_company','https://haiphongport.com.vn','Pending source-rights review; extraction and private archive do not approve publication.') on conflict do nothing;
 insert into port.newsletter_documents(source_url,latest_sha,last_success,last_attempt,error)
 select source_url,latest_sha,last_success,last_attempt,error from jsonb_to_recordset(p_documents) as d(source_url text,latest_sha text,last_success timestamptz,last_attempt timestamptz,error text)
 on conflict(source_url) do update set latest_sha=excluded.latest_sha,last_success=excluded.last_success,last_attempt=excluded.last_attempt,error=excluded.error where excluded.last_attempt>=port.newsletter_documents.last_attempt;
 insert into core.source_records(id,source_id,source_url,canonical_url,external_id,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status)
 select id,'3edee246-fd07-5cf0-8c6c-13c9657e2cfb'::uuid,source_url,source_url,source_url,fetched_at,'application/pdf',content_hash,raw_storage_key,'php-newsletters','1.0.0','incomplete'
 from jsonb_to_recordset(p_records) as r(id uuid,source_url text,fetched_at timestamptz,content_hash text,raw_storage_key text) on conflict do nothing;
 if exists(select 1 from jsonb_to_recordset(p_facts) as f(source_record_id uuid) left join core.source_records r on r.id=f.source_record_id where r.source_id is distinct from '3edee246-fd07-5cf0-8c6c-13c9657e2cfb'::uuid) then raise exception 'Fact/source scope mismatch'; end if;
 insert into port.monthly_throughput(id,asset_code,period,publication_month,cargo_tonnes,container_teu,source_record_id,pdf_page,extraction_note)
 select id,'tan_vu',period,publication_month,cargo_tonnes,container_teu,source_record_id,1,extraction_note
 from jsonb_to_recordset(p_facts) as f(id uuid,period date,publication_month date,cargo_tonnes bigint,container_teu bigint,source_record_id uuid,extraction_note text) on conflict(id) do nothing;
 get diagnostics n=row_count;
 return jsonb_build_object('facts_inserted',n,'documents_received',jsonb_array_length(p_documents),'publication_performed',false);
end $$;
revoke all on function port.import_newsletter_intake(jsonb,jsonb,jsonb) from public,anon;
grant execute on function port.import_newsletter_intake(jsonb,jsonb,jsonb) to authenticated,service_role;
commit;
