const { chromium } = require('playwright');

const TARGET =
  process.env.TARGET || 'https://rumble.com/shorts/v7i0axq';
const VIEWS = parseInt(process.env.VIEWS || '50', 10);

const MIN_DWELL = 8000;
const MAX_DWELL = 18000;

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
];

const ZONES = [
  { timezoneId: 'America/New_York', locale: 'en-US' },
  { timezoneId: 'America/Chicago', locale: 'en-US' },
  { timezoneId: 'Europe/London', locale: 'en-GB' },
  { timezoneId: 'America/Los_Angeles', locale: 'en-US' },
];

const PROXIES = (process.env.PROXIES || '')
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function proxyFor(i) {
  if (!PROXIES.length) return undefined;
  try {
    const raw = PROXIES[i % PROXIES.length];
    const u = new URL(raw.includes('://') ? raw : `http://${raw}`);
    return {
      server: `${u.protocol}//${u.host}`,
      username: u.username || undefined,
      password: u.password || undefined,
    };
  } catch {
    return undefined;
  }
}

(async () => {
  const browser = await chromium.launch({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-blink-features=AutomationControlled',
      '--mute-audio',
      '--disable-dev-shm-usage',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  let ok = 0;

  for (let i = 1; i <= VIEWS; i++) {
    const zone = pick(ZONES);
    const proxy = proxyFor(i);

    const context = await browser.newContext({
      userAgent: pick(UAS),
      viewport: { width: rand(1280, 1600), height: rand(720, 900) },
      locale: zone.locale,
      timezoneId: zone.timezoneId,
      proxy,
    });

    const page = await context.newPage();

    try {
      const sep = TARGET.includes('?') ? '&' : '?';
      const url = `${TARGET}${sep}cb=${Date.now()}${i}`;

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(rand(2000, 4000));

      const player = page.locator('iframe[src*="rumble.com/embed"]').first();
      if (await player.count()) {
        await player.scrollIntoViewIfNeeded().catch(() => {});
        await sleep(rand(500, 1500));
        await player
          .click({ position: { x: rand(80, 200), y: rand(80, 200) }, timeout: 6000 })
          .catch(() => {});
        await page
          .frameLocator('iframe[src*="rumble.com/embed"]')
          .locator('body')
          .click({ position: { x: 150, y: 150 }, timeout: 6000 })
          .catch(() => {});
      }

      await sleep(rand(MIN_DWELL, MAX_DWELL));
      ok++;
      console.log(`view ${i}/${VIEWS} ok${proxy ? ' via proxy' : ''}`);
    } catch (err) {
      console.log(`view ${i}/${VIEWS} fail: ${err.message}`);

      if (proxy) {
        try {
          const ctx2 = await browser.newContext({ userAgent: pick(UAS) });
          const p2 = await ctx2.newPage();
          await p2.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await sleep(rand(8000, 12000));
          ok++;
          console.log(`view ${i}/${VIEWS} ok on retry (no proxy)`);
          await ctx2.close();
        } catch {}
      }
    } finally {
      await context.close().catch(() => {});
    }

    await sleep(rand(1500, 5000));
  }

  console.log(`finished: ${ok}/${VIEWS}`);
  await browser.close();
})();
