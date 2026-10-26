const look = (url, wait = 4000) => ({ url, dump: true, run: async (page, { sleep }) => { await sleep(wait); } });
const hold = async (page, key, ms, sleep) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };
const taps = async (page, key, n, gap, sleep) => { for (let i = 0; i < n; i++) { await hold(page, key, 90, sleep); await sleep(gap); } };

export const recipes = {
  'rts4': { url: '/rts/index.html?missao=canudos', run: async (page, { sleep }) => {
    await sleep(15000);
    await page.evaluate(() => {
      const lv = [...document.querySelectorAll('button.level')].find((b) => b.textContent.trim() === 'Normal' && b.offsetParent);
      if (lv) lv.click();
      document.getElementById('start-play')?.click();
    });
    await sleep(3000);
    await page.evaluate(() => document.getElementById('wave-call')?.click());
    await sleep(40000);
  } },
  'rts4': { url: '/rts/index.html', run: async (page, { sleep }) => {
    await sleep(8000);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /CANUDOS/i.test(b.textContent) && b.offsetParent)?.click());
    await sleep(12000);
    await page.evaluate(() => {
      const lv = [...document.querySelectorAll('button.level')].find((b) => b.textContent.trim() === 'Normal' && b.offsetParent);
      if (lv) lv.click();
      document.getElementById('start-play')?.click();
    });
    await sleep(3000);
    await page.evaluate(() => document.getElementById('wave-call')?.click());
    await sleep(40000);
  } },
  'rpg-play': { url: 'https://andredarcie.github.io/tiny-rpg-studio/', run: async (page, { sleep }) => {
    await sleep(9000);
    await page.locator('#btn-explore').click({ force: true });
    await sleep(4000);
    await page.locator('.explore-card', { hasText: 'Tiden' }).first().click({ force: true });
    await sleep(6000);
    await page.mouse.click(640, 400);
    await taps(page, 'Enter', 2, 600, sleep);
    await taps(page, 'ArrowUp', 3, 300, sleep);
    await taps(page, 'ArrowRight', 2, 300, sleep);
    await sleep(1000);
  } },
  'rpg-ed2': { url: 'https://andredarcie.github.io/tiny-rpg-studio/', run: async (page, { sleep }) => {
    await sleep(9000);
    await page.evaluate(() => [...document.querySelectorAll('.tab-button')].find((b) => b.textContent.trim() === 'Editor').click());
    await sleep(2500);
  } },
  'gta3': { url: 'https://andredarcie.github.io/tiny-gta/', run: async (page, { sleep }) => {
    page.setDefaultTimeout(180000);
    await page.waitForSelector('#play:not(.is-loading)', { timeout: 180000 });
    await sleep(1500);
    await page.evaluate(() => document.getElementById('play').click());
    await sleep(15000);
    await hold(page, 'KeyW', 2500, sleep);
    await sleep(3000);
  } },
  'journey3': { url: 'https://andredarcie.github.io/journey/', run: async (page, { sleep }) => {
    await sleep(6000);
    await page.locator('button.chip', { hasText: 'PE' }).first().click();
    await sleep(3000);
    await page.locator('.tile').first().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, -120);
    await sleep(5000);
  } },
  'rts3': { url: '/rts/index.html', run: async (page, { sleep }) => {
    await sleep(12000);
    await page.evaluate(() => {
      const lv = [...document.querySelectorAll('button.level')].find((b) => b.textContent.trim() === 'Normal' && b.offsetParent);
      if (lv) lv.click();
      document.getElementById('start-play').click();
    });
    await sleep(3000);
    await page.evaluate(() => document.getElementById('wave-call')?.click());
    await sleep(40000);
  } },
  'house3': { url: '/house/index.html', run: async (page, { sleep }) => {
    page.setDefaultTimeout(120000);
    await sleep(8000);
    await page.click('#startbtn');
    await sleep(3000);
    await page.mouse.click(640, 400);
    await hold(page, 'ArrowUp', 3000, sleep);
    await hold(page, 'KeyW', 2000, sleep);
    await sleep(2000);
    await page.addStyleTag({ content: '#tools, #btnStake, #cross { display: none !important; }' });
    await sleep(500);
  } },
  'rpg-explore': { url: 'https://andredarcie.github.io/tiny-rpg-studio/', dump: true, run: async (page, { sleep }) => {
    await sleep(9000);
    await page.locator('#btn-explore').click({ force: true });
    await sleep(5000);
  } },
  'gta2': { url: 'https://andredarcie.github.io/tiny-gta/', dump: true, run: async (page, { sleep }) => {
    page.setDefaultTimeout(180000);
    await page.waitForSelector('#play:not(.is-loading)', { timeout: 180000 });
    await page.click('#play');
    await sleep(12000);
    await hold(page, 'KeyW', 2000, sleep);
    await sleep(2500);
  } },
  'codex2': { url: 'https://andredarcie.github.io/my-code-codex/', run: async (page, { sleep }) => {
    await sleep(2000);
    await page.getByRole('link', { name: 'Arquitetura' }).first().click();
    await sleep(2000);
    await page.getByRole('link', { name: 'N-Camadas' }).first().click();
    await sleep(3000);
  } },
  'journey2': { url: 'https://andredarcie.github.io/journey/', dump: true, run: async (page, { sleep }) => {
    await sleep(6000);
    await page.locator('button.chip', { hasText: 'PE' }).first().click();
    await sleep(6000);
  } },
  'brians2': { url: '/brians/web/index.html', viewport: { width: 1088, height: 832 }, run: async (page, { sleep }) => {
    await page.waitForSelector('#jogar:not([hidden])', { timeout: 120000 });
    await page.click('#jogar');
    await sleep(4000);
    await taps(page, 'Enter', 1, 3000, sleep);
    await hold(page, 'Enter', 3500, sleep);
    await sleep(2000);
    for (let i = 0; i < 6; i++) await taps(page, 'Enter', 1, 900, sleep);
    await hold(page, 'ArrowDown', 600, sleep);
    await sleep(1500);
  } },
  'rts2': { url: '/rts/index.html', run: async (page, { sleep }) => {
    await sleep(12000);
    await page.locator('button.level', { hasText: 'Normal' }).first().click();
    await page.click('#start-play');
    await sleep(3000);
    await page.click('#wave-call').catch(() => {});
    await sleep(35000);
  } },
  'house2': { url: '/house/index.html', run: async (page, { sleep }) => {
    page.setDefaultTimeout(120000);
    await sleep(8000);
    await page.click('#startbtn');
    await sleep(3000);
    await hold(page, 'KeyW', 2500, sleep);
    await sleep(2000);
    await page.addStyleTag({ content: '#tools, #btnStake, #cross { display: none !important; }' });
    await sleep(500);
  } },
  rpg: { url: 'https://andredarcie.github.io/tiny-rpg-studio/', dump: true, run: async (page, { sleep }) => {
    await sleep(9000);
    await page.mouse.click(640, 400);
    await taps(page, 'Enter', 3, 500, sleep);
    await taps(page, 'ArrowRight', 3, 300, sleep);
    await taps(page, 'ArrowDown', 2, 300, sleep);
    await sleep(800);
  } },
  'rpg-editor': { url: 'https://andredarcie.github.io/tiny-rpg-studio/', run: async (page, { sleep }) => {
    await sleep(9000);
    await page.getByRole('button', { name: 'Editor' }).click();
    await sleep(2000);
  } },
  ovgd: { url: 'https://www.openvideogamedata.com/', run: async (page, { sleep }) => {
    await sleep(3000);
    await page.getByText('Best Games of All Time').first().click();
    await sleep(5000);
  } },
  lifedata: { url: 'https://andredarcie.github.io/my-life-data/', run: async (page, { sleep }) => {
    await sleep(2500);
    await page.getByRole('link', { name: 'Jogos' }).first().click();
    await sleep(5000);
  } },
  codex: { url: 'https://andredarcie.github.io/my-code-codex/', run: async (page, { sleep }) => {
    await sleep(2000);
    await page.getByRole('link', { name: 'Arquitetura' }).first().click();
    await sleep(3000);
    await page.mouse.wheel(0, 500);
    await sleep(800);
  } },
  blog: { url: 'https://andredarcie.github.io/blog/', run: async (page, { sleep }) => {
    await sleep(2000);
    await page.getByRole('link', { name: /Clair Obscure/ }).first().click();
    await sleep(3000);
  } },
  skills: { url: 'https://andredarcie.github.io/my-skills/', run: async (page, { sleep }) => {
    await sleep(2000);
    await page.getByRole('link', { name: 'dotnet-backend/' }).first().click();
    await sleep(3000);
    await page.mouse.wheel(0, 400);
    await sleep(800);
  } },
  curso: { url: '/curso/orientacao-a-objetos.html', run: async (page, { sleep }) => {
    await sleep(2500);
    await page.mouse.click(640, 400);
    await taps(page, 'ArrowRight', 7, 450, sleep);
    await sleep(1500);
  } },
  journey: { url: 'https://andredarcie.github.io/journey/', run: async (page, { sleep }) => { await sleep(9000); } },
  brians: { url: '/brians/web/index.html', viewport: { width: 1088, height: 832 }, run: async (page, { sleep }) => {
    await page.waitForSelector('#jogar:not([hidden])', { timeout: 120000 });
    await page.click('#jogar');
    await sleep(4000);
    await taps(page, 'Enter', 1, 3000, sleep);
    for (let i = 0; i < 14; i++) await taps(page, 'Enter', 1, 900, sleep);
    await hold(page, 'ArrowDown', 700, sleep);
    await hold(page, 'ArrowLeft', 500, sleep);
    await sleep(1200);
  } },
  zerohero: { url: 'https://andredarcie.github.io/zero-hero/', dump: true, run: async (page, { sleep }) => {
    await sleep(6000);
    await page.mouse.click(640, 528);
    await sleep(2500);
    for (let i = 0; i < 10; i++) await taps(page, 'Enter', 1, 700, sleep);
    await taps(page, 'ArrowRight', 3, 350, sleep);
    await taps(page, 'ArrowDown', 2, 350, sleep);
    await sleep(1500);
  } },
  gta: { url: 'https://andredarcie.github.io/tiny-gta/', dump: true, run: async (page, { sleep }) => {
    await sleep(8000);
    await page.click('#play');
    await sleep(25000);
    await hold(page, 'KeyW', 1500, sleep);
    await sleep(2000);
  } },
  zero: { url: '/zero/index.html', run: async (page, { sleep }) => {
    await page.waitForFunction(() => !!window.__zero, null, { timeout: 60000 });
    await sleep(2000);
    await page.evaluate(() => window.__zero.go('rua', 1));
    await sleep(6000);
  } },
  house: { url: '/house/index.html', run: async (page, { sleep }) => {
    page.setDefaultTimeout(120000);
    await sleep(8000);
    await page.click('#startbtn');
    await sleep(6000);
  } },
  rts: { url: '/rts/index.html', run: async (page, { sleep }) => {
    await sleep(12000);
    await page.locator('.level', { hasText: 'Normal' }).click();
    await page.click('#start-play');
    await sleep(3000);
    await page.click('#wave-call').catch(() => {});
    await sleep(30000);
  } },
};
