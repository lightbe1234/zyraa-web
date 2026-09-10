import { test, expect } from '@playwright/test';

test('studio is responsive and carries only artwork and selections into bag',async({page})=>{
 test.setTimeout(120000);
 await page.route('**/api/visitor-activity*',r=>r.fulfill({status:204}));
 const slug='custom-'+'a'.repeat(32);
 const product={slug,name:'Your custom shirt',category:'Custom shirt',collection:'Custom shirt',price:214000,image:'/custom-shirts/black.svg',alternate:'',images:['/custom-shirts/black.svg'],stock:10,colors:['Black'],sizes:['M'],customDetails:{colour:'Black',fabric:'Cotton',print:'Front + back',size:'M',instructions:'Centre the print',artwork:'front.png',frontArtwork:'front.png',backArtwork:'back.png',image:'/custom-shirts/black.svg'}};
 await page.route('**/api/custom-shirts/upload',r=>r.fulfill({status:201,json:{path:'test.png',url:'/custom-shirts/black.svg'}}));
 await page.route('**/api/custom-shirts/designs*',r=>r.fulfill({status:200,json:r.request().method()==='POST'?product:[product]}));
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto('/customise-your-shirt',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Which colour?'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Continue to fabric'})).toBeDisabled();
  await page.screenshot({path:`outputs/custom-studio-${width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.getByRole('button',{name:'Black',exact:false}).click();
 await page.getByRole('button',{name:'Continue to fabric'}).click();
 await page.getByRole('button',{name:/Cotton/}).first().click();
 await page.getByRole('button',{name:'Continue to size & print'}).click();
 await page.getByRole('button',{name:'M',exact:true}).click();
 await page.getByRole('button',{name:/Front \+ back/}).click();
 await page.getByRole('button',{name:/Centre chest/}).click();
 await page.getByRole('button',{name:/Centre back/}).click();
 await page.getByRole('button',{name:'Continue to your artwork'}).click();
 await page.setViewportSize({width:390,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'outputs/custom-artwork-mobile.png',fullPage:true,animations:'disabled'});
 await page.getByLabel('Upload front print',{exact:true}).setInputFiles({name:'front.png',mimeType:'image/png',buffer:Buffer.from('isolated-test')});
 await page.getByLabel('Upload back print',{exact:true}).setInputFiles({name:'back.png',mimeType:'image/png',buffer:Buffer.from('isolated-test')});
 await page.getByLabel('Print instructions',{exact:false}).fill('Centre the print');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Add my design to bag'}).click();
 await expect(page).toHaveURL(/\/cart$/);
 await expect(page.getByText('Notes: Centre the print',{exact:true}).first()).toBeVisible();
 const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('zyra-cart')||'[]'));
 expect(cart).toEqual([{slug,size:'M',color:'Black',qty:1}]);
 await page.reload();
 await expect(page.getByText('Notes: Centre the print',{exact:true}).first()).toBeVisible();
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('.zs-banner').scrollIntoViewIfNeeded();
 await page.locator('.zs-banner').screenshot({path:'outputs/custom-banner-mobile.png',animations:'disabled'});
 await expect(page.locator('.zs-banner')).toHaveAttribute('href','/customise-your-shirt');
});
