const { chromium } = require('playwright');

const TARGETS = [
  'https://rumble.com/shorts/v7i0axq',
];

(async () => {
  const browser = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-blink-features=AutomationControlled',
      '--mute-audio',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  for (const url of TARGETS) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      const player = page.locator('iframe[src*="rumble.com/embed"]').first();
      if (await player.count()) {
        await player.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1500);
        try {
          await player.click({ position: { x: 120, y: 120 }, timeout: 8000 });
        } catch {}
        await page
          .frameLocator('iframe[src*="rumble.com/embed"]')
          .locator('body')
          .click({ position: { x: 150, y: 150 }, timeout: 8000 })
          .catch(() => {});
      }

      await page.waitForTimeout(45000);
      console.log('OK:', url);
    } catch (err) {
      console.log('FAIL:', url, err.message);
    }
  }

  await browser.close();
})();
