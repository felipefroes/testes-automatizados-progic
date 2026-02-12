const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://qa-progic.comcaqui.com';
const storageStatePath =
  process.env.PLAYWRIGHT_STORAGE_STATE || path.resolve(__dirname, '..', 'storage', 'auth.json');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/manager/login`);
  console.log('Complete o login no navegador aberto para gerar o storage state.');

  await page.waitForURL(/\/manager\/?($|\?)/, { timeout: 0 });

  await fs.promises.mkdir(path.dirname(storageStatePath), { recursive: true });
  await context.storageState({ path: storageStatePath });

  console.log(`Storage state salvo em: ${storageStatePath}`);
  await browser.close();
})();
