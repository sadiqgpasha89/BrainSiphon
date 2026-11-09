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
  // five separate statuses instead of one "verified" badge
  const status = page.getByTestId('validation-status');
  await expect(status.getByTestId('status-schema')).toContainText('Schema validated: Passed');
  await expect(status.getByTestId('status-feasibility')).toContainText('Architecture feasibility: Passed');
  await expect(status.getByTestId('status-expert')).toContainText('Domain expert reviewed: Not reviewed');
  await expect(status.getByTestId('status-production')).toContainText('Production evidence: Not available');
  await expect(status.getByTestId('status-synthetic')).toContainText('Synthetic starter tested');
  await expect(page.getByTestId('validation-summary').getByTestId('release-line')).toContainText('commit');
  await expect(page.getByText(/Verified against|Automated checks passed/)).toHaveCount(0);
  await expect(page.locator('#enterprise')).toBeVisible();
  await expect(page.locator('#validation')).toBeVisible();

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
  await expect(page.getByTestId('starter-badge').first()).toBeVisible();
  await page.goto('/fintech/credit-default-survival-modeling');
  await expect(page.getByTestId('playbook-link')).toHaveCount(1);
  await expect(page.getByTestId('playbook-provenance')).toContainText('Generated playbook');
  expect(await page.getByTestId('loss-variables').locator('tbody tr').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('loss-variables')).toContainText('hazard');
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  await expect(page.getByTestId('playbook-provenance')).toContainText('Hand-written playbook');
});

test('the starter-kit verdict, the completion ladder and the artifact labels are unmistakable', async ({
  page,
}) => {
  // no compatible kit: guidance only, said in the standard words, and no runnable code is shown
  await page.goto('/fintech/credit-default-survival-modeling');
  await expect(page.getByTestId('starter-chip')).toContainText('no compatible starter kit');
  await expect(page.getByTestId('header-boundary')).toContainText('No executable starter');
  await expect(page.getByTestId('compat-statement')).toContainText(
    'No compatible executable starter kit exists. This playbook provides architecture and implementation guidance only.',
  );
  await expect(page.getByTestId('starter-verdict')).toHaveAttribute('data-verdict', 'none');
  await expect(page.getByTestId('reached-state')).toContainText('Guidance only');
  await expect(page.getByTestId('starter-file')).toHaveCount(0);
  await expect(page.getByTestId('no-starter')).toBeVisible();
  await expect(page.getByTestId('kit-blockers')).toContainText('censor');
  // an adaptable kit says what must change first
  await page.goto('/retail/personalized-search-ranking');
  await expect(page.getByTestId('starter-verdict')).toHaveAttribute('data-verdict', 'adaptable');
  await expect(page.getByTestId('kit-modifications')).toContainText('query');
  await expect(page.getByTestId('adapt-warning')).toBeVisible();
  // the pilot: M1 to M4 run, M5 and M6 are the engineer's platform
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  await expect(page.getByTestId('header-boundary')).toContainText('M1–M4');
  await expect(page.getByTestId('reached-state')).toContainText('Evaluation-ready');
  await expect(page.getByTestId('completion-ladder').locator(':scope > li')).toHaveCount(4);
  const delivery = page.getByTestId('milestone-delivery');
  await expect(delivery.nth(1)).toHaveAttribute('data-delivery', 'executable-reference');
  await expect(delivery.nth(5)).toHaveAttribute('data-delivery', 'your-platform');
  await expect(page.getByTestId('starter-file').first().getByTestId('artifact-kind').first()).toHaveAttribute(
    'data-kind',
    'executable-reference',
  );
  // the design's code is labelled for what it is: the hot path is pseudocode
  await expect(page.locator('#lld .shiki-host [data-kind="pseudocode"]').first()).toBeVisible();
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
  await expect(page.getByTestId('narrative-provenance')).toHaveText('generated');
});

test('a pilot use case shows hand-written narrative sections with its own stage rationale', async ({
  page,
}) => {
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  await expect(page.getByTestId('narrative-provenance')).toHaveText('hand-written');
  await expect(page.getByTestId('problem-statement')).toContainText('about 8 milliseconds');
  await expect(page.getByTestId('solution-approach')).toContainText('Precompute the graph, never query it');
  await expect(page.getByTestId('architecture-rationale')).toContainText('mule-device rotation');
});

test('role lens keys add and remove roles, 0 resets, and several roles combine into one view', async ({
  page,
}) => {
  await page.goto('/healthcare/sepsis-early-warning');
  const reader = page.getByTestId('reader');
  await expect(reader).toHaveAttribute('data-role', 'all');
  await expect(page.getByTestId('role-lens').getByRole('button')).toHaveCount(15); // All + 14 roles
  await page.keyboard.press('a');
  await expect(reader).toHaveAttribute('data-sel', 'inference-engineer');
  await expect(page.locator('#signal-noise')).toBeHidden();
  await expect(page.locator('#scale')).toBeVisible();
  await expect(page.locator('#discovery')).toBeVisible(); // Phase 0 is in every role's view
  await expect(page.getByTestId('lens-inference-engineer')).toBeVisible();
  await expect(page.getByTestId('lens-data-scientist')).toBeHidden();
  await page.keyboard.press('a');
  await expect(reader).toHaveAttribute('data-role', 'all');

  // Data Engineer + MLOps Engineer: one combined view
  await page.keyboard.press('5');
  await page.keyboard.press('9');
  await expect(reader).toHaveAttribute('data-sel', 'data-engineer mlops-engineer');
  const combined = page.getByTestId('combined-view');
  await expect(combined).toContainText('Data Engineer + MLOps Engineer');
  await expect(combined.getByTestId('phase-p0')).toContainText('compulsory');
  await expect(combined.getByTestId('phase-p2')).toContainText('ingestion');
  await expect(combined.getByTestId('phase-p3')).toContainText('training');
  await expect(combined.getByTestId('combined-handoffs')).toContainText('Operational handoff');
  await expect(combined.getByTestId('combined-handoffs')).toContainText('Deployment dependencies');
  await expect(page.locator('#features')).toBeVisible(); // data engineer
  await expect(page.locator('#mlops')).toBeVisible(); // mlops engineer
  await expect(page.locator('#signal-noise')).toBeHidden();
  await expect(page.getByTestId('lens-data-engineer')).toBeVisible();
  await expect(page.getByTestId('lens-mlops-engineer')).toBeVisible();
  await expect(page.getByTestId('lens-data-scientist')).toBeHidden();
  await page.getByTestId('role-security-engineer').click();
  await expect(reader).toHaveAttribute('data-sel', /security-engineer/);
  await page.keyboard.press('0');
  await expect(reader).toHaveAttribute('data-role', 'all');
  await expect(page.locator('#signal-noise')).toBeVisible();
  await expect(page.getByTestId('combined-view')).toHaveCount(0);
  await expect(page.getByTestId('primitives').getByRole('link').first()).toBeVisible();
});

test('every blueprint opens with a compulsory Phase 0 of discovery and business requirements', async ({
  page,
}) => {
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  const first = page.locator('article section').first();
  await expect(first).toHaveAttribute('id', 'discovery');
  await expect(page.getByTestId('discovery-status')).toContainText('Compulsory');
  const d = page.locator('#discovery');
  for (const q of [
    'Who is the actual system user?',
    'Who owns the business decision?',
    'What is the existing process?',
    'Which application will consume the model or AI output?',
    'What happens when the output is wrong?',
    'Who approves changes to business policies?',
    'What is the baseline business performance?',
    'How will financial or operational ROI be measured?',
  ])
    await expect(d).toContainText(q);
  await expect(d.getByRole('heading', { name: 'RACI' })).toBeVisible();
  await expect(d).toContainText('AS-IS today');
  await expect(d).toContainText('TO-BE with this system');
  await expect(d.getByTestId('journey')).toHaveCount(3);
  await expect(d.getByTestId('exit-gate').locator('li').first()).toContainText('open');
  await expect(page.locator('nav[aria-label="On this page"]')).toContainText('Phase 0');
});

test('capacity calculator re-runs the model and resets to the published numbers', async ({ page }) => {
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  const calc = page.getByTestId('capacity-calculator');
  await calc.scrollIntoViewIfNeeded();
  const cost = calc.locator('dl > div', { hasText: 'Monthly run cost' }).locator('dd').first();
  const before = await cost.textContent();
  await expect(calc.getByTestId('profile-transaction')).toHaveAttribute('aria-pressed', 'true');
  await calc.getByLabel('Average transactions per second').fill('1');
  await expect(cost).not.toHaveText(before ?? '');
  await page.getByTestId('calc-reset').click();
  await expect(cost).toHaveText(before ?? '');
  await calc.getByTestId('profile-session').click();
  await calc.getByLabel('Daily active share').fill('60');
  await expect(cost).not.toHaveText(before ?? '');
  await page.getByTestId('calc-reset').click();
  await expect(cost).toHaveText(before ?? '');
});

test('primitive pages exist and list the blueprints that use them', async ({ page }) => {
  await page.goto('/patterns');
  await expect(page.getByTestId('primitive-list').getByRole('link').first()).toBeVisible();
  await page.goto('/patterns/primitives/pid-budget-pacer');
  await expect(page.getByTestId('primitive-title')).toHaveText('PID budget pacer');
  await expect(page.getByTestId('primitive-uses').getByRole('link').first()).toBeVisible();
});

test('theme toggle switches light/dark/system, persists across reloads and re-themes diagrams and code', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const dark = await bg();
  await page.getByTestId('theme-light').click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(page.getByTestId('theme-light')).toHaveAttribute('aria-pressed', 'true');
  expect(await bg()).not.toBe(dark);

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light'); // remembered, no flash back to dark

  await page.getByTestId('theme-system').click(); // follows the OS: dark here
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('blueprint 2.0 sections: governance risk tier, decision matrix, MLOps and operations scenarios', async ({
  page,
}) => {
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  await expect(page.getByTestId('decision-matrix')).toBeVisible();
  await expect(page.getByTestId('risk-tier')).toContainText('Risk tier');
  await expect(page.locator('#mlops')).toContainText('Experiment management');
  await expect(page.locator('#operations')).toContainText('regional cloud outage');
  await expect(page.getByTestId('adr').first()).toBeVisible();
  await expect(page.getByTestId('validation-levels').getByRole('listitem')).toHaveCount(5);
});

test('patterns page explains the three-level hierarchy', async ({ page }) => {
  await page.goto('/patterns');
  await expect(page.getByTestId('enterprise-patterns').getByRole('listitem').first()).toBeVisible();
});

test('review hardening: a forecast gets a forecast LLD, workload-based sizing and an honest no-agent verdict', async ({
  page,
}) => {
  await page.goto('/retail/demand-forecasting-sku-store');
  await expect(page.getByTestId('lld-status')).toContainText('Forecasting');
  await expect(page.getByTestId('lld-status')).toContainText('Illustrative scaffold');
  await expect(page.locator('#lld')).toContainText('/forecasts');
  await expect(page.locator('#scale')).toContainText('5M series nightly');
  await expect(page.getByTestId('capacity-scenarios')).toContainText('(P95)');
  await expect(page.getByTestId('capacity-calculator').getByTestId('profile-forecast')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('agentic-fit')).toContainText('No agent recommended');
  await expect(page.getByTestId('agentic-decision')).toContainText('rejected');
  await expect(page.locator('#experimentation')).toContainText('rolling-origin-backtest');
  await expect(page.getByTestId('provenance')).toContainText('generated from a template');
  await expect(page.getByTestId('reviewer')).toContainText('No named reviewer yet');
});

test('deployment modes page explains what the static site leaves out', async ({ page }) => {
  await page.goto('/deployment');
  await expect(page.getByTestId('deployment-table')).toContainText('Static documentation site');
  await expect(page.getByTestId('deployment-table')).toContainText('Full-stack Docker');
});
