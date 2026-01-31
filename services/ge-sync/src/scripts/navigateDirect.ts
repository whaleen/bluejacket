#!/usr/bin/env tsx
import 'dotenv/config';
import { chromium, Browser, Page } from 'playwright';
import { getLocationConfig } from '../db/supabase.js';
import * as fs from 'fs/promises';

const GE_DMS_BASE = 'https://dms-erp-aws-prd.geappliances.com';

let browser: Browser | null = null;
let page: Page | null = null;

async function authenticate() {
  const locationId = '00000000-0000-0000-0000-000000000001';
  const config = await getLocationConfig(locationId);

  if (!config.ssoUsername || !config.ssoPassword) {
    throw new Error('SSO credentials not configured');
  }

  console.log('🔐 Authenticating...\n');

  browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1400, height: 900 },
  });

  page = await context.newPage();

  page.on('popup', async popup => {
    console.log(`\n🆕 New tab opened: ${popup.url()}`);
  });

  await page.goto(`${GE_DMS_BASE}/dms/newasis`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  if (page.url().includes('sso.geappliances.com')) {
    await page.waitForSelector('input[name="username"]');
    await page.fill('input[name="username"]', config.ssoUsername);
    await page.fill('input[name="password"]', config.ssoPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dms/**', { timeout: 30000 });
  }

  await page.reload({ waitUntil: 'networkidle' });
  console.log('✅ Authenticated\n');
}

async function documentPage() {
  if (!page) throw new Error('No page available');

  const currentUrl = page.url();
  const title = await page.title();

  console.log('📍 Current Location:');
  console.log(`   URL: ${currentUrl}`);
  console.log(`   Title: ${title}\n`);

  const timestamp = Date.now();
  const screenshot = `/tmp/ge-${timestamp}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log(`📸 Screenshot: ${screenshot}\n`);

  const bodyText = await page.evaluate(() => {
    const body = document.body;
    return body ? body.innerText : '';
  });

  const contentFile = `/tmp/ge-content-${timestamp}.txt`;
  await fs.writeFile(contentFile, bodyText);
  console.log(`📄 Page content saved: ${contentFile}\n`);

  const exportButtons = await page.$$eval(
    'input[value*="SpreadSheet"], input[value*="Spreadsheet"], input[value*="Excel"], input[value*="Download"], button:has-text("Export"), button:has-text("Download")',
    els => els.map(el => (el as HTMLInputElement).value || el.textContent?.trim() || '')
  );

  if (exportButtons.length > 0) {
    console.log('📥 Export buttons found:');
    exportButtons.forEach(btn => console.log(`   - ${btn}`));
    console.log('');
  }
}

async function main() {
  const urlPath = process.argv[2];

  if (!urlPath) {
    console.error('❌ Usage: tsx navigateDirect.ts "/dms/path"');
    process.exit(1);
  }

  await authenticate();

  console.log(`📍 Navigating to ${urlPath}...\n`);
  await page!.goto(`${GE_DMS_BASE}${urlPath}`, { waitUntil: 'networkidle' });
  await page!.waitForTimeout(3000);

  await documentPage();

  console.log('🎉 Browser staying open. Press Ctrl+C to exit.\n');
  await new Promise(() => {});
}

process.on('SIGINT', async () => {
  console.log('\n👋 Closing browser...');
  if (browser) await browser.close();
  process.exit(0);
});

main();
