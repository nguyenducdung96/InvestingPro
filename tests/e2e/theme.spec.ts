import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test('light and dark themes persist, respect system preference and keep company pages readable',async({page,request},info)=>{
 await request.post('http://127.0.0.1:54329/reset');
 const bundle=JSON.parse(readFileSync('docs/catalog-review/public-catalog-facts.json','utf8'));
 await request.post('http://127.0.0.1:54329/rest/v1/rpc/publish_editorial_catalog',{headers:{Authorization:'Bearer fixture-admin'},data:{p_id:'b'.repeat(64),p_entries:bundle.entries}});
 await page.emulateMedia({colorScheme:'dark'});
 await page.goto('/companies/DVP');
 const theme=page.getByLabel('Giao diện',{exact:true});
 await expect(theme).toHaveValue('system');
 await expect(page.locator('html')).toHaveCSS('color-scheme','dark');
 for(const choice of ['light','dark']){
  await theme.selectOption(choice);
  await expect(page.locator('html')).toHaveCSS('color-scheme',choice);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const contrast=await page.evaluate(()=>{
   const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
   const lum=(s:string)=>{const c=rgb(s);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
   const bg=lum(getComputedStyle(document.body).backgroundColor);
   return ['h1','main .notice','main .facts dd'].map(selector=>{const el=document.querySelector(selector)!;const fg=lum(getComputedStyle(el).color);return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);});
  });
  expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({path:`test-results/dvp-${choice}-${info.project.name}.png`,fullPage:true});
  await page.reload();await expect(theme).toHaveValue(choice);await expect(page.locator('html')).toHaveCSS('color-scheme',choice);
 }
 await theme.selectOption('system');await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveCSS('color-scheme','light');
 await page.setViewportSize({width:768,height:1024});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await request.post('http://127.0.0.1:54329/reset');
});
