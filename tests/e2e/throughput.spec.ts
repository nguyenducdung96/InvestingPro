import {test,expect} from '@playwright/test';
const row=(period:string,value:number)=>({id:`test-${period}`,asset_code:'tan_vu',period:`${period}-01`,publication_month:'2026-09-01',cargo_tonnes:value,container_teu:100,source_url:'https://haiphongport.com.vn/FileUpload/Documents/test-only.pdf',source_sha256:'a'.repeat(64),pdf_page:1,fetched_at:'2026-10-20T00:00:00Z',source_checked_at:'2026-10-21T00:00:00Z',source_error:null});
test('PHP reads changed database responses without rebuild; filters, nulls, sources and mobile remain usable',async({page,request},info)=>{
 const write=async(data:object[])=>request.post('http://127.0.0.1:54329/__throughput',{data});
 await write([row('2025-05',1000),row('2026-05',2000),row('2026-06',3000)]);
 await page.goto('/companies/PHP');
 const region=page.getByRole('region',{name:'Sản lượng Tân Vũ',exact:true});
 await expect(region.getByRole('heading',{name:'Theo dõi hoạt động cảng'})).toBeVisible();
 await expect(region.getByText('3.000',{exact:true}).first()).toBeVisible();
 expect((await(await request.get('/api/v1/companies/PHP/throughput')).json()).months).toHaveLength(3);
 await write([row('2025-05',1000),row('2026-05',2500),row('2026-06',4000)]);
 await page.reload();await expect(region.getByText('4.000',{exact:true}).first()).toBeVisible();
 await expect(region.getByText('+150%',{exact:true})).toBeVisible();
 await region.getByText('Bản tin · trang 1').first().click();
 await expect(region.getByRole('link',{name:'Mở PDF chính thức'}).first()).toHaveAttribute('href',/haiphongport/);
 for(const theme of ['light','dark']){
  await page.getByLabel('Giao diện',{exact:true}).selectOption(theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/php-throughput-${theme}-${info.project.name}.png`,fullPage:true});
 }
 await page.getByLabel('Kỳ',{exact:true}).selectOption('quarter');await page.getByRole('button',{name:'Xem số liệu'}).click();
 await expect(region.getByText('Chưa đủ dữ liệu',{exact:true}).first()).toBeVisible();
 await write([]);await page.reload();await expect(region.getByText(/Chưa có kỳ số liệu được duyệt công bố/)).toBeVisible();
 expect((await request.patch('/api/v1/admin/throughput',{data:{id:'bad',decision:'verified',note:'Test only review note more than 20 chars'}})).status()).toBe(401);
});
