import {
  ACTIONS,
  BOOK_BASE,
  CHARACTER_IDS,
  CHARACTERS,
  DUNGEONS,
  SUBJECTS,
  WEAPONS,
  type ActionId,
  type CharacterId,
  type Mode,
} from './data';

export interface StudyRecord {
  id: string;
  date: string;
  subject: string;
  content: string;
  minutes: number;
  start?: string;
  end?: string;
}
export interface Weapon {
  id: string;
  template: number;
  level: number;
}
export interface Book {
  id: string;
  slot: number;
  edition: number;
  level: number;
}
export interface Plan {
  id: string;
  title: string;
  category: '課題' | '自主学習';
  due: string;
  done: boolean;
}
export type BattlePhase = 'ready' | 'command' | 'animating' | 'enemy';
export type SkillAfter = Pick<
  Battle,
  | 'enemyHp'
  | 'hp'
  | 'shield'
  | 'mass'
  | 'initialMass'
  | 'speed'
  | 'collision'
  | 'poison'
  | 'buff'
  | 'buffLeft'
>;
export interface PendingAction {
  id: string;
  actor: CharacterId;
  action: ActionId;
  applied: boolean;
  damage: number;
  critical: boolean;
  heal: number;
  shield: number;
  after: SkillAfter;
}
export interface TurnState {
  version: 1;
  number: number;
  index: number;
  phase: BattlePhase;
  pending: PendingAction | null;
  log: string[];
}
export const newTurn = (number = 1): TurnState => ({
  version: 1,
  number,
  index: 0,
  phase: 'ready',
  pending: null,
  log: [],
});
export interface Battle {
  turn: TurnState;
  mode: Mode;
  free: boolean;
  enemyHp: number;
  hp: number;
  maxHp: number;
  shield: number;
  sp: number;
  gauges: Record<CharacterId, number>;
  char: CharacterId;
  x: number;
  z: number;
  enemyX: number;
  enemyZ: number;
  elapsed: number;
  actions: number;
  poison: number;
  mass: number;
  initialMass: number;
  speed: number;
  collision: boolean;
  buff: number;
  buffLeft: number;
  cooldowns: Record<ActionId, number>;
  enemyClock: number;
  poisonClock: number;
  targetX: number;
  targetZ: number;
}
export interface Summon {
  id: string;
  at: string;
  banner: string;
  rarity: 'S' | 'A' | 'B';
  name: string;
  kind: 'weapon' | 'character';
  info: string;
}
export interface Result {
  turns?: number;
  won: boolean;
  mode: Mode;
  elapsed: number;
  actions: number;
  gems: number;
  materials: number;
  exp: number;
  book: number;
}
export interface State {
  version: 1;
  lp: number;
  gems: number;
  materials: number;
  exp: number;
  records: StudyRecord[];
  plans: Plan[];
  daily: { date: string; claimed: boolean; tickets: number };
  levels: Record<CharacterId, number>;
  skillLevels: Record<CharacterId, Record<ActionId, number>>;
  weapons: Weapon[];
  books: Book[];
  loadouts: Record<CharacterId, { weapon: string; books: string[] }>;
  pity: Record<string, { count: number; guaranteed: boolean }>;
  copies: Record<CharacterId, number>;
  summons: Summon[];
  weaponTarget: number;
  selected: CharacterId;
  baseLP: number;
  clears: number;
  booksEarned: number;
  best: { seconds: number; studyMinutes: number; turns?: number } | null;
  actionBest?: { seconds: number; studyMinutes: number };
  timer: { start: number; subject: string; content: string } | null;
  battle: Battle | null;
  lastResult: Result | null;
}
export const SAVE_KEY = 'study-arcana-action-v1';
export const DEVICE_KEY = 'study-arcana-action-device-v1';
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const rank = (s: State) => Math.min(30, 1 + Math.floor(s.exp / 180));
export const levelCap = (s: State) =>
  rank(s) < 5 ? 20 : rank(s) < 10 ? 30 : rank(s) < 15 ? 40 : rank(s) < 20 ? 50 : 60;
export const totalMinutes = (s: State) => s.records.reduce((n, r) => n + r.minutes, 0);
export const todayMinutes = (s: State, date = dayKey()) =>
  s.records.filter((r) => r.date === date).reduce((n, r) => n + r.minutes, 0);
export function createState(): State {
  const s: State = {
    version: 1,
    lp: 80,
    gems: 500,
    materials: 60,
    exp: 0,
    records: [],
    plans: [],
    daily: { date: dayKey(), claimed: false, tickets: 0 },
    levels: {} as State['levels'],
    skillLevels: {} as State['skillLevels'],
    weapons: [],
    books: [],
    loadouts: {} as State['loadouts'],
    pity: Object.fromEntries(
      ['ko', 'ao', 'io', 'weapon'].map((k) => [k, { count: 0, guaranteed: false }]),
    ),
    copies: { ko: 0, ao: 0, io: 0, mi: 0 },
    summons: [],
    weaponTarget: 0,
    selected: 'ko',
    baseLP: 10,
    clears: 0,
    booksEarned: 0,
    best: null,
    timer: null,
    battle: null,
    lastResult: null,
  };
  CHARACTER_IDS.forEach((id, i) => {
    s.levels[id] = 1;
    s.skillLevels[id] = { normal: 1, skill1: 1, skill2: 1, ultimate: 1 };
    const weapon = { id: `starter-weapon-${id}`, template: 23 + i, level: 1 };
    s.weapons.push(weapon);
    const books = Array.from({ length: 6 }, (_, slot) => ({
      id: `starter-book-${id}-${slot}`,
      slot,
      edition: 0,
      level: 0,
    }));
    s.books.push(...books);
    s.loadouts[id] = { weapon: weapon.id, books: books.map((b) => b.id) };
  });
  return s;
}
export function refreshDaily(s: State, date = dayKey()) {
  if (s.daily.date !== date) s.daily = { date, claimed: false, tickets: 0 };
}
export function claimDaily(s: State) {
  refreshDaily(s);
  if (s.daily.claimed || todayMinutes(s) < 15)
    throw new Error('今日の学習を15分以上記録すると受け取れます。');
  s.daily.claimed = true;
  s.daily.tickets = 5;
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function clockMinutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return -1;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
export function recordStudy(s: State, input: Omit<StudyRecord, 'id'>) {
  if (
    !validDate(input.date) ||
    !SUBJECTS.includes(input.subject as (typeof SUBJECTS)[number]) ||
    typeof input.content !== 'string' ||
    input.content.length > 80 ||
    !Number.isInteger(input.minutes) ||
    input.minutes < 1 ||
    input.minutes > 720
  )
    throw new Error('日付・科目と、1〜720分の学習時間を確認してください。');
  if (input.start || input.end) {
    const start = clockMinutes(input.start ?? '');
    const end = clockMinutes(input.end ?? '');
    if (start < 0 || end <= start || end - start !== input.minutes)
      throw new Error('終了時刻は開始より後にしてください（同日・最大720分）。');
  }
  const r = { ...input, content: input.content.trim(), id: uid() };
  s.records.unshift(r);
  s.lp += Math.round((r.minutes * 4) / 3);
  s.exp += r.minutes;
  return r;
}
export function removeRecord(s: State, id: string) {
  const r = s.records.find((r) => r.id === id);
  if (!r) return;
  s.lp = Math.max(0, s.lp - Math.round((r.minutes * 4) / 3));
  s.exp = Math.max(0, s.exp - r.minutes);
  s.records = s.records.filter((r) => r.id !== id);
}
export function stopTimer(s: State, now = Date.now()) {
  if (!s.timer) throw new Error('タイマーは開始されていません。');
  const timer = s.timer;
  if (now < timer.start)
    throw new Error('端末の時計が開始時刻より前です。時計を確認してください。');
  const entries: Omit<StudyRecord, 'id'>[] = [];
  let cursor = timer.start;
  // Split by local calendar day first, then by the manual-record cap.
  while (cursor < now || !entries.length) {
    const d = new Date(cursor);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const end = Math.min(now, midnight);
    let minutes = Math.max(1, Math.round((end - cursor) / 60000));
    while (minutes > 0) {
      const part = Math.min(720, minutes);
      entries.push({
        date: dayKey(d),
        subject: timer.subject,
        content: timer.content,
        minutes: part,
      });
      minutes -= part;
    }
    cursor = end;
    if (cursor >= now) break;
  }
  for (const entry of entries) recordStudy(s, entry);
  s.timer = null;
  return entries;
}
export function bookValue(b: Book) {
  return BOOK_BASE[b.slot] * [1, 1.2, 1.5][b.edition] * (1 + b.level * 0.05);
}
export function stats(s: State, id: CharacterId) {
  const loadout = s.loadouts[id],
    w = s.weapons.find((w) => w.id === loadout.weapon)!;
  const t = WEAPONS[w.template];
  const books = loadout.books.map((bid) => s.books.find((b) => b.id === bid)!);
  const values = books.map(bookValue);
  const weaponAttack =
    t.rarity === 'S' ? 70 + 12 * w.level : t.rarity === 'A' ? 35 + 8 * w.level : 5 * w.level;
  return {
    attack:
      (CHARACTERS[id].attack + s.levels[id] * 12 + weaponAttack + values[1]) *
      (1 + values[5] + (t.name === '白紙の刃' ? 0.12 : 0)),
    hp: values[0],
    defense: values[2],
    crit: Math.min(0.95, 0.3 + values[3] + (t.name === '星環のペン' ? 0.1 : 0)),
    elemental: values[4],
    weapon: t,
    weaponAttack,
    books: values,
  };
}
export function upgrade(
  s: State,
  id: CharacterId,
  kind: 'character' | 'weapon' | 'book' | 'skill',
  slot = 0,
) {
  const cost = kind === 'skill' || kind === 'book' ? 20 : 10;
  if (s.materials < cost) throw new Error('強化素材が足りません。ダンジョンで集めましょう。');
  if (s.battle && (kind === 'weapon' || kind === 'book'))
    throw new Error('装備の強化は戦闘終了・撤退後に行えます。');
  if (kind === 'character') {
    if (s.levels[id] >= levelCap(s)) throw new Error('現在のランクのレベル上限です。');
    s.levels[id]++;
  }
  if (kind === 'weapon') {
    const w = s.weapons.find((w) => w.id === s.loadouts[id].weapon)!;
    if (w.level >= levelCap(s)) throw new Error('現在のランクのレベル上限です。');
    w.level++;
  }
  if (kind === 'book') {
    const b = s.books.find((b) => b.id === s.loadouts[id].books[slot])!;
    if (b.level >= 20) throw new Error('知識本は最大レベルです。');
    b.level = Math.min(20, b.level + 4);
  }
  if (kind === 'skill') {
    const key = ACTIONS[slot];
    if (s.skillLevels[id][key] >= 10) throw new Error('この技は最大レベルです。');
    s.skillLevels[id][key]++;
  }
  s.materials -= cost;
}
export function equip(s: State, id: CharacterId, itemId: string, slot?: number) {
  if (s.battle) throw new Error('戦闘中は装備を変更できません。');
  const item =
    slot === undefined
      ? s.weapons.find((w) => w.id === itemId)
      : s.books.find((b) => b.id === itemId && b.slot === slot);
  if (!item) throw new Error('この装備は所持していません。');
  if (slot === undefined && WEAPONS[(item as Weapon).template].type !== CHARACTERS[id].weapon)
    throw new Error('武器種が一致しません。');
  if (
    CHARACTER_IDS.some(
      (other) =>
        other !== id &&
        (s.loadouts[other].weapon === itemId || s.loadouts[other].books.includes(itemId)),
    )
  )
    throw new Error('他のキャラクターが装備しています。');
  if (slot === undefined) s.loadouts[id].weapon = itemId;
  else s.loadouts[id].books[slot] = itemId;
}
export function summon(s: State, banner: string, rng = Math.random): Summon {
  if (!['ko', 'ao', 'io', 'weapon'].includes(banner))
    throw new Error('召喚の種類を選んでください。');
  if (s.gems < 100) throw new Error('星晶石が足りません。召喚には100個必要です。');
  const pity = s.pity[banner],
    cap = banner === 'weapon' ? 50 : 60;
  const roll = rng();
  const rarity = pity.count + 1 >= cap || roll < 0.05 ? 'S' : roll < 0.25 ? 'A' : 'B';
  const pick = <T>(list: T[]) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  let name: string, info: string;
  if (banner === 'weapon') {
    let template: number;
    if (rarity === 'S') {
      const hit = pity.guaranteed || rng() < 0.5;
      template = hit
        ? s.weaponTarget
        : pick(WEAPONS.map((_, i) => i).filter((i) => i < 9 && i !== s.weaponTarget));
      pity.guaranteed = !hit;
    } else
      template = pick(
        WEAPONS.map((_, i) => i).filter((i) => i >= 9 && i < 23 && WEAPONS[i].rarity === rarity),
      );
    const t = WEAPONS[template];
    name = t.name;
    info = t.type + ' · ' + t.effect;
    s.weapons.push({ id: uid(), template, level: 1 });
  } else {
    if (rarity === 'S') {
      const hit = pity.guaranteed || rng() < 0.75;
      pity.guaranteed = !hit;
      if (hit) {
        name = CHARACTERS[banner as CharacterId].name;
        s.copies[banner as CharacterId] = Math.min(6, s.copies[banner as CharacterId] + 1);
        info = CHARACTERS[banner as CharacterId].element + ' · 凸数 +1（性能変化なし）';
      } else {
        const n = pick([
          ['セツナ', '物理 · 攻撃'],
          ['リク', '地学 · 防御'],
          ['ノア', '生物 · 支援'],
        ]);
        [name, info] = n;
      }
    } else {
      const n = pick([
        ['ユキ', '物理 · 攻撃'],
        ['トオル', '地学 · 防御'],
        ['ヒナ', '化学 · 支援'],
        ['レン', '生物 · 攻撃'],
        ['カナ', '生物 · 支援'],
      ]);
      name = (rarity === 'B' ? '見習いの' : '') + n[0];
      info = n[1];
    }
    if (!Object.values(CHARACTERS).some((c) => c.name === name))
      info += ' · コレクション（出撃対象外）';
  }
  s.gems -= 100;
  pity.count = rarity === 'S' ? 0 : pity.count + 1;
  const result: Summon = {
    id: uid(),
    at: new Date().toISOString(),
    banner,
    rarity,
    name,
    kind: banner === 'weapon' ? 'weapon' : 'character',
    info,
  };
  s.summons.unshift(result);
  return result;
}
export function startBattle(s: State, mode: Mode) {
  if (s.battle) throw new Error('進行中の戦闘を再開するか、撤退してください。');
  refreshDaily(s);
  let free = mode === 'practice' || mode === 'endgame';
  if (mode === 'endgame') {
    if (s.lp < 20) throw new Error('入場には20 LPが必要です。');
    s.lp -= 20;
  }
  if (mode === 'normal' && s.daily.tickets > 0) {
    s.daily.tickets--;
    free = true;
  }
  if (!free && s.lp < s.baseLP * 4)
    throw new Error(`挑戦には${s.baseLP * 4} LP以上必要です。学習を記録して力を蓄えましょう。`);
  const maxHp = Math.round(1200 + CHARACTER_IDS.reduce((sum, id) => sum + stats(s, id).hp, 0));
  s.lastResult = null;
  s.battle = {
    turn: newTurn(),
    mode,
    free,
    enemyHp: DUNGEONS[mode].hp,
    hp: maxHp,
    maxHp,
    shield: 0,
    sp: 5,
    gauges: { ko: 0, ao: 0, io: 0, mi: 0 },
    char: 'ko',
    x: 0,
    z: 3,
    enemyX: 0,
    enemyZ: -2,
    elapsed: 0,
    actions: 0,
    poison: 0,
    mass: 0,
    initialMass: 0,
    speed: 0,
    collision: false,
    buff: 1,
    buffLeft: 0,
    cooldowns: { normal: 0, skill1: 0, skill2: 0, ultimate: 0 },
    enemyClock: 0,
    poisonClock: 0,
    targetX: 0,
    targetZ: 3,
  };
}
export function finishBattle(s: State, won: boolean) {
  const b = s.battle;
  if (!b) return null;
  const d = DUNGEONS[b.mode];
  const result = {
    won,
    turns: b.turn.number,
    mode: b.mode,
    elapsed: b.elapsed,
    actions: b.actions,
    gems: won ? d.gems : 0,
    materials: won ? d.materials : 0,
    exp: won ? d.exp : 0,
    book: won ? d.book : 0,
  };
  if (won && b.mode !== 'practice') {
    s.gems += d.gems;
    s.materials += d.materials;
    s.exp += d.exp;
    s.clears++;
    if (d.book) {
      s.books.push({
        id: uid(),
        slot: s.booksEarned % 6,
        edition: b.mode === 'endgame' ? 2 : 1,
        level: 0,
      });
      s.booksEarned++;
    }
    if (b.mode === 'endgame' && (!s.best?.turns || b.turn.number < s.best.turns)) {
      if (s.best && !s.best.turns) s.actionBest ??= { ...s.best };
      s.best = { seconds: b.elapsed, turns: b.turn.number, studyMinutes: totalMinutes(s) };
    }
  }
  s.lastResult = result;
  s.battle = null;
  return result;
}
function calculateSkill(s: State, action: ActionId, rng = Math.random) {
  const b = s.battle;
  if (!b) throw new Error('戦闘は終了しています。');
  const id = b.char,
    index = ACTIONS.indexOf(action),
    c = CHARACTERS[id],
    st = stats(s, id),
    w = st.weapon.name;
  if (!ACTIONS.includes(action)) throw new Error('技を選んでください。');
  if (b.turn.phase !== 'command' || b.char !== CHARACTER_IDS[b.turn.index])
    throw new Error('現在のキャラクターの行動を選択してください。');
  if (b.sp < c.sp[index]) throw new Error('SPが不足しています。通常攻撃で回復できます。');
  if (action === 'ultimate' && b.gauges[id] < 100) throw new Error('必殺ゲージが100必要です。');
  if (!b.free && s.lp < s.baseLP)
    throw new Error('LPが不足しています。中断して学習を記録するか、消費LPを下げてください。');
  if (!b.free) s.lp -= s.baseLP;
  b.sp -= c.sp[index];
  b.actions++;
  const L = b.free ? 1 : s.baseLP / 10,
    skill = 1 + (s.skillLevels[id][action] - 1) * 0.06;
  const critical = rng() < st.crit,
    M = L * skill * (critical ? 2.2 : 1) * (1 + st.elemental),
    A = st.attack;
  let damage = 0,
    heal = 0,
    shield = 0;
  const shieldMult = w === '地層の羅針盤' ? 1.25 : 1,
    healMult = w === '芽吹きの書杖' ? 1.25 : 1;
  if (id === 'ko') {
    if (action === 'normal') {
      damage = 0.6 * A * M;
      if (b.collision) {
        damage += ((b.mass * b.speed) / 20) * M;
        b.mass -= b.initialMass * 0.3;
        if (b.mass < 0) {
          damage += b.speed ** 2 * 0.2 * M;
          b.mass = b.speed = b.initialMass = 0;
          b.collision = false;
        }
      }
    }
    if (action === 'skill1') {
      b.mass = b.initialMass = A * skill * L;
      b.speed = 50 * skill * L;
      b.collision = true;
    }
    if (action === 'skill2') b.speed += 10 * skill * L;
    if (action === 'ultimate') {
      damage = (10 * A + (b.mass * b.speed * 3) / 20) * M;
      b.mass = b.speed = b.initialMass = 0;
      b.collision = false;
    }
  }
  if (id === 'ao') {
    if (action === 'normal') damage = 0.75 * A * M;
    if (action === 'skill1') {
      damage = 1.7 * A * M;
      b.poison += 2;
    }
    if (action === 'skill2') {
      b.buff = 1 + 0.2 * skill * L;
      b.buffLeft = 2;
    }
    if (action === 'ultimate') {
      damage = 5.5 * A * M + b.poison * 300 * L;
      b.poison = 0;
    }
  }
  if (id === 'io') {
    if (action === 'normal') damage = 0.65 * A * M;
    if (action === 'skill1') {
      damage = 0.8 * A * M;
      shield = 180 * skill * L * shieldMult;
    }
    if (action === 'skill2') shield = 130 * skill * L * shieldMult;
    if (action === 'ultimate') {
      damage = 4.5 * A * M;
      heal = 150 * skill * L * healMult;
    }
  }
  if (id === 'mi') {
    if (action === 'normal') damage = 0.7 * A * M;
    if (action === 'skill1') {
      damage = 0.9 * A * M;
      b.poison += 3;
    }
    if (action === 'skill2') heal = 170 * skill * L * healMult;
    if (action === 'ultimate') damage = 4.2 * A * M + b.poison * 180 * L;
  }
  let weaponMultiplier =
    w === '風化の針'
      ? 1.12
      : st.weapon.rarity === 'A'
        ? 1.06
        : st.weapon.rarity === 'B' && w.startsWith('見習い')
          ? 1.03
          : 1;
  if (w === '慣性の定規' && action === 'normal') weaponMultiplier *= 1.18;
  if (w === '蒼晶の試験管' && (action === 'skill1' || action === 'skill2'))
    weaponMultiplier *= 1.15;
  if (w === '黎明の定理' && action === 'ultimate') weaponMultiplier *= 1.25;
  damage = Math.max(0, Math.round(damage * weaponMultiplier * b.buff));
  b.enemyHp = Math.max(0, b.enemyHp - damage);
  b.hp = Math.min(b.maxHp, b.hp + Math.round(heal));
  b.shield += Math.round(shield);
  if (action === 'normal') b.sp = Math.min(10, b.sp + 1);
  if (action === 'ultimate') b.gauges[id] = 0;
  else
    b.gauges[id] = Math.min(100, b.gauges[id] + [28, 40, 25][index] + (w === '観測者の杖' ? 8 : 0));

  return { damage, critical, heal: Math.round(heal), shield: Math.round(shield), action, id };
}
export function beginTurn(s: State) {
  const b = s.battle;
  if (!b || b.turn.phase !== 'ready') throw new Error('ターンの開始待ちではありません。');
  if (!b.free && s.lp < s.baseLP * 4)
    throw new Error(
      `ターン開始には${s.baseLP * 4} LP必要です。消費を下げるか学習を記録してください。`,
    );
  b.turn.phase = 'command';
  b.turn.index = 0;
  b.char = 'ko';
}
export function queueAction(s: State, action: ActionId, rng = Math.random): PendingAction {
  const b = s.battle;
  if (!b) throw new Error('戦闘は終了しています。');
  const shadow = structuredClone(s),
    result = calculateSkill(shadow, action, rng),
    next = shadow.battle!;
  const after = Object.fromEntries(
    [
      'enemyHp',
      'hp',
      'shield',
      'mass',
      'initialMass',
      'speed',
      'collision',
      'poison',
      'buff',
      'buffLeft',
    ].map((k) => [k, next[k as keyof Battle]]),
  ) as SkillAfter;
  const pending = { ...result, actor: b.char, id: uid(), applied: false, after };
  // Charge exactly once before rendering; persist this pending transaction.
  s.lp = shadow.lp;
  b.sp = next.sp;
  b.gauges = next.gauges;
  b.actions = next.actions;
  b.turn.pending = pending;
  b.turn.phase = 'animating';
  return pending;
}
export function applyPendingAction(s: State, id: string) {
  const b = s.battle,
    p = b?.turn.pending;
  if (!b || !p || p.id !== id || p.applied) return null;
  Object.assign(b, p.after);
  p.applied = true;
  b.turn.log.unshift(
    `${CHARACTERS[p.actor].name}：${CHARACTERS[p.actor].skills[ACTIONS.indexOf(p.action)]}${p.damage ? ` / ${p.damage}ダメージ` : p.heal ? ` / HP +${p.heal}` : p.shield ? ` / 盾 +${p.shield}` : ' / 強化'}`,
  );
  b.turn.log = b.turn.log.slice(0, 20);
  return p;
}
export function completePendingAction(s: State, id: string) {
  const b = s.battle,
    p = b?.turn.pending;
  if (!b || !p || p.id !== id) return;
  applyPendingAction(s, id);
  b.turn.pending = null;
  if (b.enemyHp === 0) {
    finishBattle(s, true);
    return;
  }
  b.turn.index++;
  if (b.turn.index >= 4) b.turn.phase = 'enemy';
  else {
    b.turn.phase = 'command';
    b.char = CHARACTER_IDS[b.turn.index];
  }
}
export function resolveEnemyTurn(s: State, turnNumber: number) {
  const b = s.battle;
  if (!b || b.turn.phase !== 'enemy' || b.turn.number !== turnNumber) return null;
  const dot = b.poison * 90;
  b.enemyHp = Math.max(0, b.enemyHp - dot);
  if (dot) b.turn.log.unshift(`共有状態異常：${dot}ダメージ`);
  if (!b.enemyHp) {
    finishBattle(s, true);
    return { damage: 0, dot };
  }
  const damage = enemyHit(s);
  if (!s.battle) return { damage, dot };
  b.turn.log.unshift(`敵の反撃：${damage ? `${damage}ダメージ` : '盾で防御'}`);
  b.turn.log = b.turn.log.slice(0, 20);
  if (b.buffLeft > 0 && --b.buffLeft === 0) b.buff = 1;
  b.turn.number++;
  b.turn.index = 0;
  b.turn.phase = 'ready';
  b.char = 'ko';
  return { damage, dot };
}
export function recoverBattle(s: State) {
  const b = s.battle;
  if (b?.turn.phase === 'animating' && b.turn.pending) completePendingAction(s, b.turn.pending.id);
  // Enemy phases remain explicit and are resumed once by the presentation layer.
}
// Synchronous domain helper for simulations/tests; UI uses the persisted transaction above.
export function performAction(s: State, action: ActionId, rng = Math.random) {
  const p = queueAction(s, action, rng);
  applyPendingAction(s, p.id);
  completePendingAction(s, p.id);
  return p;
}
export function enemyHit(s: State) {
  const b = s.battle;
  if (!b) return 0;
  const defense = CHARACTER_IDS.reduce((n, id) => n + stats(s, id).defense, 0) / 4;
  const damage = Math.round((DUNGEONS[b.mode].attack * 1000) / (1000 + defense));
  const blocked = Math.min(b.shield, damage);
  b.shield -= blocked;
  b.hp = Math.max(0, b.hp - (damage - blocked));
  if (!b.hp) finishBattle(s, false);
  return damage - blocked;
}

// All imported values are validated before they can replace an existing save.
export function validateSave(raw: unknown): State {
  const fail = () => {
    throw new Error(
      'セーブの形式・値・装備の対応が正しくありません。現在のデータは変更していません。',
    );
  };
  const obj = raw as any;
  if (!obj || obj.format !== 'study-arcana-action-save' || obj.version !== 1) return fail();
  const s = structuredClone(obj.state) as State;
  if (!s || s.version !== 1) return fail();
  const num = (n: unknown, min = 0, max = 1e9, integer = true) =>
    typeof n === 'number' &&
    Number.isFinite(n) &&
    n >= min &&
    n <= max &&
    (!integer || Number.isInteger(n));
  const text = (t: unknown, max = 80) => typeof t === 'string' && t.length <= max;
  const unique = (items: { id: string }[]) =>
    items.every((i) => text(i?.id, 100) && !!i.id) &&
    new Set(items.map((i) => i.id)).size === items.length;
  for (const key of ['lp', 'gems', 'materials', 'exp', 'clears', 'booksEarned'] as const)
    if (!num(s[key])) return fail();
  if (
    !CHARACTER_IDS.includes(s.selected) ||
    ![10, 20, 30].includes(s.baseLP) ||
    ![0, 1, 2, 8].includes(s.weaponTarget)
  )
    return fail();
  if (!Array.isArray(s.records) || s.records.length > 100000 || !unique(s.records)) return fail();
  for (const r of s.records) {
    if (
      !validDate(r.date) ||
      !SUBJECTS.includes(r.subject as any) ||
      !text(r.content) ||
      !num(r.minutes, 1, 720)
    )
      return fail();
    if (r.start !== undefined || r.end !== undefined) {
      if (
        typeof r.start !== 'string' ||
        typeof r.end !== 'string' ||
        clockMinutes(r.start) < 0 ||
        clockMinutes(r.end) - clockMinutes(r.start) !== r.minutes
      )
        return fail();
    }
  }
  if (
    !Array.isArray(s.plans) ||
    s.plans.length > 10000 ||
    !unique(s.plans) ||
    s.plans.some(
      (p) =>
        !text(p.title) ||
        !p.title.trim() ||
        !['課題', '自主学習'].includes(p.category) ||
        (p.due !== '' && !validDate(p.due)) ||
        typeof p.done !== 'boolean',
    )
  )
    return fail();
  if (
    !s.daily ||
    !validDate(s.daily.date) ||
    typeof s.daily.claimed !== 'boolean' ||
    !num(s.daily.tickets, 0, 5)
  )
    return fail();
  if (
    !Array.isArray(s.weapons) ||
    !s.weapons.length ||
    s.weapons.length > 100000 ||
    !unique(s.weapons) ||
    s.weapons.some((w) => !num(w.template, 0, WEAPONS.length - 1) || !num(w.level, 1, 60))
  )
    return fail();
  if (
    !Array.isArray(s.books) ||
    s.books.length < 24 ||
    s.books.length > 100000 ||
    !unique(s.books) ||
    s.books.some((b) => !num(b.slot, 0, 5) || !num(b.edition, 0, 2) || !num(b.level, 0, 20))
  )
    return fail();
  const equipped = new Set<string>();
  for (const id of CHARACTER_IDS) {
    if (
      !num(s.levels?.[id], 1, 60) ||
      !num(s.copies?.[id], 0, 6) ||
      !ACTIONS.every((a) => num(s.skillLevels?.[id]?.[a], 1, 10))
    )
      return fail();
    const l = s.loadouts?.[id],
      w = s.weapons.find((w) => w.id === l?.weapon);
    if (
      !l ||
      !w ||
      WEAPONS[w.template].type !== CHARACTERS[id].weapon ||
      !Array.isArray(l.books) ||
      l.books.length !== 6
    )
      return fail();
    if (equipped.has(w.id)) return fail();
    equipped.add(w.id);
    for (let slot = 0; slot < 6; slot++) {
      const b = s.books.find((b) => b.id === l.books[slot] && b.slot === slot);
      if (!b || equipped.has(b.id)) return fail();
      equipped.add(b.id);
    }
  }
  for (const banner of ['ko', 'ao', 'io', 'weapon']) {
    const p = s.pity?.[banner];
    if (!p || !num(p.count, 0, banner === 'weapon' ? 49 : 59) || typeof p.guaranteed !== 'boolean')
      return fail();
  }
  if (
    !Array.isArray(s.summons) ||
    s.summons.length > 100000 ||
    !unique(s.summons) ||
    s.summons.some(
      (r) =>
        !['S', 'A', 'B'].includes(r.rarity) ||
        !['weapon', 'character'].includes(r.kind) ||
        !text(r.name) ||
        !text(r.info, 200) ||
        !text(r.at, 100) ||
        !Number.isFinite(Date.parse(r.at)) ||
        !['ko', 'ao', 'io', 'weapon'].includes(r.banner),
    )
  )
    return fail();
  if (
    s.timer !== null &&
    (!s.timer ||
      !num(s.timer.start, 0, Date.now()) ||
      !SUBJECTS.includes(s.timer.subject as any) ||
      !text(s.timer.content))
  )
    return fail();
  if (
    s.best !== null &&
    (!s.best || !num(s.best.seconds, 0, 1e9, false) || !num(s.best.studyMinutes))
  )
    return fail();
  if (
    s.lastResult !== null &&
    (!s.lastResult ||
      !Object.keys(DUNGEONS).includes(s.lastResult.mode) ||
      typeof s.lastResult.won !== 'boolean' ||
      !['elapsed', 'actions', 'gems', 'materials', 'exp', 'book'].every((k) =>
        num((s.lastResult as any)[k], 0, 1e9, k !== 'elapsed'),
      ))
  )
    return fail();
  if (s.battle !== null) {
    const b = s.battle;
    if (
      !b ||
      !Object.keys(DUNGEONS).includes(b.mode) ||
      !CHARACTER_IDS.includes(b.char) ||
      typeof b.free !== 'boolean' ||
      typeof b.collision !== 'boolean'
    )
      return fail();
    for (const k of [
      'enemyHp',
      'hp',
      'maxHp',
      'shield',
      'sp',
      'elapsed',
      'actions',
      'poison',
      'mass',
      'initialMass',
      'speed',
      'buff',
      'buffLeft',
      'enemyClock',
      'poisonClock',
    ] as const)
      if (!num(b[k], 0, 1e9, false)) return fail();
    if (
      (b.enemyHp <= 0 &&
        !(b.enemyHp === 0 && b.turn?.phase === 'animating' && b.turn.pending?.applied)) ||
      b.enemyHp > DUNGEONS[b.mode].hp ||
      b.hp <= 0 ||
      b.hp > b.maxHp ||
      b.sp > 10 ||
      b.enemyClock > 6 ||
      b.poisonClock > 4
    )
      return fail();
    for (const k of ['x', 'z', 'enemyX', 'enemyZ', 'targetX', 'targetZ'] as const)
      if (!num(b[k], -20, 20, false)) return fail();
    if (
      !ACTIONS.every((a) => num(b.cooldowns?.[a], 0, 10, false)) ||
      !CHARACTER_IDS.every((id) => num(b.gauges?.[id], 0, 100, false))
    )
      return fail();
  }
  if (s.best?.turns !== undefined && !num(s.best.turns, 1)) return fail();
  if (
    s.actionBest &&
    (!num(s.actionBest.seconds, 0, 1e9, false) || !num(s.actionBest.studyMinutes))
  )
    return fail();
  if (s.lastResult?.turns !== undefined && !num(s.lastResult.turns, 1)) return fail();
  if (s.battle) {
    const b = s.battle;
    if (b.turn === undefined) {
      b.turn = newTurn(Math.floor(b.actions / 4) + 1);
      b.char = 'ko';
      b.buffLeft = Math.min(2, Math.ceil(b.buffLeft / 4));
      b.cooldowns = { normal: 0, skill1: 0, skill2: 0, ultimate: 0 };
    }
    const t = b.turn;
    if (
      !t ||
      t.version !== 1 ||
      !num(t.number, 1) ||
      !num(t.index, 0, 4) ||
      !['ready', 'command', 'animating', 'enemy'].includes(t.phase) ||
      !Array.isArray(t.log) ||
      t.log.length > 20 ||
      t.log.some((l) => !text(l, 300))
    )
      return fail();
    if (t.phase === 'enemy' ? t.index !== 4 : t.index > 3) return fail();
    if (
      (t.phase === 'ready' && t.index !== 0) ||
      (t.phase !== 'enemy' && b.char !== CHARACTER_IDS[t.index])
    )
      return fail();
    const p = t.pending;
    if (t.phase === 'animating') {
      if (
        !p ||
        Object.keys(p.after ?? {})
          .sort()
          .join(',') !==
          'buff,buffLeft,collision,enemyHp,hp,initialMass,mass,poison,shield,speed' ||
        !text(p.id, 100) ||
        !p.id ||
        p.actor !== b.char ||
        !ACTIONS.includes(p.action) ||
        typeof p.applied !== 'boolean' ||
        typeof p.critical !== 'boolean' ||
        !num(p.damage) ||
        !num(p.heal) ||
        !num(p.shield) ||
        !p.after
      )
        return fail();
      for (const k of [
        'enemyHp',
        'hp',
        'shield',
        'mass',
        'initialMass',
        'speed',
        'poison',
        'buff',
        'buffLeft',
      ] as const)
        if (!num(p.after[k], 0, 1e9, false)) return fail();
      if (
        typeof p.after.collision !== 'boolean' ||
        p.after.enemyHp > DUNGEONS[b.mode].hp ||
        p.after.hp > b.maxHp ||
        p.after.hp <= 0
      )
        return fail();
      if (p.applied && Object.keys(p.after).some((k) => (b as any)[k] !== (p.after as any)[k]))
        return fail();
    } else if (p !== null) return fail();
  }
  return structuredClone(s);
}
export function exportSave(s: State) {
  return {
    format: 'study-arcana-action-save',
    version: 1,
    exportedAt: new Date().toISOString(),
    state: s,
  };
}
