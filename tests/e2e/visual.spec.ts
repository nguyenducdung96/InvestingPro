import { test, expect } from '@playwright/test';
test('catalog visual review',async({page},info)=>{
  await page.goto('/industries/ports');
  await expect(page.getByRole('link',{name:'Fixture Port Without Authority',exact:true})).toBeVisible();
  await page.screenshot({path:`test-results/catalog-${info.project.name}.png`,fullPage:true});
});
