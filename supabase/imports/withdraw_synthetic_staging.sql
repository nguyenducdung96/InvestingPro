-- Reversible withdrawal of the explicitly synthetic fixture from public staging.
-- Preserve entities, reviewed decisions and audit history. Never delete user data.
begin;
update core.sources
set rights_status='blocked',
    rights_notes='TEST ONLY. Synthetic development fixture withdrawn from public staging on 2026-10-15; original records and review history retained. Not actual government evidence.'
where id='00000000-0000-0000-0000-000000000001'
  and code='synthetic_dev' and owner='TEST ONLY'
  and base_url='https://example.gov.vn'
  and rights_status <> 'blocked';
commit;
