import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
const row=(period:string,value:number)=>({id:`test-${period}`,asset_code:'tan_vu',period:`${period}-01`,publication_month:'2026-09-01',cargo_tonnes:value,container_teu:100,source_url:'https://haiphongport.com.vn/FileUpload/Documents/test-only.pdf',source_sha256:'a'.repeat(64),pdf_page:1,fetched_at:'2026-10-20T00:00:00Z',source_checked_at:'2026-10-21T00:00:00Z',source_error:null});
test('PHP reads changed database responses without rebuild; filters, nulls, sources and mobile remain usable',async({page,request},info)=>{
 const write=async(data:object[])=>request.post('http://127.0.0.1:54329/__throughput',{data});
 await write([row('2025-05',1000),row('2026-05',2000),row('2026-06',3000)]);
 const edition=JSON.parse(readFileSync('docs/catalog-review/php-berth-scope-20261021.json','utf8'));
 await request.post('http://127.0.0.1:54329/__berths',{data:[edition]});
 await page.goto('/companies/PHP');
 const berthScope=page.getByRole('region',{name:'Các bến liên quan PHP',exact:true});
 await expect(berthScope.getByRole('heading',{name:'HTIT (Lạch Huyện 3–4)',exact:true})).toBeVisible();
 expect((await(await request.get('/api/v1/companies/PHP/berths')).json()).data.entries).toHaveLength(4);
 await berthScope.getByText('Quan hệ và nguồn',{exact:true}).last().click();
 await expect(berthScope.getByText('Nhãn bến Cảng vụ: HTIT')).toBeVisible();

 const region=page.getByRole('region',{name:'Sản lượng Tân Vũ',exact:true});
 await expect(region.getByRole('heading',{name:'Sản lượng hàng hóa doanh nghiệp công bố'})).toBeVisible();
 const chart=region.getByRole('figure');
 await expect(chart.getByText('Đơn vị: tấn hàng',{exact:true})).toBeVisible();
 await expect(chart.locator('svg g[role="img"]')).toHaveCount(12);
 expect(await chart.locator('svg g[role="img"]').nth(4).locator('.plan-bar-current').getAttribute('height')).not.toBeNull();
 await expect(chart.locator('svg g[role="img"]').nth(4)).toHaveAttribute('aria-label',/2026 2.000 tấn hàng; 2025 1.000 tấn hàng/);
 await expect(region.getByRole('table')).not.toBeVisible();
 await expect(region.getByText('3.000',{exact:true}).first()).toBeVisible();
 expect((await(await request.get('/api/v1/companies/PHP/throughput')).json()).months).toHaveLength(3);
 await write([row('2025-05',1000),row('2026-05',2500),row('2026-06',4000)]);
 await page.reload();await expect(region.getByText('4.000',{exact:true}).first()).toBeVisible();
 await region.getByText(/Xem bảng số liệu, YoY và nguồn/).click();
 await expect(region.getByText('+150%',{exact:true})).toBeVisible();
 await region.getByText('Bản tin · trang 1').first().click();
 await expect(region.getByRole('link',{name:'Mở PDF chính thức'}).first()).toHaveAttribute('href',/haiphongport/);
 for(const theme of ['light','dark']){
  await page.getByLabel('Giao diện',{exact:true}).selectOption(theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/php-throughput-${theme}-${info.project.name}.png`,fullPage:true});
 }
 await region.getByLabel('Chỉ tiêu',{exact:true}).selectOption('container_teu');await region.getByRole('button',{name:'Xem số liệu'}).click();
 await expect(chart.getByText('Đơn vị: TEU',{exact:true})).toBeVisible();
 await expect(chart.locator('svg g[role="img"]').nth(4)).toHaveAttribute('aria-label',/2026 100 TEU; 2025 100 TEU/);
 await region.getByLabel('Năm',{exact:true}).selectOption('all');await region.getByRole('button',{name:'Xem số liệu'}).click();
 await expect(chart.locator('svg g[role="img"]')).toHaveCount(14); // May 2025 to June 2026, including missing months
 await expect(chart.locator('svg g[role="img"]').nth(1).locator('.plan-bar-current')).toHaveCount(0);
 await region.getByLabel('Kỳ',{exact:true}).selectOption('quarter');await region.getByRole('button',{name:'Xem số liệu'}).click();
 await expect(chart.locator('.plan-bar-current')).toHaveCount(0); // no complete three-month quarter
 await region.getByText(/Xem bảng số liệu, YoY và nguồn/).click();
 await expect(region.getByText('Chưa đủ dữ liệu',{exact:true}).first()).toBeVisible();
 await write([row('2026-08',4000),{...row('2026-08',9000),id:'test-group',asset_code:'hoang_dieu_chua_ve'},{...row('2025-05',300),id:'test-separate',asset_code:'chua_ve'}]);
 await page.goto('/companies/PHP?plan_asset=chua_ve#throughput');
 const group=page.getByRole('region',{name:'Sản lượng Hoàng Diệu–Chùa Vẽ (gộp)',exact:true});
 await expect(group.getByText(/Đây là tổng nhóm/)).toBeVisible();
 await expect(group.getByText('9.000',{exact:true}).first()).toBeVisible();
 expect((await(await request.get('/api/v1/companies/PHP/throughput?asset=chua_ve')).json()).months).toHaveLength(1);
 expect((await(await request.get('/api/v1/companies/PHP/throughput?asset=hoang_dieu_chua_ve')).json()).months[0].cargo_tonnes).toBe(9000);
 expect((await request.get('/api/v1/companies/PHP/throughput?asset=htit')).status()).toBe(400);
 await request.post('http://127.0.0.1:54329/__berths',{data:[]});
 await write([]);await page.goto('/companies/PHP');await expect(region.getByText(/Chưa có kỳ số liệu được duyệt công bố/)).toBeVisible();
 expect((await request.patch('/api/v1/admin/throughput',{data:{id:'bad',decision:'verified',note:'Test only review note more than 20 chars'}})).status()).toBe(401);
});
