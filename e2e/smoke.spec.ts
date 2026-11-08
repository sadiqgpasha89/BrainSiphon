import { expect, test } from '@playwright/test';

test('domain → filter → open blueprint → Pure Signal toggle', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Domains', exact: true })
    .getByRole('link', { name: 'FinTech' })
    .click();
  await expect(page).toHaveURL(/\/fintech$/);
  await expect(page.getByTestId('result-count')).toContainText('50 of 50');

  await page.getByRole('button', { name: /^Graph/ }).click();
  await expect(page.getByTestId('result-count')).not.toContainText('50 of 50');
  await expect(page).toHaveURL(/paradigm=graph/);

  await page
    .getByRole('link', { name: /Real-Time Card & UPI Fraud Detection/ })
    .first()
    .click();
  await expect(page.getByTestId('uc-title')).toHaveText('Real-Time Card & UPI Fraud Detection');
  await expect(page.getByTestId('verified-badge')).toContainText('Verified');

  const prose = page.locator('[data-prose]:visible');
  expect(await prose.count()).toBeGreaterThan(0);
  await page.keyboard.press('[');
  await expect(page.getByTestId('reader')).toHaveAttribute('data-pure', 'true');
  await expect(prose).toHaveCount(0);
  await expect(page.locator('table').first()).toBeVisible();
  await page.keyboard.press(']');
  await expect(page.getByTestId('reader')).toHaveAttribute('data-pure', 'false');
  expect(await page.locator('[data-prose]:visible').count()).toBeGreaterThan(0);
});

test('diagrams and equations render without falling back to raw source', async ({ page }) => {
  await page.goto('/retail/personalized-search-ranking');
  await expect(page.getByTestId('math').locator('.katex').first()).toBeVisible();
  await page.locator('#sequence').scrollIntoViewIfNeeded();
  await expect(page.locator('#sequence svg').first()).toBeVisible({ timeout: 15_000 });
  // scope to <main>: Next.js' own route announcer also has role=alert (in a shadow root)
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
});

test('Cmd/Ctrl+K opens instant search and navigates by keyboard', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Search blueprints' });
  await expect(input).toBeVisible();
  await input.fill('sepsis');
  await expect(page.getByRole('option', { name: /Sepsis Early-Warning/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/healthcare\/sepsis-early-warning/);
});

test('renamed slugs 308-redirect and the .md export serves clean markdown', async ({ page, request }) => {
  const res = await request.get('/fintech/real-time-payment-fraud-detection', { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toContain('/fintech/real-time-card-upi-fraud-detection');
  const md = await request.get('/fintech/real-time-card-upi-fraud-detection.md');
  expect(md.status()).toBe(200);
  expect(await md.text()).toContain('# Real-Time Card & UPI Fraud Detection');
  await page.goto('/fintech/real-time-payment-fraud-detection');
  await expect(page).toHaveURL(/real-time-card-upi-fraud-detection/);
});

test('health endpoints, security headers and search validation', async ({ request }) => {
  expect((await request.get('/api/health/liveness')).status()).toBe(200);
  expect((await request.get('/api/health/readiness')).status()).toBe(200);
  const home = await request.get('/');
  const h = home.headers();
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['strict-transport-security']).toContain('max-age');
  expect(h['referrer-policy']).toBeTruthy();
  expect(h['permissions-policy']).toBeTruthy();
  expect(h['x-request-id']).toBeTruthy();
  expect((await request.get('/api/search?q=fraud&domain=bogus')).status()).toBe(400);
  const ok = await request.get('/api/search?q=fraud+graph&limit=3');
  expect(ok.status()).toBe(200);
  expect((await ok.json()).items.length).toBeGreaterThan(0);
});

test('sitemap, robots, llms.txt and OG image', async ({ request }) => {
  const sm = await (await request.get('/sitemap.xml')).text();
  expect((sm.match(/<loc>/g) ?? []).length).toBeGreaterThanOrEqual(409);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
  expect(await (await request.get('/llms.txt')).text()).toContain('## FinTech & Payments');
  const og = await request.get('/api/og?slug=fintech/real-time-card-upi-fraud-detection');
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
});

test('a pilot use case opens straight to its build playbook, with gates and runnable starter code', async ({
  page,
}) => {
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  await page.getByTestId('playbook-link').click();
  await expect(page).toHaveURL(/#playbook$/);
  await expect(page.getByRole('heading', { name: 'Build playbook' })).toBeVisible();
  // the "On this page" highlight follows the scroll position
  await expect(page.locator('nav[aria-label="On this page"] a[aria-current]')).toHaveText('Build playbook');
  await expect(page.getByTestId('concept').first()).toBeVisible();
  expect(await page.getByTestId('glossary').locator('tr').count()).toBeGreaterThanOrEqual(15);
  await expect(page.getByTestId('milestone')).toHaveCount(7);
  await expect(page.getByTestId('milestone').nth(3)).toContainText('Exit gate');
  const file = page.getByTestId('starter-file').first();
  await file.locator('summary').click();
  await expect(file.locator('pre').first()).toContainText('def generate');
  // every other use case gets a generated playbook that says so, plus a legend for its loss formula
  await page.goto('/fintech');
  await expect(page.getByText('Playbook', { exact: true }).first()).toBeVisible();
  await page.goto('/fintech/credit-default-survival-modeling');
  await expect(page.getByTestId('playbook-link')).toHaveCount(1);
  await expect(page.getByTestId('playbook-provenance')).toContainText('Generated playbook');
  expect(await page.getByTestId('loss-variables').locator('tbody tr').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('loss-variables')).toContainText('hazard');
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  await expect(page.getByTestId('playbook-provenance')).toContainText('Hand-written playbook');
});

test('a domain page opens with a start-here path and tracks, and a track filters the catalog', async ({
  page,
}) => {
  await page.goto('/bfsi');
  await expect(page.getByTestId('start-here').getByRole('listitem')).toHaveCount(3);
  const tracks = page.getByTestId('tracks').getByRole('listitem');
  expect(await tracks.count()).toBeGreaterThanOrEqual(6);
  await tracks.filter({ hasText: 'Insurance' }).getByRole('link').click();
  await expect(page).toHaveURL(/track=insurance/);
  await expect(page.getByTestId('result-count')).toContainText('11 of 50');
});

test('pattern hubs list blueprints across domains and a blueprint links back to its pattern', async ({
  page,
}) => {
  await page.goto('/patterns');
  await expect(page.getByTestId('pattern-list').getByRole('listitem')).toHaveCount(11);
  await page.goto('/real-estate/automated-valuation-model');
  await expect(page.getByTestId('track-crumb')).toContainText('Valuation');
  await page.getByTestId('pattern-chip').click();
  await expect(page).toHaveURL(/\/patterns\/[a-z-]+$/);
  await expect(page.getByTestId('pattern-title')).toBeVisible();
  const n = await page.getByTestId('pattern-usecases').getByRole('link').count();
  expect(n).toBeGreaterThan(10);
});

test('each blueprint states its own problem, solution approach and stage-by-stage architecture', async ({
  page,
}) => {
  await page.goto('/bfsi/settlement-fail-prediction');
  await expect(page.getByTestId('problem-statement')).toContainText('Fails avoided per day');
  await expect(page.getByTestId('solution-approach')).toContainText('Counterparty fail rate 30d');
  await expect(page.getByTestId('architecture-rationale')).toContainText('Fail model');
  await page.goto('/real-estate/automated-valuation-model');
  await expect(page.getByTestId('problem-statement')).not.toContainText('Fails avoided per day');
  await expect(page.getByTestId('solution-approach')).toContainText('Condition score from photos');
});
