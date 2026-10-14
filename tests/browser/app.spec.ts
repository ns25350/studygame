import { test, expect, type Page } from '@playwright/test';
import { createState, dayKey, SAVE_KEY, startBattle } from '../../src/model';

const nav = (page: Page, name: string) =>
  page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), SAVE_KEY);
async function seed(page: Page, state: ReturnType<typeof createState>) {
  await page.addInitScript(
    ({ key, state }) => {
      if (!sessionStorage.getItem('test-seeded')) {
        localStorage.setItem(key, JSON.stringify(state));
        sessionStorage.setItem('test-seeded', 'yes');
      }
    },
    { key: SAVE_KEY, state },
  );
  await page.goto('/');
}
test('3D home renders without browser exceptions and links to the main workflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /冒険の力になる/ })).toBeVisible();
  await page.waitForTimeout(1300);
  expect(
    await page
      .locator('#world')
      .evaluate((canvas: HTMLCanvasElement) => !!canvas.getContext('webgl2')),
  ).toBe(true);
  await nav(page, '学習記録');
  await expect(page.getByRole('heading', { name: '今日、何を学んだ？' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('keypad study record grants correct rewards, claims daily and uses a free ticket', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, '学習記録');
  await page.locator('[data-action="key"][data-value="C"]').click();
  await page.locator('[data-action="key"][data-value="6"]').click();
  await page.locator('[data-action="key"][data-value="0"]').click();
  await page.getByLabel('教材・学んだこと', { exact: false }).fill('二次関数 / 例題12');
  await page.getByRole('button', { name: '学習を記録する', exact: true }).click();
  await expect(page.locator('.record-row')).toHaveCount(1);
  expect((await saved(page)).lp).toBe(160);
  expect((await saved(page)).exp).toBe(60);
  await nav(page, 'ホーム');
  await page.getByRole('button', { name: 'デイリー報酬を受け取る' }).click();
  expect((await saved(page)).daily.tickets).toBe(5);
  await nav(page, 'ダンジョン');
  await page.getByRole('button', { name: '挑戦する', exact: false }).click();
  await expect(page.locator('.battle-ui')).toBeVisible();
  expect((await saved(page)).daily.tickets).toBe(4);
  expect((await saved(page)).battle.free).toBe(true);
  await page.getByRole('button', { name: '戦闘を中断', exact: true }).click();
  expect((await saved(page)).lp).toBe(160);
});
test('time input via physical keypad, history timeline and delete refund reversal', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, '学習記録');
  await page.getByRole('button', { name: '時刻で入力', exact: true }).click();
  await page.locator('[data-action="activate-input"][data-value="start"]').click();
  await page.keyboard.type('0900');
  await page.locator('[data-action="activate-input"][data-value="end"]').click();
  await page.keyboard.type('1030');
  await page.getByRole('button', { name: '学習を記録する', exact: true }).click();
  expect((await saved(page)).records[0].minutes).toBe(90);
  await expect(page.locator('.timeline-block')).toHaveCount(1);
  await page.getByRole('button', { name: '数学の記録を削除' }).click();
  await page.getByRole('button', { name: '実行する' }).click();
  expect((await saved(page)).records).toHaveLength(0);
  expect((await saved(page)).lp).toBe(80);
  expect((await saved(page)).exp).toBe(0);
});
test('timer resumes after reload, records once and keyboard modal focus is contained', async ({
  page,
}) => {
  const state = createState();
  state.timer = { start: Date.now() - 125000, subject: '英語', content: '単語帳' };
  await seed(page, state);
  await page.getByRole('button', { name: '学習タイマー', exact: true }).click();
  await expect(page.locator('#timer-number')).toContainText('00:02:');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '停止して記録' })).toBeFocused();
  await page.getByRole('button', { name: '停止して記録' }).click();
  expect((await saved(page)).records).toHaveLength(1);
  expect((await saved(page)).records[0].minutes).toBe(2);
  await page.reload();
  expect((await saved(page)).timer).toBeNull();
  expect((await saved(page)).records).toHaveLength(1);
});
test('independent equipment and skills upgrade; summon grant and history persist', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'キャラクター');
  await page.getByRole('button', { name: '強化', exact: true }).click();
  expect((await saved(page)).levels.ko).toBe(2);
  await page.getByRole('tab', { name: 'スキル', exact: true }).click();
  await page.getByRole('button', { name: '一次元衝突を20素材で強化' }).click();
  expect((await saved(page)).skillLevels.ko.skill1).toBe(2);
  expect((await saved(page)).skillLevels.ko.normal).toBe(1);
  await page.getByRole('tab', { name: '武器・知識本' }).click();
  await page.locator('[data-action="upgrade"][data-kind="weapon"]').click();
  expect((await saved(page)).weapons[0].level).toBe(2);
  await nav(page, '召喚');
  await page.getByRole('button', { name: /1回召喚/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await saved(page)).gems).toBe(400);
  expect((await saved(page)).summons).toHaveLength(1);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '閉じる', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: '履歴', exact: true }).click();
  await expect(page.locator('.summon-history article')).toHaveCount(1);
});
test('plans store user text safely and analytics reflect real study', async ({ page }) => {
  await page.goto('/');
  await nav(page, '計画・分析');
  await page.getByRole('button', { name: '予定を追加', exact: true }).click();
  await page
    .getByLabel('タイトル', { exact: true })
    .fill('<img src=x onerror=alert(1)> 数学の復習');
  await page.getByRole('dialog').getByRole('button', { name: '予定を追加', exact: true }).click();
  await expect(page.locator('.plan-row strong')).toHaveText(
    '<img src=x onerror=alert(1)> 数学の復習',
  );
  expect(await page.locator('.plan-row img').count()).toBe(0);
  await page.locator('[data-action="toggle-plan"]').click();
  expect((await saved(page)).plans[0].done).toBe(true);
  await page.getByRole('tab', { name: '分析', exact: true }).click();
  await expect(page.locator('.bar-chart')).toBeVisible();
  await expect(page.locator('.analytics-stats')).toContainText('0分');
});
test('real-time movement, switching, combat win and reload never duplicate rewards', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/');
  await nav(page, 'ダンジョン');
  await page.locator('[data-action="dungeon"][data-value="practice"]').click();
  await page.getByRole('button', { name: '挑戦する', exact: false }).click();
  await page.waitForTimeout(800);
  await page.keyboard.down('d');
  await page.waitForTimeout(400);
  await page.keyboard.up('d');
  await page.getByRole('button', { name: '戦闘を中断', exact: true }).click();
  const paused = await saved(page);
  expect(paused.battle.x).toBeGreaterThan(0.2);
  await page.reload();
  expect((await saved(page)).battle.x).toBeCloseTo(paused.battle.x);
  await nav(page, 'ダンジョン');
  await page.getByRole('button', { name: '進行中の戦闘を再開' }).click();
  await page.keyboard.press('2');
  await expect(page.locator('[data-action="battle-character"][data-value="ao"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (let i = 0; i < 25; i++) {
    if (!(await page.locator('.battle-ui').count())) break;
    const attack = page.locator('[data-action="attack"][data-value="normal"]');
    await expect(attack).toHaveAttribute('aria-disabled', 'false');
    await page.keyboard.press('j');
    await page.waitForTimeout(150);
  }
  await expect(page.getByRole('dialog', { name: '訓練完了' })).toBeVisible();
  const result = await saved(page);
  expect(result.battle).toBeNull();
  expect(result.gems).toBe(500);
  expect(result.lp).toBe(80);
  expect(result.clears).toBe(0);
  expect(result.lastResult.won).toBe(true);
  await page.reload();
  expect((await saved(page)).gems).toBe(500);
  expect((await saved(page)).battle).toBeNull();
});
test('valid backup import creates a backup download, invalid import preserves the save', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, '設定');
  await page.getByRole('tab', { name: 'セーブ', exact: true }).click();
  const state = createState();
  state.lp = 321;
  await page.locator('#save-file').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'study-arcana-action-save', version: 1, state })),
  });
  await expect(page.getByRole('dialog', { name: 'セーブを置き換えますか？' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'バックアップして読み込む' }).click();
  expect((await download).suggestedFilename()).toContain('study-arcana-');
  expect((await saved(page)).lp).toBe(321);
  await page.locator('#save-file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"bad"}'),
  });
  await expect(page.getByRole('status')).toContainText('形式');
  expect((await saved(page)).lp).toBe(321);
});
test('paid battle victory grants resources once through the actual UI', async ({ page }) => {
  const state = createState();
  startBattle(state, 'normal');
  state.battle!.enemyHp = 1;
  state.battle!.char = 'ao';
  await seed(page, state);
  await page.getByRole('button', { name: '戦闘を再開する' }).click();
  await expect(page.locator('[data-action="attack"][data-value="normal"]')).toHaveAttribute(
    'aria-disabled',
    'false',
  );
  await page.keyboard.press('j');
  await expect(page.getByRole('dialog', { name: '書庫を解放しました' })).toBeVisible();
  const after = await saved(page);
  expect(after.gems).toBe(545);
  expect(after.materials).toBe(72);
  expect(after.exp).toBe(25);
  expect(after.lp).toBe(70);
  expect(after.books).toHaveLength(25);
  await page.reload();
  const reloaded = await saved(page);
  expect(reloaded.gems).toBe(545);
  expect(reloaded.clears).toBe(1);
  expect(reloaded.battle).toBeNull();
});
test('touch-style joystick pointer movement and settings are functional', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await nav(page, 'ダンジョン');
  await page.locator('[data-action="dungeon"][data-value="practice"]').click();
  await page.locator('[data-action="start-battle"]').click();
  const pad = (await page.locator('#joystick').boundingBox())!;
  await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2);
  await page.mouse.down();
  await page.mouse.move(pad.x + pad.width, pad.y + pad.height / 2);
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.getByRole('button', { name: '戦闘を中断', exact: true }).click();
  expect((await saved(page)).battle.x).toBeGreaterThan(0.3);
  await nav(page, '設定');
  await page.getByRole('switch', { name: '動きを抑える' }).click();
  await expect(page.getByRole('switch', { name: '動きを抑える' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: '撤退する', exact: true }).click();
  await page.getByRole('button', { name: '実行する' }).click();
  expect((await saved(page)).battle).toBeNull();
});
for (const viewport of [
  { width: 844, height: 390 },
  { width: 932, height: 430 },
  { width: 740, height: 360 },
  { width: 390, height: 844 },
]) {
  test(`layout and core controls are reachable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForTimeout(700);
    await expect(page.getByRole('button', { name: /学習を記録/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await nav(page, '学習記録');
    const button = page.getByRole('button', { name: '学習を記録する', exact: true });
    if (viewport.width > viewport.height) {
      const bounds = await button.boundingBox();
      expect(bounds!.y).toBeGreaterThan(70);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 20);
      const amount = await page.locator('.minute-display').boundingBox();
      expect(amount!.y + amount!.height).toBeLessThanOrEqual(viewport.height - 20);
    } else await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect(page.locator('.record-row')).toHaveCount(1);
    for (const label of ['ダンジョン', 'キャラクター', '召喚', '計画・分析', '設定']) {
      await nav(page, label);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.getByRole('button', { name: '操作方法を見る' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const close = page.getByRole('dialog').getByRole('button', { name: '閉じる', exact: true });
    const r = await close.boundingBox();
    expect(r!.y).toBeGreaterThanOrEqual(0);
    expect(r!.y + r!.height).toBeLessThan(viewport.height);
    await close.click();
  });
}
test('PWA precaches every local asset and supports a cold offline launch and record', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async () =>
    (await caches.keys()).filter((k) => k.startsWith('study-arcana-action-')),
  );
  expect(cached).toHaveLength(1);
  const manifest = await page.request.get('/manifest.webmanifest');
  const data = await manifest.json();
  expect(data.orientation).toBe('landscape');
  expect(data.icons).toHaveLength(3);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /冒険の力になる/ })).toBeVisible();
  await nav(page, '学習記録');
  await page.getByRole('button', { name: '学習を記録する', exact: true }).click();
  expect((await saved(page)).records[0].minutes).toBe(25);
  expect((await saved(page)).records[0].date).toBe(dayKey());
  await context.setOffline(false);
});
