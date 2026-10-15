-- Pending issuer-document proposal; no source rights or relationship approval.
-- Requires hnx_registry.proposals.sql and 505_commercial_catalog.reviewed.sql.
-- Original HNX-hosted issuer PDF was read back from private R2 and SHA-256 matched.
begin;
do $$ begin
  if not exists(select 1 from port.terminals where id='e5a56736-c32e-55d8-a767-edcc97fb577f')
    or not exists(select 1 from catalog.companies where id='7b1b3668-9997-5148-a498-185c92e9ff55')
  then raise exception 'Reviewed terminal and pending VGR company prerequisites missing'; end if;
end $$;
insert into core.sources(id,code,name,owner,source_class,base_url,rights_status,rights_notes) values
('3b2d694e-a57a-58cc-a73c-377dabeaf180','vgr_annual_2025_research','Cảng Xanh VIP – Báo cáo thường niên 2025, chờ duyệt','Công ty Cổ phần Cảng Xanh VIP','official_company','https://www.vipgreenport.com.vn','to_verify','Tài liệu do doanh nghiệp phát hành, bản lưu trên HNX. Đã đọc trực quan trang PDF 1–2, chỉ đề xuất dữ kiện pháp nhân và mốc khai thác. Chưa xác minh quyền phát hành dữ liệu; không tự cấp phép website HNX hoặc doanh nghiệp. Không sao chép báo cáo lên giao diện công khai.')
on conflict do nothing;
insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,fetched_at,reporting_period_start,reporting_period_end,content_type,content_hash,raw_storage_key,parser_name,parser_version,quality_status) values
('b0df8b3b-f008-5c58-97f7-b04bc2bf8ef9','3b2d694e-a57a-58cc-a73c-377dabeaf180','https://owa.hnx.vn/ftp///cims/2026/3_W1/000000015939361_VI_BaoCaoThuongNien_2025_.pdf','https://owa.hnx.vn/ftp///cims/2026/3_W1/000000015939361_VI_BaoCaoThuongNien_2025_.pdf','VGR-annual-2025:review-p1-p2',null,'2026-10-14T20:32:16.118039+00:00','2025-01-01','2025-12-31','application/pdf','6ff3e575ed2beaf8c1789673ccdbf9e2838f50ff2faacb506a6e50d202fed0c6','catalog-evidence/sha256/6ff3e575ed2beaf8c1789673ccdbf9e2838f50ff2faacb506a6e50d202fed0c6','manual-visual-review','vgr-p1-p2-proposal-v1','incomplete')
on conflict do nothing;
-- Enrich only the unreviewed VGR identity, preserving reviewed entities on replay.
update catalog.entities set source_record_id='b0df8b3b-f008-5c58-97f7-b04bc2bf8ef9'
where id='7b1b3668-9997-5148-a498-185c92e9ff55' and quality_status='incomplete'
  and source_record_id='ef9b30fb-1e2f-55dc-b95a-f73f7ab5d261';
update catalog.companies set enterprise_id='0201579242',official_website='https://www.vipgreenport.com.vn'
where id='7b1b3668-9997-5148-a498-185c92e9ff55' and enterprise_id is null and official_website is null
  and exists(select 1 from catalog.entities e where e.id=companies.id and e.quality_status='incomplete' and e.source_record_id='b0df8b3b-f008-5c58-97f7-b04bc2bf8ef9');
insert into port.company_asset_interests(id,company_id,asset_id,asset_kind,interest_type,ownership_pct,valid_from,verification_source_id,source_record_id,evidence_excerpt,resolution_method,confidence) values
('41a892c9-3a96-5303-975c-708a861c9714','7b1b3668-9997-5148-a498-185c92e9ff55','e5a56736-c32e-55d8-a767-edcc97fb577f','terminal','operator',null,'2015-11-27','3b2d694e-a57a-58cc-a73c-377dabeaf180','b0df8b3b-f008-5c58-97f7-b04bc2bf8ef9','Đọc trực quan báo cáo thường niên VGR 2025, trang PDF 1–2: pháp nhân Cảng Xanh VIP, mã số doanh nghiệp 0201579242; doanh nghiệp nêu đưa VIP GREENPORT vào khai thác và đón chuyến tàu đầu tiên ngày 27/11/2015. Đối chiếu đúng bến Container Vip Greenport, mục 55 danh mục 505/QĐ-BXD; không gộp với bến Greenport mục 37. Chỉ đề xuất vai trò khai thác, không suy ra sở hữu 100% từ việc doanh nghiệp khai thác bến. Ngày bắt đầu dựa trên mốc lịch sử được báo cáo nêu rõ; không tự xác nhận mọi biến động sau kỳ báo cáo năm 2025. Chờ duyệt quyền sử dụng nguồn và quan hệ.','document_evidence',1)
on conflict do nothing;
commit;
