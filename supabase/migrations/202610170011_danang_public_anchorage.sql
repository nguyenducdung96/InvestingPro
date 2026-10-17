begin;
-- Official authority homepage links this HTTP public app (HTTPS is unavailable).
-- These are open anchorage observations, never inferred port arrivals/departures.
insert into port.call_source_registry values
 ('danang-open-anchorage','Đà Nẵng / Kỳ Hà–Cù Lao Chàm · vị trí neo','http://tttb.cangvuhanghaidanang.gov.vn/public-kh#/tra-cuu/ke_hoach/0/0/ViTriTauTaiCang','in_port','danang-open-anchorage/1.0.0');
commit;
