import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('public catalog works without a session or provider and keeps reported facts separate',async({page,request})=>{
 await request.post('http://127.0.0.1:54329/reset');
 const bundle=JSON.parse(readFileSync('docs/catalog-review/public-catalog-facts.json','utf8'));
 await page.goto('/admin/catalog');await page.getByLabel('Mã truy cập (access token)').fill('fixture-admin');await page.getByRole('button',{name:'Đăng nhập quản trị',exact:true}).click();
 await page.getByText('Phát hành bản dữ kiện công khai',{exact:true}).click();
 await page.getByLabel('File catalog biên tập (tối đa 250 KB)').setInputFiles({name:'public-catalog.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
 await page.getByLabel('Căn cứ, phạm vi và kết quả rà soát bản phát hành').fill('TEST ONLY: checked the factual edition, report periods and source attribution; no provider prose.');
 await page.getByRole('region',{name:'Phát hành catalog biên tập',exact:true}).getByRole('checkbox').check();
 await page.getByRole('button',{name:'Phát hành catalog biên tập',exact:true}).click();
 await expect(page.getByText('Đã phát hành 41 hồ sơ dữ kiện; thêm 1 bản biên tập.',{exact:false})).toBeVisible();
 await page.context().clearCookies();
 await page.goto('/industries/ports/companies?view=all');
 await expect(page.getByText('41 / 41 doanh nghiệp',{exact:false})).toBeVisible();
 await page.getByLabel('Tìm mã hoặc tên doanh nghiệp').fill('GMD');await page.getByRole('button',{name:'Tìm doanh nghiệp',exact:true}).click();
 await expect(page.locator('main article')).toHaveCount(1);
 await page.getByRole('link',{name:'GMD · Công ty Cổ phần Tập đoàn Gemadept',exact:true}).click();
 await expect(page.getByRole('region',{name:'ICD và cảng cạn',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Cảng biển và cảng sông',exact:true})).toBeVisible();
 await expect(page.getByText('Chưa xác định',{exact:true})).toHaveCount(6);
 await expect(page.getByRole('heading',{name:'Công ty có góp vốn theo nhà cung cấp',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const ticker of ['GMD','PHP','DVP']){
  await page.goto(`/companies/${ticker}`);
  const source=page.getByRole('complementary',{name:'Nguồn hồ sơ',exact:true});
  await expect(source.getByText('Kỳ báo cáo',{exact:true})).toBeVisible();
  await expect(source.locator('a, details, code')).toHaveCount(0);
  await expect(page.getByText(/Trang PDF đã đối chiếu|Bản biên tập phát hành|Dấu vết dữ liệu|Nghiên cứu API có đăng nhập|SHA-256:/)).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await request.post('http://127.0.0.1:54329/reset');
});
