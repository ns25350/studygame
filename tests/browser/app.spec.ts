import { test, expect, type Page } from '@playwright/test';
import {
  createState,
  dayKey,
  SAVE_KEY,
  startBattle,
  beginTurn,
  queueAction,
} from '../../src/model';

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
test('turn commands wait for input, preserve actor on reload, and retaliate once after all four', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.99;
  });
  await page.goto('/');
  await nav(page, 'ダンジョン');
  await page.locator('[data-action="dungeon"][data-value="practice"]').click();
  await page.locator('[data-action="start-battle"]').click();
  await expect(page.locator('.turn-battle')).toHaveAttribute('data-phase', 'ready');
  const initial = await saved(page);
  await page.waitForTimeout(1500);
  expect((await saved(page)).battle.hp).toBe(initial.battle.hp);
  expect((await saved(page)).battle.enemyHp).toBe(initial.battle.enemyHp);
  await page.getByRole('button', { name: 'ターン開始' }).click();
  await page.getByRole('button', { name: '運動の一撃', exact: true }).click();
  await expect(page.locator('.turn-actor.active')).toContainText('アオイ');
  await page.getByRole('button', { name: '戦闘を中断', exact: true }).click();
  const paused = await saved(page);
  expect(paused.battle.turn.index).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: '戦闘を再開する' }).click();
  expect((await saved(page)).battle.enemyHp).toBe(paused.battle.enemyHp);
  for (const name of ['触媒の一滴', '地層の打撃', '芽吹きの一撃']) {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toBeEnabled();
    await button.click();
  }
  await expect(page.getByRole('button', { name: 'ターン開始' })).toBeVisible();
  const next = await saved(page);
  expect(next.battle.turn.number).toBe(2);
  expect(next.battle.actions).toBe(4);
  expect(next.battle.hp).toBe(initial.battle.hp - 29);
  await page.waitForTimeout(1300);
  expect((await saved(page)).battle.hp).toBe(next.battle.hp);
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
  beginTurn(state);
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
test('landscape command buttons, reduced motion setting and retreat work', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await nav(page, 'ダンジョン');
  await page.locator('[data-action="dungeon"][data-value="practice"]').click();
  await page.locator('[data-action="start-battle"]').click();
  await page.getByRole('button', { name: 'ターン開始' }).click();
  await page.getByRole('button', { name: '運動の一撃', exact: true }).click();
  await expect(page.locator('.turn-actor.active')).toContainText('アオイ');
  await page.getByRole('button', { name: '戦闘を中断', exact: true }).click();
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
for (const [id, name] of [
  ['ko', 'コウイチロウ'],
  ['ao', 'アオイ'],
  ['io', 'イオ'],
  ['mi', 'ミナト'],
]) {
  test(`ultimate preview for ${name} has a moving camera and never consumes resources`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await nav(page, 'キャラクター');
    await page.locator(`.character-select [data-value="${id}"]`).click();
    await page.getByRole('tab', { name: 'スキル', exact: true }).click();
    const before = await saved(page);
    await page.getByRole('button', { name: '必殺演出を見る' }).click();
    await expect(page.locator('#world')).toHaveAttribute('data-cinematic', id);
    await expect(page.locator('#world')).toHaveAttribute('data-camera-shot', 'charge', {
      timeout: 7000,
    });
    await expect(page.locator('.ultimate-cutin')).toContainText(name);
    await page.getByRole('button', { name: '演出をスキップ' }).click();
    await expect(page.locator('.ultimate-cutin')).toHaveCount(0);
    expect(await saved(page)).toEqual(before);
  });
}
test('ultimate skip applies one paid hit and one reward; repeated Escape cannot duplicate it', async ({
  page,
}) => {
  const state = createState();
  startBattle(state, 'normal');
  beginTurn(state);
  state.battle!.gauges.ko = 100;
  state.battle!.enemyHp = 1;
  await seed(page, state);
  await page.getByRole('button', { name: '戦闘を再開する' }).click();
  await page.getByRole('button', { name: '虚数の衝突', exact: true }).click();
  await expect(page.locator('.ultimate-cutin')).toBeVisible();
  expect((await saved(page)).lp).toBe(70);
  expect((await saved(page)).battle.enemyHp).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '書庫を解放しました' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  const after = await saved(page);
  expect(after.lp).toBe(70);
  expect(after.gems).toBe(545);
  expect(after.clears).toBe(1);
});
test('ultimate completes naturally through every camera shot and advances only one actor', async ({
  page,
}) => {
  test.setTimeout(30000);
  const state = createState();
  startBattle(state, 'boss');
  beginTurn(state);
  state.battle!.gauges.ko = 100;
  const shadow = structuredClone(state),
    pending = queueAction(shadow, 'ultimate', () => 0.99);
  await page.addInitScript(() => {
    Math.random = () => 0.99;
  });
  await seed(page, state);
  await page.getByRole('button', { name: '戦闘を再開する' }).click();
  await page.evaluate(() => {
    (window as any).__shots = [];
    new MutationObserver(() => {
      const shot = document.querySelector('#world')?.getAttribute('data-camera-shot');
      if (shot && !(window as any).__shots.includes(shot)) (window as any).__shots.push(shot);
    }).observe(document.querySelector('#world')!, {
      attributes: true,
      attributeFilter: ['data-camera-shot'],
    });
  });
  await page.getByRole('button', { name: '虚数の衝突', exact: true }).click();
  await expect(page.locator('.ultimate-cutin')).toBeVisible();
  await expect(page.locator('.ultimate-cutin')).toHaveCount(0, { timeout: 15000 });
  const after = await saved(page);
  expect(after.battle.enemyHp).toBe(pending.after.enemyHp);
  expect(after.battle.turn.index).toBe(1);
  expect(after.battle.actions).toBe(1);
  expect(after.lp).toBe(70);
  expect(await page.evaluate(() => (window as any).__shots)).toEqual([
    'portrait',
    'charge',
    'release',
    'impact',
    'recovery',
  ]);
});
test('a saved interrupted ultimate recovers its pending effect and preserves inventory', async ({
  page,
}) => {
  const state = createState();
  startBattle(state, 'boss');
  beginTurn(state);
  state.battle!.gauges.ko = 100;
  const pending = queueAction(state, 'ultimate', () => 0.99),
    expectedHp = pending.after.enemyHp;
  await seed(page, state);
  await page.getByRole('button', { name: '戦闘を再開する' }).click();
  const after = await saved(page);
  expect(after.battle.enemyHp).toBe(expectedHp);
  expect(after.battle.turn.index).toBe(1);
  expect(after.lp).toBe(70);
  expect(after.weapons).toEqual(state.weapons);
  await page.reload();
  expect((await saved(page)).battle.enemyHp).toBe(expectedHp);
  expect((await saved(page)).lp).toBe(70);
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
