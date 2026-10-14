-- Explicit opt-in only, disabled in supabase/config.toml. NEVER production facts.
-- Before executing this file in a dev/test session:
-- select set_config('app.environment','development',false);
begin;
do $$ begin
  if coalesce(current_setting('app.environment',true),'') not in ('development','test') then
    raise exception 'Synthetic catalog seed requires explicit dev/test environment';
  end if;
end $$;
insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes)
values('00000000-0000-0000-0000-000000000001','synthetic_dev','Synthetic development evidence','TEST ONLY','official_government','https://example.gov.vn','approved','TEST ONLY. No actual government evidence.') on conflict do nothing;
insert into core.source_records(id,source_id,source_url,canonical_url,external_id,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status)
values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','https://example.gov.vn/test','https://example.gov.vn/test','synthetic',now(),'application/json',repeat('a',64),'test/synthetic.json','synthetic','test-only','verified') on conflict do nothing;
insert into catalog.entities(id,kind,slug,name,source_record_id,quality_status) values
('00000000-0000-0000-0000-000000000003','port_authority','synthetic-authority','Synthetic authority','00000000-0000-0000-0000-000000000002','verified'),
('00000000-0000-0000-0000-000000000004','port','synthetic-port','Synthetic port','00000000-0000-0000-0000-000000000002','verified'),
('00000000-0000-0000-0000-000000000005','terminal','synthetic-terminal','Synthetic terminal','00000000-0000-0000-0000-000000000002','verified'),
('00000000-0000-0000-0000-000000000006','berth','synthetic-berth','Synthetic berth','00000000-0000-0000-0000-000000000002','verified'),
('00000000-0000-0000-0000-000000000007','company','synthetic-company','Synthetic company','00000000-0000-0000-0000-000000000002','verified') on conflict do nothing;
insert into port.port_authorities(id) values('00000000-0000-0000-0000-000000000003') on conflict do nothing;
insert into port.ports(id,authority_id) values('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003') on conflict do nothing;
insert into port.terminals(id,port_id) values('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000004') on conflict do nothing;
insert into port.berths(id,terminal_id) values('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000005') on conflict do nothing;
insert into catalog.companies(id,legal_name) values('00000000-0000-0000-0000-000000000007','Synthetic company') on conflict do nothing;
-- Relationships intentionally pending: verification must go through an admin.
insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,ownership_pct,valid_from,valid_to,verification_source_id,source_record_id,evidence_excerpt,resolution_method,confidence)
values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000005','terminal','ownership',null,'2026-01-01',null,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Synthetic relationship for review UI tests only','document_evidence',1) on conflict do nothing;
commit;
