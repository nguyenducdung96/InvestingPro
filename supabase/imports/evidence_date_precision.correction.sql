-- Append corrections: document issue dates are not precise publication timestamps.
-- Never UPDATE immutable evidence or a reviewed mapping.
begin;
insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status,supersedes_source_record_id)
select case id when '10000000-0000-0000-0000-000000000003' then '10000000-0000-0000-0000-000000000031'::uuid when '10000000-0000-0000-0000-000000000004' then '10000000-0000-0000-0000-000000000032'::uuid else '10000000-0000-0000-0000-000000000033'::uuid end,
source_id,source_url,canonical_url,external_id||':publication-precision-v2',null,fetched_at,content_type,content_hash,raw_storage_key,parser_name,'hp-catalog-v2',quality_status,id
from core.source_records where id in ('10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000015') and published_at is not null on conflict do nothing;
update catalog.entities e set source_record_id=c.id,updated_at=now() from core.source_records c where c.id in ('10000000-0000-0000-0000-000000000031','10000000-0000-0000-0000-000000000032','10000000-0000-0000-0000-000000000033') and c.supersedes_source_record_id=e.source_record_id;
insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,ownership_pct,valid_from,valid_to,verification_source_id,source_record_id,evidence_excerpt,resolution_method,confidence,supersedes_interest_id)
select '10000000-0000-0000-0000-000000000034',i.company_id,i.asset_id,i.asset_kind,i.interest_type,i.ownership_pct,i.valid_from,i.valid_to,i.verification_source_id,c.id,
replace(i.evidence_excerpt,'cargo throughput','sản lượng hàng hóa thực tế')||' Bổ sung nguồn v2: chưa biết thời điểm công bố chính xác; giữ published_at null. Ngày hiệu lực quyết định được lưu riêng trong mapping.',i.resolution_method,i.confidence,i.id
from port.company_asset_interests i join core.source_records c on c.id='10000000-0000-0000-0000-000000000033' where i.id='10000000-0000-0000-0000-000000000023' on conflict do nothing;
insert into port.entity_mappings(id,entity_id,verification_source_id,source_record_id,external_id,external_name,valid_from,valid_to,resolution_method,confidence,evidence_excerpt,supersedes_mapping_id)
select '10000000-0000-0000-0000-000000000035',m.entity_id,m.verification_source_id,c.id,m.external_id,m.external_name,m.valid_from,m.valid_to,m.resolution_method,m.confidence,m.evidence_excerpt||' Nguồn v2 giữ published_at null do chưa có thời điểm công bố chính xác.',m.id
from port.entity_mappings m join core.source_records c on c.id='10000000-0000-0000-0000-000000000032' where m.id='10000000-0000-0000-0000-000000000013' on conflict do nothing;
commit;
