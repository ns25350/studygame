import {
  createIcons,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookMarked,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CloudMoon,
  Compass,
  Delete,
  Download,
  Flag,
  Gamepad2,
  Gem,
  HardDrive,
  History,
  Info,
  Layers3,
  LockKeyhole,
  Maximize,
  Move,
  NotebookPen,
  Orbit,
  Pause,
  Play,
  Plus,
  ScanEye,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldPlus,
  Skull,
  Smartphone,
  Sparkles,
  Sword,
  Swords,
  Target,
  Ticket,
  Timer,
  Trash2,
  Upload,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide';
import {
  ACTIONS,
  BOOK_NAMES,
  CHARACTERS,
  CHARACTER_IDS,
  DUNGEONS,
  EDITIONS,
  SUBJECTS,
  WEAPONS,
  type ActionId,
  type CharacterId,
  type Mode,
} from './data';
import {
  SAVE_KEY,
  DEVICE_KEY,
  claimDaily,
  clockMinutes,
  createState,
  dayKey,
  enemyHit,
  equip,
  exportSave,
  finishBattle,
  performAction,
  recordStudy,
  refreshDaily,
  removeRecord,
  startBattle,
  stats,
  stopTimer,
  summon,
  todayMinutes,
  uid,
  upgrade,
  validDate,
  validateSave,
  type State,
} from './model';
import {
  clock,
  duration,
  esc,
  icon,
  modal,
  number,
  renderApp,
  summonResult,
  timeToNumber,
  type Screen,
  type UIState,
} from './ui';
import { World } from './world';
import './style.css';

const icons = {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookMarked,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CloudMoon,
  Compass,
  Delete,
  Download,
  Flag,
  Gamepad2,
  Gem,
  HardDrive,
  History,
  Info,
  Layers3,
  LockKeyhole,
  Maximize,
  Move,
  NotebookPen,
  Orbit,
  Pause,
  Play,
  Plus,
  ScanEye,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldPlus,
  Skull,
  Smartphone,
  Sparkles,
  Sword,
  Swords,
  Target,
  Ticket,
  Timer,
  Trash2,
  Upload,
  Users,
  Wind,
  X,
  Zap,
};
const app = document.querySelector<HTMLDivElement>('#app')!;
const modalRoot = document.querySelector<HTMLDivElement>('#modal-root')!;
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
let persistenceBlocked = false,
  startupWarning = '';
function load(): State {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw)
      return validateSave({
        format: 'study-arcana-action-save',
        version: 1,
        state: JSON.parse(raw),
      });
  } catch {
    persistenceBlocked = true;
    startupWarning =
      'セーブを読み込めませんでした。元のデータは保持しています。設定からバックアップを読み込めます。';
  }
  return createState();
}
let state = load();
refreshDaily(state);
const ui: UIState = {
  screen: 'home',
  tab: '',
  study: {
    date: dayKey(),
    subject: '数学',
    content: '',
    mode: 'minutes',
    minutes: '25',
    start: '0900',
    end: '1000',
    active: 'minutes',
  },
  dungeon: 'normal',
  banner: 'ko',
  equipmentSlot: null,
  historyPage: 0,
  result: false,
};
let device = { sound: false, reduced: false };
try {
  const raw = JSON.parse(localStorage.getItem(DEVICE_KEY) || '{}');
  device = { sound: raw.sound === true, reduced: raw.reduced === true };
} catch {
  /* Device settings are optional. */
}
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const world = new World(canvas);
let modalKind = '',
  focusBeforeModal: HTMLElement | null = null,
  pendingImport: State | null = null;
let toastTimeout = 0,
  saveWarningShown = false,
  inputStarted = false;
let viewStack: Screen[] = [],
  audio: AudioContext | null = null;
let installPrompt: any = null,
  registration: ServiceWorkerRegistration | undefined;
let joystick = { x: 0, z: 0 },
  keys = new Set<string>(),
  dodgeLeft = 0,
  dodgeCooldown = 0,
  lastDirection = { x: 0, z: -1 };

function refreshIcons() {
  createIcons({ icons, attrs: { 'stroke-width': 1.65 } });
}
function save() {
  if (persistenceBlocked) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    if (!saveWarningShown) {
      toast(
        '保存容量またはブラウザ設定により自動保存できません。設定からJSONを書き出してください。',
        8000,
      );
      saveWarningShown = true;
    }
  }
}
function saveDevice() {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  } catch {
    toast('端末設定を保存できませんでした。');
  }
  applyMotion();
}
function applyMotion() {
  world.reduced = device.reduced || motionQuery.matches;
  document.documentElement.classList.toggle('reduced-motion', world.reduced);
}
applyMotion();
motionQuery.addEventListener('change', applyMotion);
function toast(message: string, ms = 3500) {
  const el = document.querySelector<HTMLElement>('#toast')!;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => el.classList.remove('visible'), ms);
}
function sound(type: 'success' | 'attack' | 'hit' | 'summon') {
  if (!device.sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const frequencies =
      type === 'success'
        ? [523, 659, 784]
        : type === 'summon'
          ? [392, 523, 784, 1046]
          : [type === 'attack' ? 260 : 130];
    frequencies.forEach((f, i) => {
      const oscillator = audio!.createOscillator(),
        gain = audio!.createGain(),
        t = audio!.currentTime + i * 0.09;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.065, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      oscillator.connect(gain).connect(audio!.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.27);
    });
  } catch {
    /* Audio support must never block a record or game action. */
  }
}
function change(fn: () => void, message?: string, rerender = true) {
  const before = structuredClone(state);
  try {
    refreshDaily(state);
    fn();
    save();
    if (rerender) render();
    if (message) toast(message);
    return true;
  } catch (error) {
    state = before;
    toast(error instanceof Error ? error.message : '操作を完了できませんでした。');
    return false;
  }
}
function render() {
  // Preserve focus for character, tab, and keypad interactions after local redraws.
  const focused = document.activeElement as HTMLElement | null;
  const action = focused?.dataset.action,
    value = focused?.dataset.value,
    kind = focused?.dataset.kind,
    slot = focused?.dataset.slot;
  app.innerHTML = renderApp(state, ui);
  world.setView(ui.screen);
  document.body.dataset.screen = ui.screen;
  if (ui.screen === 'settings') {
    document.querySelector('#sound-toggle')?.setAttribute('aria-checked', String(device.sound));
    document
      .querySelector('#motion-toggle')
      ?.setAttribute('aria-checked', String(device.reduced || motionQuery.matches));
    if (registration?.waiting) showUpdate();
  }
  refreshIcons();
  if (action)
    Array.from(app.querySelectorAll<HTMLElement>('[data-action]'))
      .find(
        (e) =>
          e.dataset.action === action &&
          e.dataset.value === value &&
          e.dataset.kind === kind &&
          e.dataset.slot === slot,
      )
      ?.focus({ preventScroll: true });
  if (ui.screen === 'battle') bindJoystick();
}
function navigate(screen: Screen, push = true) {
  if (ui.screen === 'battle') {
    save();
    keys.clear();
    resetJoystick();
  }
  if (screen === 'battle' && (!state.battle || !world.ready)) {
    toast(
      '3D描画を利用できません。WebGL対応ブラウザで開いてください。学習記録は引き続き使えます。',
    );
    return;
  }
  closeModal();
  if (push && screen !== ui.screen) viewStack.push(ui.screen);
  ui.screen = screen;
  ui.tab = '';
  render();
}
function goBack() {
  if (modalKind) {
    closeModal();
    return;
  }
  if (ui.screen === 'battle') {
    pauseBattle();
    return;
  }
  if (ui.tab && !['記録する', 'プロフィール', '学習予定', 'ゲーム'].includes(ui.tab)) {
    ui.tab = '';
    render();
    return;
  }
  const previous = viewStack.pop();
  navigate(previous && previous !== 'battle' ? previous : 'home', false);
}
function openModal(kind: string, title: string, body: string, footer = '', cls = '') {
  if (!modalKind) focusBeforeModal = document.activeElement as HTMLElement;
  modalKind = kind;
  keys.clear();
  resetJoystick();
  modalRoot.innerHTML = modal(title, body, footer, cls);
  app.inert = true;
  refreshIcons();
  const el = modalRoot.querySelector<HTMLElement>('input:not([type="file"]), select, button');
  el?.focus({ preventScroll: true });
}
function closeModal() {
  if (!modalKind) return;
  modalKind = '';
  modalRoot.innerHTML = '';
  app.inert = false;
  if (focusBeforeModal?.isConnected) focusBeforeModal.focus({ preventScroll: true });
  pendingImport = null;
}
const modalButton = (text: string, action: string, cls = 'primary', extra = '') =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
function confirmAction(title: string, text: string, action: string, value = '') {
  openModal(
    'confirm',
    title,
    `<p>${text}</p>`,
    modalButton('キャンセル', 'close-modal', 'secondary') +
      modalButton('実行する', action, 'primary', `data-value="${esc(value)}"`),
  );
}
function showTimer() {
  openModal(
    'timer',
    '集中タイマー',
    `<div class="timer-modal"><span class="eyebrow">TIME TO FOCUS</span><div class="timer-number" id="timer-number">${state.timer ? clock((Date.now() - state.timer.start) / 1000) : '00:00:00'}</div><p>${state.timer ? esc(state.timer.subject + (state.timer.content ? ' / ' + state.timer.content : '')) : '学びに集中しよう。時間は、ここで見守っています。'}</p>${!state.timer ? `<label class="field-label" for="timer-subject">科目</label><select class="text-input" id="timer-subject">${SUBJECTS.map((sub) => `<option ${sub === ui.study.subject ? 'selected' : ''}>${sub}</option>`).join('')}</select><label class="field-label" for="timer-content">教材・内容</label><input id="timer-content" class="text-input" maxlength="80" value="${esc(ui.study.content)}" placeholder="今日取り組むこと（任意）">` : '<small>アプリを閉じても計測します。停止時は分単位で四捨五入（最低1分）。<br>日付またぎ・720分超は分割して記録します。</small>'}</div>`,
    state.timer
      ? modalButton(icon('check') + '停止して記録', 'stop-timer')
      : modalButton(icon('play') + '集中をはじめる', 'start-timer'),
  );
}
function showControls() {
  openModal(
    'controls',
    '星の書庫での戦い方',
    `<div class="controls-guide"><div><span>${icon('move')}</span><h3>動いて、避ける</h3><p>左のパッド / WASD・矢印キーで移動。<br>赤い円の外へ移動するか、回避で攻撃をかわす。</p></div><div><span>${icon('swords')}</span><h3>4人の力をつなぐ</h3><p>左のキャラ / 1〜4キーで交代。<br>通常攻撃 J、スキル K・L、必殺 U、回避 Space。</p></div><div><span>${icon('zap')}</span><h3>学びを、力に</h3><p>通常攻撃でSPとゲージを獲得。<br>必殺はゲージ100で発動。LP不足なら中断して学習記録へ。</p></div></div><p class="quiet-note">コウイチロウ・イオは敵に近づいて攻撃。アオイ・ミナトは遠距離攻撃が可能です。<br>中断・別画面・バックグラウンド中は戦闘を停止して保存します。</p>`,
    modalButton('わかった', 'close-modal'),
  );
}
function showEquipment(slot: string) {
  const id = state.selected,
    weapon = slot === 'weapon',
    n = Number(slot);
  const items = weapon
    ? state.weapons
        .filter((w) => WEAPONS[w.template].type === CHARACTERS[id].weapon)
        .map((w) => ({
          id: w.id,
          name: WEAPONS[w.template].name,
          info: `${WEAPONS[w.template].rarity} · Lv.${w.level} · ${WEAPONS[w.template].effect}`,
          level: w.level,
        }))
    : state.books
        .filter((b) => b.slot === n)
        .map((b) => ({
          id: b.id,
          name: `${EDITIONS[b.edition]} ${BOOK_NAMES[b.slot]}`,
          info: `Lv.${b.level}`,
          level: b.level,
        }));
  openModal(
    'equipment',
    weapon ? '武器を選択' : BOOK_NAMES[n] + 'を選択',
    `<div class="equipment-list">${items
      .map((item) => {
        const owner = CHARACTER_IDS.find(
          (cid) =>
            state.loadouts[cid].weapon === item.id || state.loadouts[cid].books.includes(item.id),
        );
        return `<button data-action="equip-item" data-value="${item.id}" data-slot="${slot}" class="inventory-item ${owner === id ? 'selected' : ''}" ${owner && owner !== id ? 'disabled' : ''}><span>${icon(weapon ? 'sword' : 'book-marked')}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.info)}</small><small>${owner ? CHARACTERS[owner].name + 'が装備中' : '未装備'}</small></div>${owner === id ? icon('check') : icon('chevron-right')}</button>`;
      })
      .join(
        '',
      )}</div><p class="quiet-note">各アイテムのレベルは付け替えても保持します。他のキャラクターが装備している実物は選べません。</p>`,
  );
}
function keypad(key: string) {
  const f = ui.study,
    active = f.mode === 'minutes' ? 'minutes' : f.active === 'start' ? 'start' : 'end';
  if (key === 'C' || key === 'Delete') {
    f[active] = '';
    inputStarted = true;
  } else if (key === '⌫' || key === 'Backspace') {
    f[active] = f[active].slice(0, -1);
    inputStarted = true;
  } else if (/^\d$/.test(key)) {
    if (!inputStarted) f[active] = '';
    const max = active === 'minutes' ? 3 : 4;
    if (f[active].length < max)
      f[active] = (f[active] === '0' && active === 'minutes' ? '' : f[active]) + key;
    inputStarted = true;
  }
  render();
}
function saveStudy() {
  const f = ui.study,
    minutes =
      f.mode === 'minutes' ? Number(f.minutes) : timeToNumber(f.end) - timeToNumber(f.start);
  const format = (s: string) => s.slice(0, 2) + ':' + s.slice(2);
  const okay = change(
    () => {
      recordStudy(state, {
        date: f.date,
        subject: f.subject,
        content: f.content,
        minutes,
        ...(f.mode === 'time' ? { start: format(f.start), end: format(f.end) } : {}),
      });
    },
    `学びを記録しました。+${Math.round((minutes * 4) / 3)} LP / +${minutes} EXP`,
  );
  if (okay) {
    sound('success');
    inputStarted = false;
    ui.tab = '履歴';
    ui.historyPage = 0;
    render();
  }
}
function downloadSave() {
  const blob = new Blob([JSON.stringify(exportSave(state), null, 2)], { type: 'application/json' }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `study-arcana-${dayKey()}-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function readSave(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    toast('セーブファイルは20 MiB以下を選んでください。');
    return;
  }
  try {
    const imported = validateSave(JSON.parse(await file.text()));
    openModal(
      'import',
      'セーブを置き換えますか？',
      `<p>読み込み先：ランク ${Math.min(30, 1 + Math.floor(imported.exp / 180))} / 学習記録 ${imported.records.length}件 / LP ${number(imported.lp)}</p><p>現在のセーブをJSONでダウンロードしてから置き換えます。ダウンロードを保存してください。</p>`,
      modalButton('キャンセル', 'close-modal', 'secondary') +
        modalButton('バックアップして読み込む', 'confirm-import'),
    );
    pendingImport = imported;
  } catch (error) {
    toast(
      error instanceof SyntaxError
        ? 'JSONファイルを読み取れませんでした。現在のデータは変更していません。'
        : (error as Error).message,
      6000,
    );
  }
}
function showBattleResult() {
  const r = state.lastResult;
  if (!r) return;
  ui.screen = 'dungeons';
  world.setView('dungeons');
  render();
  openModal(
    'battle-result',
    r.won ? (r.mode === 'practice' ? '訓練完了' : '書庫を解放しました') : 'また、次の一歩へ。',
    `<div class="battle-result"><div class="result-emblem">${icon(r.won ? 'flag' : 'shield')}</div><span class="eyebrow">${r.won ? 'ARCHIVE CLEARED' : 'KEEP LEARNING'}</span><h2>${DUNGEONS[r.mode].name}</h2><p>${r.elapsed.toFixed(1)} 秒 / ${r.actions} 行動</p>${r.won ? `<div class="result-rewards"><span>${icon('gem')} +${r.gems}</span><span>${icon('layers-3')} +${r.materials}</span><span>EXP +${r.exp}</span>${r.book ? '<span>知識本 +1</span>' : ''}</div>` : '<p>獲得報酬はありません。育成や回避で、もう一度挑もう。</p>'}${r.mode === 'practice' ? '<small>訓練ではLPと報酬は変化しません。</small>' : ''}</div>`,
    modalButton('書庫へ戻る', 'close-modal'),
  );
  if (r.won) sound('success');
}
function pauseBattle() {
  save();
  navigate('dungeons');
  toast('戦闘を中断・保存しました。いつでも再開できます。');
}
function attack(action: ActionId) {
  if (ui.screen !== 'battle' || modalKind || !state.battle) return;
  const b = state.battle,
    enemyX = b.enemyX,
    enemyZ = b.enemyZ;
  try {
    const r = performAction(state, action);
    save();
    world.attack(action, b.x, b.z);
    sound('attack');
    if (r.damage)
      floatText(
        number(r.damage) + (r.critical ? ' CRIT' : ''),
        enemyX,
        3,
        enemyZ,
        r.critical ? 'crit' : '',
      );
    if (r.heal) floatText('+' + r.heal + ' HP', b.x, 3, b.z, 'heal');
    if (r.shield) floatText('+' + r.shield + ' SHIELD', b.x, 2.6, b.z, 'heal');
    if (!r.damage && !r.heal && !r.shield)
      floatText(action === 'skill1' ? '衝突状態' : '強化', b.x, 3, b.z, 'heal');
    if (!state.battle) showBattleResult();
    else updateHUD();
  } catch (error) {
    toast((error as Error).message, 2200);
  }
}
function floatText(text: string, x: number, y: number, z: number, cls = '') {
  const layer = document.querySelector('#damage-layer');
  if (!layer) return;
  const p = world.project(x, y, z),
    node = document.createElement('span');
  node.className = 'damage-number ' + cls;
  node.textContent = text;
  node.style.left = p.x + 'px';
  node.style.top = p.y + 'px';
  layer.append(node);
  setTimeout(() => node.remove(), 1300);
}
function dodge() {
  if (ui.screen !== 'battle' || modalKind || !state.battle || dodgeCooldown > 0) return;
  dodgeLeft = 0.32;
  dodgeCooldown = 1.4;
  world.dodge();
  sound('attack');
}
function resetJoystick() {
  joystick = { x: 0, z: 0 };
  document
    .querySelector<HTMLElement>('#joystick-thumb')
    ?.style.setProperty('transform', 'translate(0px, 0px)');
}
function bindJoystick() {
  const pad = document.querySelector<HTMLElement>('#joystick');
  if (!pad) return;
  let pointer: number | null = null;
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const r = pad.getBoundingClientRect(),
      dx = event.clientX - (r.left + r.width / 2),
      dz = event.clientY - (r.top + r.height / 2),
      max = r.width * 0.32;
    const length = Math.hypot(dx, dz),
      scale = length > max ? max / length : 1;
    joystick = { x: (dx * scale) / max, z: (dz * scale) / max };
    document.querySelector<HTMLElement>('#joystick-thumb')!.style.transform =
      `translate(${dx * scale}px, ${dz * scale}px)`;
  };
  pad.addEventListener('pointerdown', (e) => {
    pointer = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    move(e);
  });
  pad.addEventListener('pointermove', move);
  const end = () => {
    pointer = null;
    resetJoystick();
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  pad.addEventListener('lostpointercapture', end);
}
function switchCharacter(id: CharacterId) {
  if (!state.battle || modalKind) return;
  state.battle.char = id;
  save();
  keys.clear();
  resetJoystick();
  render();
}
function updateHUD() {
  const b = state.battle;
  if (!b || ui.screen !== 'battle') return;
  const setText = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
  };
  setText('battle-enemy-text', `${number(b.enemyHp)} / ${number(DUNGEONS[b.mode].hp)}`);
  setText('battle-clock', clock(b.elapsed));
  setText('battle-hp-text', `${number(b.hp)} / ${number(b.maxHp)}`);
  setText('battle-lp', b.free ? '無料' : number(state.lp) + ' LP');
  setText('battle-sp', b.sp + '/10');
  const shield = document.querySelector('#battle-shield');
  if (shield?.lastChild) shield.lastChild.textContent = ' ' + number(b.shield);
  document
    .querySelector<HTMLElement>('#battle-enemy-fill')
    ?.style.setProperty('width', (b.enemyHp / DUNGEONS[b.mode].hp) * 100 + '%');
  document
    .querySelector<HTMLElement>('#battle-hp-fill')
    ?.style.setProperty('width', (b.hp / b.maxHp) * 100 + '%');
  document
    .querySelectorAll<HTMLElement>('[data-sp]')
    .forEach((el) => el.classList.toggle('lit', Number(el.dataset.sp) < b.sp));
  document
    .querySelectorAll<HTMLElement>('[data-party-gauge]')
    .forEach(
      (el) => (el.textContent = Math.floor(b.gauges[el.dataset.partyGauge as CharacterId]) + '%'),
    );
  for (const action of ACTIONS) {
    const el = document.querySelector<HTMLElement>('#cooldown-' + action),
      button = el?.parentElement as HTMLButtonElement | null;
    if (el) {
      el.textContent = b.cooldowns[action] > 0 ? b.cooldowns[action].toFixed(1) : '';
      el.classList.toggle('active', b.cooldowns[action] > 0);
    }
    const index = ACTIONS.indexOf(action),
      unavailable =
        b.cooldowns[action] > 0 ||
        b.sp < CHARACTERS[b.char].sp[index] ||
        (action === 'ultimate' && b.gauges[b.char] < 100);
    button?.classList.toggle('unavailable', unavailable);
    button?.setAttribute('aria-disabled', String(unavailable));
  }
  document.querySelector('.dodge-button')?.classList.toggle('unavailable', dodgeCooldown > 0);
  setText(
    'battle-buffs',
    `${b.collision ? `衝突：質量 ${number(b.mass)} / 速さ ${number(b.speed)}　` : ''}${b.poison ? '状態異常 ×' + b.poison + '　' : ''}${b.buffLeft > 0 ? '与ダメージ ' + b.buff.toFixed(2) + '倍' : ''}`,
  );
}

document.addEventListener('click', async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || target.hasAttribute('disabled')) return;
  const action = target.dataset.action!,
    value = target.dataset.value!;
  switch (action) {
    case 'navigate':
      navigate(value as Screen);
      break;
    case 'back':
      goBack();
      break;
    case 'tab':
      ui.tab = value;
      render();
      break;
    case 'close-modal':
      closeModal();
      break;
    case 'select-character':
      change(() => {
        state.selected = value as CharacterId;
      });
      break;
    case 'subject':
      ui.study.subject = value;
      render();
      break;
    case 'activate-input':
      ui.study.active = value;
      inputStarted = false;
      render();
      break;
    case 'input-mode':
      ui.study.mode = value;
      ui.study.active = value === 'minutes' ? 'minutes' : 'start';
      inputStarted = false;
      render();
      break;
    case 'key':
      keypad(value);
      break;
    case 'save-study':
      saveStudy();
      break;
    case 'delete-record':
      confirmAction(
        'この学習記録を削除しますか？',
        '対応するLP・EXPを残高から差し引きます。ランクが下がる場合があります。',
        'confirm-delete-record',
        value,
      );
      break;
    case 'confirm-delete-record':
      change(() => removeRecord(state, value), '記録を削除しました。');
      closeModal();
      break;
    case 'history-page': {
      const count = state.records.filter((r) => r.date === ui.study.date).length;
      ui.historyPage = Math.max(
        0,
        Math.min(Math.ceil(count / 6) - 1, ui.historyPage + Number(value)),
      );
      render();
      break;
    }
    case 'timeline':
      ui.study.mode = 'time';
      ui.study.start = value.padStart(2, '0') + '00';
      ui.study.end =
        String(Math.min(23, Number(value) + 1)).padStart(2, '0') +
        (Number(value) === 23 ? '59' : '00');
      ui.study.active = 'end';
      ui.tab = '';
      inputStarted = false;
      render();
      break;
    case 'claim-daily':
      change(
        () => claimDaily(state),
        '調査証を5枚受け取りました。通常ダンジョンでLP消費が無料になります。',
      );
      break;
    case 'timer':
      showTimer();
      break;
    case 'start-timer': {
      const subject = document.querySelector<HTMLSelectElement>('#timer-subject')!.value,
        content = document.querySelector<HTMLInputElement>('#timer-content')!.value;
      if (
        change(() => {
          if (state.timer) throw new Error('タイマーは既に動いています。');
          state.timer = { start: Date.now(), subject, content };
        }, '集中タイマーを開始しました。')
      )
        showTimer();
      break;
    }
    case 'stop-timer': {
      let minutes = 0;
      if (
        change(() => {
          minutes = stopTimer(state).reduce((n, e) => n + e.minutes, 0);
        })
      ) {
        closeModal();
        sound('success');
        toast(`${minutes}分の集中を記録しました。おつかれさま！`);
      }
      break;
    }
    case 'boss':
      ui.dungeon = 'boss';
      navigate('dungeons');
      break;
    case 'dungeon':
      ui.dungeon = value as Mode;
      render();
      break;
    case 'start-battle':
      if (!world.ready) {
        toast('WebGLが利用できません。対応ブラウザでお試しください。');
        break;
      }
      if (change(() => startBattle(state, ui.dungeon), undefined, false)) {
        dodgeCooldown = dodgeLeft = 0;
        navigate('battle');
      }
      break;
    case 'resume':
      navigate('battle');
      break;
    case 'pause-battle':
      pauseBattle();
      break;
    case 'controls':
      showControls();
      break;
    case 'attack':
      attack(value as ActionId);
      break;
    case 'dodge':
      dodge();
      break;
    case 'battle-character':
      switchCharacter(value as CharacterId);
      break;
    case 'retreat':
      confirmAction(
        '戦闘から撤退しますか？',
        '消費したLP・調査証は戻りません。勝利報酬は獲得しません。',
        'confirm-retreat',
      );
      break;
    case 'confirm-retreat':
      change(() => {
        state.battle = null;
      });
      closeModal();
      break;
    case 'upgrade':
      change(
        () =>
          upgrade(
            state,
            state.selected,
            target.dataset.kind as 'character' | 'weapon' | 'book' | 'skill',
            Number(target.dataset.slot || 0),
          ),
        '強化しました。',
      );
      break;
    case 'equipment':
      showEquipment(target.dataset.slot!);
      break;
    case 'equip-item':
      if (
        change(
          () =>
            equip(
              state,
              state.selected,
              value,
              target.dataset.slot === 'weapon' ? undefined : Number(target.dataset.slot),
            ),
          '装備を変更しました。',
        )
      )
        closeModal();
      break;
    case 'banner':
      ui.banner = value;
      if (value !== 'weapon') state.selected = value as CharacterId;
      save();
      render();
      break;
    case 'summon': {
      let result: ReturnType<typeof summon> | undefined;
      if (
        change(() => {
          result = summon(state, ui.banner);
        })
      ) {
        sound('summon');
        openModal(
          'summon-result',
          '召喚結果',
          summonResult(result!),
          modalButton('閉じる', 'close-modal'),
          'summon-result-modal',
        );
      }
      break;
    }
    case 'summon-history':
      openModal(
        'summon-history',
        '召喚履歴',
        state.summons.length
          ? `<div class="summon-history">${state.summons
              .slice(0, 100)
              .map(
                (r) =>
                  `<article><span class="rarity rarity-${r.rarity}">${r.rarity}</span><div><strong>${esc(r.name)}</strong><small>${esc(r.info)}</small></div><time>${new Date(r.at).toLocaleDateString('ja-JP')}</time></article>`,
              )
              .join(
                '',
              )}</div>${state.summons.length > 100 ? '<p>最新100件を表示。全履歴はJSONに保存されます。</p>' : ''}`
          : '<p>召喚の記憶は、ここに刻まれていきます。</p>',
      );
      break;
    case 'summon-rates':
      openModal(
        'rates',
        '提供割合・天井',
        '<div class="rates-detail"><p>S 5% / A 20% / B 75%</p><p>キャラ：60回目でS確定。S時75%で限定、25%で恒常Sの3人。外すと次のSは同じバナーの限定確定。</p><p>武器：50回目でS確定。S時50%で選択武器、50%で他のS武器8種。外すと次のSは選択武器確定。選択変更でも回数・確定を保持。</p><p>各バナー独立。S当選時のみ回数を0に戻します。A・Bは各抽選プール内で均等。課金はありません。</p></div>',
      );
      break;
    case 'add-plan':
      openModal(
        'add-plan',
        '次の学びを計画する',
        '<form id="plan-form"><label class="field-label" for="plan-title">タイトル</label><input class="text-input" id="plan-title" maxlength="80" placeholder="例：英単語を20個覚える" required><label class="field-label" for="plan-category">種類</label><select id="plan-category" class="text-input"><option>課題</option><option>自主学習</option></select><label class="field-label" for="plan-due">期日（任意）</label><input id="plan-due" type="date" class="text-input"></form>',
        modalButton('予定を追加', 'save-plan'),
      );
      document.querySelector<HTMLInputElement>('#plan-title')?.focus();
      break;
    case 'save-plan': {
      const title = document.querySelector<HTMLInputElement>('#plan-title')!.value.trim(),
        category = document.querySelector<HTMLSelectElement>('#plan-category')!.value as
          '課題' | '自主学習',
        due = document.querySelector<HTMLInputElement>('#plan-due')!.value;
      if (
        change(() => {
          if (!title || title.length > 80 || (due && !validDate(due)))
            throw new Error('タイトルと期日を確認してください。');
          state.plans.push({ id: uid(), title, category, due, done: false });
        }, '予定を追加しました。')
      )
        closeModal();
      break;
    }
    case 'toggle-plan':
      change(() => {
        const p = state.plans.find((p) => p.id === value);
        if (p) p.done = !p.done;
      });
      break;
    case 'delete-plan':
      confirmAction(
        '予定を削除しますか？',
        '学習記録と獲得済みの報酬は変わりません。',
        'confirm-delete-plan',
        value,
      );
      break;
    case 'confirm-delete-plan':
      change(() => {
        state.plans = state.plans.filter((p) => p.id !== value);
      });
      closeModal();
      break;
    case 'base-lp':
      change(() => {
        state.baseLP = Number(value);
      });
      break;
    case 'toggle-sound':
      device.sound = !device.sound;
      saveDevice();
      render();
      if (device.sound) sound('success');
      break;
    case 'toggle-motion':
      device.reduced = !device.reduced;
      saveDevice();
      render();
      break;
    case 'export-save':
      downloadSave();
      toast('セーブを書き出しました。ダウンロード先を確認してください。');
      break;
    case 'import-save':
      document.querySelector<HTMLInputElement>('#save-file')!.click();
      break;
    case 'confirm-import':
      if (pendingImport) {
        const incoming = pendingImport;
        downloadSave();
        state = incoming;
        refreshDaily(state);
        persistenceBlocked = false;
        save();
        closeModal();
        render();
        toast('セーブを読み込みました。');
      }
      break;
    case 'reset-save':
      openModal(
        'reset',
        'データを初期化しますか？',
        '<p>この3D版のすべてのデータを削除します。続けるには「初期化」と入力してください。</p><input id="reset-confirm" class="text-input" aria-label="初期化と入力">',
        modalButton('キャンセル', 'close-modal', 'secondary') +
          modalButton('初期化する', 'confirm-reset', 'secondary danger'),
      );
      break;
    case 'confirm-reset':
      if (document.querySelector<HTMLInputElement>('#reset-confirm')!.value === '初期化') {
        downloadSave();
        state = createState();
        persistenceBlocked = false;
        save();
        closeModal();
        render();
        toast('バックアップを書き出し、データを初期化しました。');
      } else toast('「初期化」と入力してください。');
      break;
    case 'fullscreen':
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        toast('このブラウザでは全画面に切り替えられません。ホーム画面への追加をお試しください。');
      }
      break;
    case 'install':
      if (installPrompt) {
        await installPrompt.prompt();
        installPrompt = null;
      } else
        toast(
          matchMedia('(display-mode: standalone)').matches
            ? 'ホーム画面から起動済みです。'
            : 'Chromeのメニュー「アプリをインストール」、Safariの共有「ホーム画面に追加」を選んでください。',
          7000,
        );
      break;
    case 'check-update':
      if (registration) {
        try {
          await registration.update();
          if (registration.waiting) showUpdate();
          else toast('更新を確認しました。新しい版がある場合は準備後に表示されます。');
        } catch {
          toast('更新の確認にはインターネット接続が必要です。');
        }
      } else toast('オフライン機能は本番ビルド（npm run build → npm run preview）で利用できます。');
      break;
    case 'apply-update':
      if (registration?.waiting) {
        save();
        registration.waiting.postMessage('SKIP_WAITING');
      }
      break;
  }
});
document.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === 'study-content') ui.study.content = input.value;
});
document.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name === 'study-date') {
    if (validDate(input.value)) {
      ui.study.date = input.value;
      ui.historyPage = 0;
    }
    render();
  }
  if (input.name === 'weapon-target')
    change(() => {
      state.weaponTarget = Number(input.value);
    });
  if (input.id === 'save-file' && input.files?.[0]) void readSave(input.files[0]);
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (modalKind === 'add-plan')
    document.querySelector<HTMLElement>('[data-action="save-plan"]')?.click();
});
document.addEventListener('keydown', (e) => {
  const editable = (e.target as HTMLElement).matches('input, textarea, select, [contenteditable]');
  if (e.key === 'Escape') {
    e.preventDefault();
    goBack();
    return;
  }
  if (modalKind) {
    if (e.key === 'Tab') {
      const items = Array.from(
        modalRoot.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([hidden]), select, [tabindex="0"]',
        ),
      );
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    return;
  }
  if (editable) return;
  if (ui.screen === 'study' && ui.tab !== '履歴') {
    if (/^\d$/.test(e.key) || ['Backspace', 'Delete'].includes(e.key)) {
      e.preventDefault();
      keypad(e.key);
    } else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
      saveStudy();
    }
    return;
  }
  if (ui.screen === 'battle') {
    const key = e.key.toLowerCase();
    if (
      ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
    ) {
      e.preventDefault();
      keys.add(key);
    }
    if (e.repeat) return;
    if (key === ' ') dodge();
    const action = (
      { j: 'normal', k: 'skill1', l: 'skill2', u: 'ultimate' } as Record<string, ActionId>
    )[key];
    if (action) {
      e.preventDefault();
      attack(action);
    }
    if (['1', '2', '3', '4'].includes(key)) switchCharacter(CHARACTER_IDS[Number(key) - 1]);
  }
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  resetJoystick();
  save();
});
document.addEventListener('visibilitychange', () => {
  keys.clear();
  resetJoystick();
  save();
  if (!document.hidden) {
    refreshDaily(state);
    if (ui.screen !== 'battle') render();
  }
});
window.addEventListener('pagehide', save);
document.addEventListener('world-lost', () => {
  if (ui.screen === 'battle') pauseBattle();
  toast('3D描画が中断されました。戦闘は保存済みです。描画の復帰をお待ちください。', 7000);
});
document.addEventListener('world-restored', () =>
  toast('3D描画が復帰しました。戦闘を再開できます。'),
);
window.addEventListener('beforeinstallprompt', (event: Event) => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('offline', () =>
  toast('オフラインです。記録とゲームはこの端末で続けられます。'),
);
window.addEventListener('online', () => toast('オンラインに戻りました。'));
function showUpdate() {
  document.querySelector<HTMLElement>('#apply-update')?.removeAttribute('hidden');
  const el = document.querySelector('#update-status');
  if (el) el.textContent = '新しいバージョンの準備ができました。';
}
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (
      !reloading &&
      registration?.active &&
      sessionStorage.getItem('arcana-update') === 'pending'
    ) {
      reloading = true;
      sessionStorage.removeItem('arcana-update');
      location.reload();
    }
  });
  document.addEventListener(
    'click',
    (e) => {
      if ((e.target as HTMLElement).closest('[data-action="apply-update"]'))
        sessionStorage.setItem('arcana-update', 'pending');
    },
    true,
  );
  void navigator.serviceWorker
    .register('/sw.js')
    .then((r) => {
      registration = r;
      if (r.waiting) showUpdate();
      r.addEventListener('updatefound', () =>
        r.installing?.addEventListener('statechange', () => {
          if (r.waiting) {
            showUpdate();
            toast('新しいバージョンを準備しました。設定 → アプリから適用できます。');
          }
        }),
      );
    })
    .catch(() =>
      toast(
        'オフライン用ファイルを準備できませんでした。接続を確認して再読み込みしてください。',
        7000,
      ),
    );
}

let lastTime = performance.now(),
  hudClock = 0,
  saveClock = 0,
  timerClock = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  if (document.hidden) return;
  const b = state.battle;
  if (ui.screen === 'battle' && b && !modalKind && world.ready) {
    b.elapsed += dt;
    dodgeCooldown = Math.max(0, dodgeCooldown - dt);
    dodgeLeft = Math.max(0, dodgeLeft - dt);
    let dx =
      joystick.x +
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
      (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let dz =
      joystick.z +
      (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
      (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    const length = Math.hypot(dx, dz);
    if (length > 1) {
      dx /= length;
      dz /= length;
    }
    if (length > 0.1) {
      lastDirection = { x: dx, z: dz };
      world.face(dx, dz);
    }
    if (dodgeLeft > 0) {
      dx = lastDirection.x;
      dz = lastDirection.z;
    }
    const speed = dodgeLeft > 0 ? 13 : 4.2;
    b.x += dx * dt * speed;
    b.z += dz * dt * speed;
    const radius = Math.hypot(b.x, b.z);
    if (radius > 10.5) {
      b.x *= 10.5 / radius;
      b.z *= 10.5 / radius;
    }
    world.setMoving(length > 0.1 || dodgeLeft > 0);
    const ex = b.x - b.enemyX,
      ez = b.z - b.enemyZ,
      distance = Math.hypot(ex, ez);
    if (distance > 2.2 && b.enemyClock < 2.7) {
      b.enemyX += (ex / distance) * dt * 0.8;
      b.enemyZ += (ez / distance) * dt * 0.8;
    }
    for (const action of ACTIONS) b.cooldowns[action] = Math.max(0, b.cooldowns[action] - dt);
    if (b.buffLeft > 0) {
      b.buffLeft = Math.max(0, b.buffLeft - dt);
      if (b.buffLeft === 0) b.buff = 1;
    }
    const previousClock = b.enemyClock;
    b.enemyClock += dt;
    if (previousClock < 2.7 && b.enemyClock >= 2.7) {
      b.targetX = b.x;
      b.targetZ = b.z;
    }
    world.setTelegraph(b.targetX, b.targetZ, b.enemyClock >= 2.7, (b.enemyClock - 2.7) / 1.1);
    if (b.enemyClock >= 3.8) {
      b.enemyClock -= 3.8;
      world.impact(b.targetX, b.targetZ);
      if (Math.hypot(b.x - b.targetX, b.z - b.targetZ) < 2.8 && dodgeLeft === 0) {
        const hit = enemyHit(state);
        floatText(hit ? '−' + hit : 'BLOCK', b.x, 2.7, b.z, 'taken');
        sound('hit');
      } else floatText('DODGE', b.x, 2.7, b.z, 'heal');
      save();
      if (!state.battle) {
        showBattleResult();
        return;
      }
    }
    b.poisonClock += dt;
    if (b.poisonClock >= 4) {
      b.poisonClock -= 4;
      if (b.poison) {
        const damage = b.poison * 90;
        b.enemyHp = Math.max(0, b.enemyHp - damage);
        floatText(number(damage), b.enemyX, 3.5, b.enemyZ, 'poison');
        if (!b.enemyHp) {
          finishBattle(state, true);
          save();
          showBattleResult();
          return;
        }
        save();
      }
    }
    hudClock += dt;
    if (hudClock > 0.08) {
      updateHUD();
      hudClock = 0;
    }
    saveClock += dt;
    if (saveClock > 2) {
      save();
      saveClock = 0;
    }
  } else world.setMoving(false);
  world.update(dt, state);
  timerClock += dt;
  if (timerClock >= 0.5) {
    timerClock = 0;
    if (state.daily.date !== dayKey()) {
      refreshDaily(state);
      save();
      if (ui.screen !== 'battle') render();
    }
    if (state.timer) {
      const elapsed = Math.max(0, (Date.now() - state.timer.start) / 1000);
      const text = clock(elapsed);
      const el = document.querySelector('#timer-number');
      if (el) el.textContent = text;
      const fab = document.querySelector('[data-timer-label]');
      if (fab) fab.textContent = text;
    }
  }
}
render();
requestAnimationFrame(frame);
if (startupWarning) toast(startupWarning, 10000);
else if (!world.ready)
  toast('この端末では3D描画を利用できません。学習記録・育成・召喚は使えます。', 8000);
