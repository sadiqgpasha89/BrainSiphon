import { expect, test } from '@playwright/test';

test('domain → filter → open blueprint → Pure Signal toggle', async ({ page }) => {
  await page.goto('/');
  // the ten domains live in one "Use cases" menu instead of a scrolling row in the header
  await expect(page.getByRole('navigation', { name: 'Domains', exact: true })).toBeHidden();
  await page.getByTestId('usecases-button').click();
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
  await expect(page.getByTestId('completion-ladder').locator(':scope > li')).toHaveCount(5);
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
  // the lens buttons are folded away until asked for; the keys work either way
  await expect(page.getByTestId('role-lens')).toBeHidden();
  await page.getByTestId('role-lens-toggle').click();
  await expect(page.getByTestId('role-lens').getByRole('button')).toHaveCount(16); // All + 15 roles
  await page.getByTestId('role-lens-toggle').click();
  await expect(page.getByTestId('role-lens')).toBeHidden();
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
  await expect(page.getByTestId('role-lens-toggle')).toContainText('2 roles');
  await page.getByTestId('role-lens-toggle').click();
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
  await expect(page.getByTestId('deployment-table')).toContainText('Static Export (Pages)');
  await expect(page.getByTestId('deployment-table')).toContainText('Full-Stack Docker');
});

test('home page leads a newcomer from a use case to the delivery guide', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('how-it-works').getByRole('listitem')).toHaveCount(3);
  await expect(page.getByTestId('home-phases').getByRole('link')).toHaveCount(7);
  await page.getByTestId('cta-guide').click();
  await expect(page).toHaveURL(/\/delivery$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('From project scoping to deployment');
});

test('delivery guide: steps, gates, a role filter, progress and links into the chosen blueprint', async ({
  page,
}) => {
  await page.goto('/delivery');
  const guide = page.getByTestId('delivery-guide');
  await expect(guide.locator('[data-testid^="step-"]')).toHaveCount(69);
  for (const p of ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
    await expect(page.getByTestId(`guide-${p}`)).toBeVisible();
    await expect(page.getByTestId(`gate-${p}`)).toContainText('Signed by');
  }
  await expect(page.getByTestId('raci-table').getByRole('row')).toHaveCount(25); // header + 9 partners + 15 roles
  await expect(page.getByTestId('monitoring-table')).toContainText('Drift');

  // a step opens to show who, when, how and the output; without a use case the blueprint references are plain labels
  const step = page.getByTestId('step-0.3');
  await expect(step.getByText('Discovery log')).toBeHidden();
  await step.getByRole('button', { name: /Answer the eight discovery questions/ }).click();
  await expect(step).toContainText('Discovery log');
  await expect(step.getByRole('link')).toHaveCount(0);

  // choosing a use case turns every reference into a link to that blueprint's section
  await page.getByTestId('guide-domain').selectOption('fintech');
  await page.getByTestId('guide-uc').selectOption('fintech/real-time-card-upi-fraud-detection');
  await expect(page).toHaveURL(/uc=fintech/);
  await expect(page.getByTestId('guide-uc-status')).toContainText('Real-Time Card & UPI Fraud Detection');
  await expect(step.getByRole('link')).toHaveAttribute(
    'href',
    /\/fintech\/real-time-card-upi-fraud-detection\/?#disc-questions$/,
  );

  // progress is ticked per step and survives a reload
  await step.getByRole('checkbox').check();
  await expect(page.getByTestId('guide-progress')).toContainText('1 of 69 steps done');
  await page.reload();
  await expect(page.getByTestId('guide-uc')).toHaveValue('fintech/real-time-card-upi-fraud-detection');
  await expect(page.getByTestId('guide-progress')).toContainText('1 of 69 steps done');
  await expect(page.getByTestId('step-0.3').getByRole('checkbox')).toBeChecked();

  // a role keeps only its own steps and says what that role does in each phase
  await page.getByTestId('guide-party').selectOption('data-engineer');
  await expect(guide).toHaveAttribute('data-party', 'data-engineer');
  await expect(page.getByTestId('step-2.5')).toBeVisible();
  await expect(page.getByTestId('step-0.3')).toHaveCount(0);
  await expect(page.getByTestId('guide-p2-yours')).toContainText('ingestion');
  await page.getByTestId('guide-party').selectOption('');
  await expect(guide.locator('[data-testid^="step-"]')).toHaveCount(69);

  // the markdown twin
  const md = await (await page.request.get('/delivery.md')).text();
  expect(md.startsWith('# BrainSiphon delivery guide')).toBe(true);
  expect(md).toContain('### 6.7 Retrain, challenge and roll back');
});

test('every blueprint section the delivery guide points at exists, on blueprints of different kinds', async ({
  page,
}) => {
  // an online scoring system with agents, a batch forecast with a "no agent" verdict, and an LLM product
  for (const slug of [
    'fintech/real-time-card-upi-fraud-detection',
    'retail/demand-forecasting-sku-store',
    'saas/in-app-ai-copilot',
  ]) {
    await page.goto(`/delivery?uc=${slug}`);
    await expect(page.getByTestId('delivery-guide')).toHaveAttribute('data-uc', slug);
    const anchors = await page
      .getByTestId('delivery-guide')
      .locator(`a[href*="/${slug}"][href*="#"]`)
      .evaluateAll((links) => [...new Set(links.map((a) => (a as HTMLAnchorElement).hash.slice(1)))]);
    expect(anchors.length).toBeGreaterThan(40);
    await page.goto(`/${slug}`);
    await expect(page.getByTestId('uc-title')).toBeVisible();
    const missing = await page.evaluate((ids) => ids.filter((id) => !document.getElementById(id)), anchors);
    expect(missing, `${slug} is missing anchors the guide links to`).toEqual([]);
  }
});

test('a blueprint links to the delivery guide with itself selected, and its sections are grouped', async ({
  page,
}) => {
  await page.goto('/healthcare/sepsis-early-warning');
  for (const g of ['understand', 'design', 'prove', 'run'])
    await expect(page.getByTestId(`toc-${g}`)).toBeVisible();
  await page.getByTestId('delivery-link').click();
  await expect(page).toHaveURL(/\/delivery\?uc=healthcare/);
  await expect(page.getByTestId('guide-uc')).toHaveValue('healthcare/sepsis-early-warning');
});

test('the Evaluation section is a full plan and guardrails have their own place, on every kind of blueprint', async ({
  page,
}) => {
  // an LLM product with agents
  await page.goto('/saas/in-app-ai-copilot');
  const plan = page.getByTestId('evaluation-plan');
  for (const id of [
    'ev-question',
    'ev-offline',
    'ev-thresholds',
    'ev-ai',
    'ev-online',
    'ev-continuous',
    'ev-tests',
  ])
    await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(plan.locator('#ev-thresholds')).toContainText('Task success on golden tasks');
  await expect(plan.locator('#ev-ai')).toContainText('Evidence validity');
  await expect(plan.locator('#ev-online')).toContainText('Stopping rules');
  const guard = page.getByTestId('guardrails');
  await expect(guard).toHaveAttribute('data-agent-controls', 'true');
  for (const layer of [
    'Hard constraint',
    'Runtime control',
    'Outcome guardrail',
    'Human oversight',
    'Degradation',
  ])
    await expect(guard).toContainText(layer);
  await expect(guard).toContainText('Prompt injection');
  await expect(page.getByTestId('guardrails-no-agent')).toHaveCount(0);
  await expect(page.locator('nav[aria-label="On this page"]')).toContainText('Governance & guardrails');

  // a batch forecast with no agent: no LLM evaluation, and the guardrails say why there are no prompt or tool controls
  await page.goto('/retail/demand-forecasting-sku-store');
  await expect(page.locator('#ev-thresholds')).toContainText('WAPE and weighted pinball loss');
  await expect(page.locator('#ev-online')).toContainText('rolling origin backtest');
  await expect(page.locator('#ev-ai')).toHaveCount(0);
  await expect(page.getByTestId('guardrails')).toHaveAttribute('data-agent-controls', 'false');
  await expect(page.getByTestId('guardrails-no-agent')).toContainText('no language model or agent');
  await expect(page.getByTestId('guardrails')).not.toContainText('Runtime control');

  const md = await (await page.request.get('/retail/demand-forecasting-sku-store.md')).text();
  expect(md).toContain('### Release thresholds');
  expect(md).toContain('### Guardrails: what must not happen, and what enforces it');
});

test('delivery guide indexes evaluation, guardrails and governance and maps the frameworks', async ({
  page,
}) => {
  await page.goto('/delivery?uc=saas/in-app-ai-copilot');
  const index = page.getByTestId('assurance-table');
  for (const c of [
    'Evaluation',
    'Guardrails',
    'Governance and approvals',
    'Responsible AI',
    'Security',
    'Monitoring',
  ])
    await expect(index.getByRole('cell', { name: c, exact: true })).toBeVisible();
  // with a use case chosen, the index links straight into that blueprint
  await expect(
    index
      .getByRole('row', { name: /^Guardrails/ })
      .locator('a[href*="/saas/in-app-ai-copilot"][href$="#gov-guardrails"]'),
  ).toHaveCount(1);
  const frameworks = page.getByTestId('frameworks-table');
  for (const f of [
    'EU AI Act',
    'NIST AI Risk Management Framework',
    'ISO/IEC 42001',
    'OWASP Top 10',
    'Article 35',
  ])
    await expect(frameworks).toContainText(f);
  await expect(page.getByTestId('owasp-table').getByRole('row')).toHaveCount(11);

  // a step link in the index opens that step, even when a role filter was hiding it
  await page.getByTestId('guide-party').selectOption('finance');
  await expect(page.getByTestId('step-3.9')).toHaveCount(0);
  await index.getByRole('link', { name: '3.9', exact: true }).first().click();
  await expect(page.getByTestId('delivery-guide')).toHaveAttribute('data-party', 'all');
  await expect(page.getByTestId('step-3.9')).toContainText('Evaluation harness in CI');
  await expect(page.getByTestId('step-3.9')).toBeInViewport();
});

test('about page explains the platform, blueprint anatomy, role guides, and navigation', async ({ page }) => {
  await page.goto('/');
  const aboutLink = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' });
  await expect(aboutLink.first()).toBeVisible();
  await aboutLink.first().click();
  await expect(page).toHaveURL(/\/about$/);

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Signal in.');
  await expect(page.getByTestId('about-stats')).toContainText('500');
  await expect(page.getByRole('heading', { name: 'What is BrainSiphon?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What Every Single Blueprint Contains' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to Read BrainSiphon by Role' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Signal vs. Noise Across Archetypes' })).toBeVisible();
});

test('the home page states what has and has not been checked, from the release manifest', async ({
  page,
  request,
}) => {
  const m = await (await request.get('/release.json')).json();
  await page.goto('/');
  const strip = page.getByTestId('manifest-transparency');
  await expect(strip.getByTestId('manifest-tile')).toHaveCount(5);
  const f = m.checks.feasibility;
  await expect(strip).toContainText(
    `${f.pass.toLocaleString('en-US')} passed · ${f.warn} warnings · ${f.fail} failed`,
  );
  await expect(strip).toContainText(`${m.checks.domainExpert.reviewed} of 500`);
  await expect(strip).toContainText(`${m.checks.productionEvidence.claimed} of 500`);
  await expect(page.getByText(/production-grade|battle-tested/i)).toHaveCount(0);
  await strip.getByTestId('release-report-link').click();
  await expect(page).toHaveURL(/\/release$/);
});

test('the release report lists maturity levels, kit runs and every feasibility warning with its remediation', async ({
  page,
  request,
}) => {
  const m = await (await request.get('/release.json')).json();
  await page.goto('/release');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What has been checked');
  await expect(page.getByTestId('release-identity')).toContainText(m.contentVersion);
  await expect(page.getByTestId('maturity-ladder').locator('tbody tr')).toHaveCount(7);
  await expect(page.getByTestId('ladder-expert-validated')).toContainText('0 of 500');
  await expect(page.getByTestId('ladder-production-evidenced')).toContainText('0 of 500');

  const warnings = page.getByTestId('feasibility-warning');
  await expect(warnings).toHaveCount(m.checks.feasibility.warnings.length);
  expect(m.checks.feasibility.warnings.length).toBeGreaterThan(0);
  const first = m.checks.feasibility.warnings[0];
  await expect(warnings.first()).toContainText(first.title);
  await expect(warnings.first()).toContainText('Recommended remediation');
  await expect(warnings.first()).toContainText(first.remediation);
  await expect(page.getByTestId('release-outstanding').getByRole('listitem').first()).toContainText(
    'no domain-expert review',
  );

  // a warning leads to the affected blueprint, whose scorecard carries the same remediation
  await warnings.first().getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`/${first.slug}#validation$`));
  await expect(page.getByTestId('maturity-feasibility-validated')).toHaveAttribute(
    'data-state',
    'met-with-warnings',
  );
  await expect(page.getByTestId('maturity-feasibility-validated')).toContainText(first.remediation);
  expect((await request.get('/release-report.md')).ok()).toBe(true);
});

test('every blueprint carries a seven-level maturity scorecard with evidence, reviewer and outstanding work', async ({
  page,
}) => {
  await page.goto('/fintech/real-time-card-upi-fraud-detection');
  const chip = page.getByTestId('maturity-classification');
  await expect(chip).toContainText(/Maturity \d of 7/);
  await expect(chip).not.toContainText(/production/i);
  const card = page.getByTestId('maturity-scorecard');
  await expect(card.locator('ol > li')).toHaveCount(7);
  await expect(card.getByTestId('maturity-schema-validated')).toHaveAttribute('data-state', 'met');
  for (const id of ['expert-validated', 'platform-integrated', 'production-evidenced']) {
    const level = card.getByTestId(`maturity-${id}`);
    await expect(level).toHaveAttribute('data-state', 'not-met');
    await expect(level).toContainText('Reviewer: None');
    await expect(level).toContainText('Outstanding');
  }
  await expect(card).toContainText('It does not show that the design has been built, reviewed or');

  // without a tested starter for its exact problem, a blueprint stays at feasibility whatever else it has
  await page.goto('/healthcare/polygenic-risk-scoring');
  await expect(page.getByTestId('maturity-headline')).toContainText('Level 3 of 7');
  await expect(page.locator('#feasibility-warnings')).toContainText('Recommended remediation');
});

test('reference implementations page lists the four systems and says what is not covered', async ({
  page,
}) => {
  await page.goto('/implementations');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Reference implementations');
  const list = page.getByTestId('implementations-list');
  for (const dir of ['realtime-decisioning', 'batch-forecasting', 'rag-assistant', 'agentic-workflow']) {
    await expect(list).toContainText(dir);
  }
  const coverage = page.getByTestId('implementations-coverage');
  await expect(coverage.getByRole('row')).toHaveCount(10); // header + nine archetypes
  await expect(coverage).toContainText('No reference implementation yet');
  await expect(page.getByTestId('implementations-verified')).toContainText('Not run');
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Implementations' }),
  ).toBeVisible();
});
