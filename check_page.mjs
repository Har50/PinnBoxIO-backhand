import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const msgs = [];
  page.on('console', m => msgs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => msgs.push(`[PAGE_ERROR] ${e.message}`));
  
  try {
    await page.goto('https://pinnboxio.net', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const root = await page.evaluate(() => document.getElementById('root')?.innerHTML?.substring(0, 2000));
    
    console.log('=== CONSOLE ===');
    for (const m of msgs) console.log(m);
    console.log('=== ROOT ===');
    console.log(root || '(empty)');
    console.log('=== URL ===');
    console.log(page.url());
  } catch (err) {
    console.error('ERROR:', err.message);
    for (const m of msgs) console.log(m);
  }
  
  await browser.close();
})();
