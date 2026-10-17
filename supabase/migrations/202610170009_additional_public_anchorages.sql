begin;
-- Preserve GT and validate complete paginated resources; retain old immutable versions.
update port.call_source_registry set parser=source_area||'/1.1.0'
 where source_area in ('binhthuan-open-anchorage','thaibinh-open-anchorage','kiengiang-open-anchorage');
insert into port.call_source_registry values
 ('dongnai-open-anchorage','Đồng Nai · vị trí neo','http://123.25.204.166/web/guest/public-kh#/tra-cuu/ke_hoach/0/0/ViTriTauTaiCang','in_port','dongnai-open-anchorage/1.0.0'),
 ('hatinh-open-anchorage','Hà Tĩnh / Quảng Bình · vị trí neo','http://116.98.104.198/web/guest/public-kh#/tra-cuu/ke_hoach/0/0/ViTriTauTaiCang','in_port','hatinh-open-anchorage/1.0.0');
commit;
