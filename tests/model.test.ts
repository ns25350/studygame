import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_IDS, DUNGEONS, WEAPONS } from '../src/data';
import {
  bookValue,
  claimDaily,
  createState,
  dayKey,
  enemyHit,
  equip,
  exportSave,
  finishBattle,
  levelCap,
  performAction,
  rank,
  recordStudy,
  refreshDaily,
  removeRecord,
  startBattle,
  stats,
  stopTimer,
  summon,
  upgrade,
  validateSave,
} from '../src/model';

test('initial resources, 4 characters and 28 individually owned starter items', () => {
  const s = createState();
  assert.deepEqual([s.lp, s.gems, s.materials, s.exp, rank(s)], [80, 500, 60, 0, 1]);
  assert.equal(s.weapons.length, 4);
  assert.equal(s.books.length, 24);
  assert.equal(WEAPONS.length, 27);
  assert.equal(
    new Set(CHARACTER_IDS.flatMap((id) => [s.loadouts[id].weapon, ...s.loadouts[id].books])).size,
    28,
  );
  assert.deepEqual(validateSave(exportSave(s)), s);
});
test('study LP is rounded per record, deletion removes only corresponding LP/EXP', () => {
  const s = createState();
  const input = { date: dayKey(), subject: '数学', content: '二次関数', minutes: 15 };
  const r = recordStudy(s, input);
  assert.equal(s.lp, 100);
  assert.equal(s.exp, 15);
  recordStudy(s, { ...input, minutes: 1 });
  recordStudy(s, { ...input, minutes: 1 });
  assert.equal(s.lp, 102);
  s.lp = 2;
  removeRecord(s, r.id);
  assert.equal(s.lp, 0);
  assert.equal(s.exp, 2);
  removeRecord(s, r.id);
  assert.equal(s.exp, 2);
});
test('time records require valid same-day times, real dates, and bounded integer minutes', () => {
  const s = createState(),
    base = {
      date: '2026-10-14',
      subject: '英語',
      content: '',
      minutes: 60,
      start: '09:00',
      end: '10:00',
    };
  recordStudy(s, base);
  assert.equal(s.lp, 160);
  for (const fields of [
    { minutes: 0 },
    { minutes: 721 },
    { minutes: 1.5 },
    { date: '2026-02-30' },
    { end: '08:00' },
    { start: '25:00' },
    { subject: 'invalid' },
    { content: 'a'.repeat(81) },
  ])
    assert.throws(() => recordStudy(s, { ...base, ...fields }));
  assert.equal(s.records.length, 1);
});
test('rank and level caps follow EXP thresholds and stop at rank 30', () => {
  const s = createState();
  s.exp = 720;
  assert.equal(rank(s), 5);
  assert.equal(levelCap(s), 30);
  s.exp = 100000;
  assert.equal(rank(s), 30);
  assert.equal(levelCap(s), 60);
});
test('daily can be claimed once, tickets reset on calendar-day change', () => {
  const s = createState();
  assert.throws(() => claimDaily(s));
  recordStudy(s, { date: dayKey(), subject: '数学', content: '', minutes: 15 });
  claimDaily(s);
  assert.equal(s.daily.tickets, 5);
  assert.throws(() => claimDaily(s));
  startBattle(s, 'normal');
  assert.equal(s.daily.tickets, 4);
  assert.equal(s.battle!.free, true);
  refreshDaily(s, '2099-01-01');
  assert.equal(s.daily.tickets, 0);
  assert.equal(s.daily.claimed, false);
});
test('timer survives stored/reloaded state, rounds, and records once', () => {
  let s = createState();
  const start = Date.now() - 16 * 60000;
  s.timer = { start, subject: '物理', content: '運動' };
  s = validateSave(exportSave(s));
  const entries = stopTimer(s, start + 15.5 * 60000);
  assert.equal(entries[0].minutes, 16);
  assert.equal(s.exp, 16);
  assert.equal(s.lp, 101);
  assert.throws(() => stopTimer(s, start + 16 * 60000));
  assert.equal(s.records.length, 1);
});
test('timer splits midnight and 720-minute maximum, using local calendar dates', () => {
  const s = createState(),
    start = new Date(2026, 9, 12, 23, 50).getTime(),
    end = new Date(2026, 9, 14, 1, 0).getTime();
  s.timer = { start, subject: '化学', content: '' };
  const entries = stopTimer(s, end);
  assert.deepEqual(
    entries.map((r) => [r.date, r.minutes]),
    [
      ['2026-10-12', 10],
      ['2026-10-13', 720],
      ['2026-10-13', 720],
      ['2026-10-14', 60],
    ],
  );
  assert.equal(
    entries.reduce((n, r) => n + r.minutes, 0),
    1510,
  );
});
test('timer minimum is one minute; backwards clock cannot discard a timer', () => {
  const s = createState(),
    start = Date.now();
  s.timer = { start, subject: '英語', content: '' };
  assert.throws(() => stopTimer(s, start - 1));
  assert.ok(s.timer);
  assert.equal(stopTimer(s, start + 100)[0].minutes, 1);
});
test('equipment upgrades belong to the actual item and illegal ownership is rejected', () => {
  const s = createState();
  s.materials = 1000;
  upgrade(s, 'ko', 'weapon');
  const old = s.loadouts.ko.weapon;
  s.weapons.push({ id: 'sword', template: 0, level: 1 });
  equip(s, 'ko', 'sword');
  upgrade(s, 'ko', 'weapon');
  equip(s, 'ko', old);
  assert.equal(s.weapons.find((w) => w.id === old)!.level, 2);
  assert.equal(s.weapons.find((w) => w.id === 'sword')!.level, 2);
  assert.throws(() => equip(s, 'ao', 'sword'));
  assert.throws(() => equip(s, 'ao', s.loadouts.ko.books[0], 0));
  upgrade(s, 'ko', 'book', 0);
  assert.equal(s.books[0].level, 4);
  assert.equal(bookValue(s.books[0]), 144);
  upgrade(s, 'ko', 'skill', 1);
  assert.equal(s.skillLevels.ko.skill1, 2);
  assert.equal(s.skillLevels.ko.normal, 1);
  startBattle(s, 'practice');
  assert.throws(() => upgrade(s, 'ko', 'weapon'));
  assert.throws(() => equip(s, 'ko', old));
  upgrade(s, 'ko', 'character');
  assert.equal(s.levels.ko, 2);
});
test('paid entry checks reserve without spending; endgame costs 20 only; practice has no reward', () => {
  const s = createState();
  startBattle(s, 'normal');
  assert.equal(s.lp, 80);
  assert.equal(s.battle!.free, false);
  s.battle = null;
  startBattle(s, 'endgame');
  assert.equal(s.lp, 60);
  assert.equal(s.battle!.free, true);
  s.battle = null;
  s.lp = 0;
  assert.throws(() => startBattle(s, 'normal'));
  startBattle(s, 'practice');
  finishBattle(s, true);
  assert.deepEqual([s.lp, s.gems, s.materials, s.exp, s.clears], [0, 500, 60, 0, 0]);
});
test('normal attack consumes LP once, builds SP/gauge, supports save resume without reapplying', () => {
  let s = createState();
  startBattle(s, 'normal');
  const b = s.battle!;
  b.x = b.enemyX;
  b.z = b.enemyZ + 2;
  const a = stats(s, 'ko').attack;
  const r = performAction(s, 'normal', () => 1);
  assert.equal(r.damage, Math.round(0.6 * a * 1.08));
  assert.deepEqual([s.lp, b.sp, b.gauges.ko, b.actions], [70, 6, 28, 1]);
  assert.throws(() => performAction(s, 'normal'));
  assert.equal(s.lp, 70);
  s = validateSave(exportSave(s));
  assert.equal(s.battle!.enemyHp, DUNGEONS.normal.hp - r.damage);
  assert.equal(s.lp, 70);
});
test('skills enforce range, SP and ultimate gauge before charging resources', () => {
  const s = createState();
  startBattle(s, 'normal');
  assert.throws(() => performAction(s, 'normal'));
  assert.equal(s.lp, 80);
  s.battle!.sp = 0;
  assert.throws(() => performAction(s, 'skill1'));
  assert.throws(() => performAction(s, 'ultimate'));
  assert.equal(s.lp, 80);
});
test('collision retains initial-mass subtraction and double LP scaling', () => {
  const s = createState();
  s.lp = 1000;
  s.baseLP = 20;
  startBattle(s, 'boss');
  const b = s.battle!;
  b.x = 0;
  b.z = 0;
  b.enemyZ = -2;
  performAction(s, 'skill1', () => 1);
  const initial = stats(s, 'ko').attack * 2;
  assert.equal(b.mass, initial);
  assert.equal(b.speed, 100);
  assert.equal(b.sp, 0);
  let expectedMass = initial;
  for (let i = 0; i < 4; i++) {
    b.cooldowns.normal = 0;
    b.enemyHp = 30000;
    performAction(s, 'normal', () => 1);
    expectedMass -= initial * 0.3;
    if (i < 3) assert.ok(Math.abs(b.mass - expectedMass) < 1e-6);
  }
  assert.equal(b.mass, 0);
  assert.equal(b.speed, 0);
  assert.equal(b.collision, false);
});
test('shared shield, healing cap, enemy defense, shared poison and Ao buff', () => {
  const s = createState();
  startBattle(s, 'practice');
  const b = s.battle!;
  b.char = 'io';
  b.z = 0;
  performAction(s, 'skill1', () => 1);
  assert.equal(b.shield, 180);
  const hp = b.hp;
  assert.equal(enemyHit(s), 0);
  assert.equal(b.hp, hp);
  b.char = 'mi';
  b.sp = 10;
  b.cooldowns.skill1 = 0;
  performAction(s, 'skill1', () => 1);
  assert.equal(b.poison, 3);
  b.char = 'ao';
  b.sp = 10;
  b.cooldowns.skill2 = 0;
  performAction(s, 'skill2', () => 1);
  assert.equal(b.buff, 1.2);
  assert.equal(b.buffLeft, 8);
  b.char = 'mi';
  b.cooldowns.skill2 = 0;
  performAction(s, 'skill2', () => 1);
  assert.equal(b.hp, b.maxHp);
});
test('win atomically grants each reward once and cycles the six book slots', () => {
  const s = createState();
  startBattle(s, 'normal');
  s.battle!.z = 0;
  s.battle!.enemyHp = 1;
  performAction(s, 'normal', () => 1);
  assert.equal(s.battle, null);
  assert.equal(s.gems, 545);
  assert.equal(s.materials, 72);
  assert.equal(s.books.length, 25);
  assert.equal(s.books[24].slot, 0);
  assert.equal(s.books[24].edition, 1);
  assert.equal(s.exp, 25);
  assert.equal(s.clears, 1);
  finishBattle(s, true);
  assert.equal(s.gems, 545);
});
test('endgame best only improves on faster clear and captures cumulative study', () => {
  const s = createState();
  s.lp = 1000;
  for (const seconds of [40, 50, 40, 30]) {
    startBattle(s, 'endgame');
    s.battle!.elapsed = seconds;
    finishBattle(s, true);
  }
  assert.equal(s.best!.seconds, 30);
  assert.equal(s.booksEarned, 4);
  assert.equal(s.books[27].slot, 3);
  assert.equal(s.books[27].edition, 2);
});
test('character pity is per banner, guarantee survives losing S, duplicates cap at six', () => {
  const s = createState();
  s.gems = 10000;
  s.pity.ko.count = 59;
  const first = summon(s, 'ko', () => 0.99);
  assert.equal(first.rarity, 'S');
  assert.equal(s.pity.ko.guaranteed, true);
  assert.equal(s.pity.ko.count, 0);
  assert.equal(s.pity.ao.count, 0);
  s.pity.ko.count = 59;
  const next = summon(s, 'ko', () => 0.99);
  assert.equal(next.name, 'コウイチロウ');
  assert.equal(s.pity.ko.guaranteed, false);
  assert.equal(s.copies.ko, 1);
  s.copies.ko = 6;
  s.pity.ko.count = 59;
  s.pity.ko.guaranteed = true;
  summon(s, 'ko', () => 0.99);
  assert.equal(s.copies.ko, 6);
});
test('weapon target changes preserve pity and guarantee, repeated weapons have unique IDs', () => {
  const s = createState();
  s.gems = 10000;
  s.pity.weapon.count = 49;
  const first = summon(s, 'weapon', () => 0.99);
  assert.equal(first.rarity, 'S');
  assert.equal(s.pity.weapon.guaranteed, true);
  s.weaponTarget = 8;
  s.pity.weapon.count = 49;
  summon(s, 'weapon', () => 0.99);
  assert.equal(s.weapons[5].template, 8);
  s.pity.weapon.guaranteed = true;
  s.pity.weapon.count = 49;
  summon(s, 'weapon', () => 0.99);
  assert.equal(s.weapons[6].template, 8);
  assert.notEqual(s.weapons[5].id, s.weapons[6].id);
  s.gems = 0;
  const count = s.summons.length;
  assert.throws(() => summon(s, 'weapon'));
  assert.equal(s.summons.length, count);
});
test('save rejects corrupt numeric values, duplicate IDs, forged equipment and invalid battle', () => {
  const corrupt = [
    (s: any) => (s.lp = -1),
    (s: any) => (s.exp = Infinity),
    (s: any) => (s.weapons[1].id = s.weapons[0].id),
    (s: any) => (s.loadouts.ko.weapon = s.loadouts.ao.weapon),
    (s: any) => (s.loadouts.ko.books[1] = s.loadouts.ko.books[0]),
    (s: any) => (s.pity.ko.count = 60),
    (s: any) =>
      (s.records = [{ id: 'x', date: '2026-02-30', minutes: 15, subject: '数学', content: '' }]),
    (s: any) => {
      startBattle(s, 'practice');
      s.battle.enemyHp = 10000;
    },
    (s: any) => {
      startBattle(s, 'practice');
      s.battle.cooldowns.normal = -1;
    },
    (s: any) => {
      startBattle(s, 'practice');
      s.battle.x = NaN;
    },
  ];
  for (const apply of corrupt) {
    const s = createState();
    apply(s);
    assert.throws(() => validateSave(exportSave(s)));
  }
  assert.throws(() =>
    validateSave({ format: 'study-arcana-save', version: 1, state: createState() }),
  );
});
