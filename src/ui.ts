import {
  ACTIONS,
  BOOK_NAMES,
  BOOK_STATS,
  CHARACTERS,
  CHARACTER_IDS,
  DUNGEONS,
  EDITIONS,
  SKILL_DETAILS,
  SUBJECTS,
  WEAPONS,
  type CharacterId,
  type Mode,
} from './data';
import {
  bookValue,
  dayKey,
  levelCap,
  rank,
  stats,
  todayMinutes,
  totalMinutes,
  type State,
  type Summon,
} from './model';

export type Screen =
  'home' | 'study' | 'dungeons' | 'battle' | 'characters' | 'summon' | 'plans' | 'settings';
export interface UIState {
  screen: Screen;
  tab: string;
  study: {
    date: string;
    subject: string;
    content: string;
    mode: string;
    minutes: string;
    start: string;
    end: string;
    active: string;
  };
  dungeon: Mode;
  banner: string;
  equipmentSlot: number | null;
  historyPage: number;
  result: boolean;
}
export const esc = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export const icon = (name: string, cls = '') =>
  `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
export const number = (n: number) => Math.round(n).toLocaleString('ja-JP');
export const duration = (m: number) =>
  m < 60 ? `${m}分` : `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}`;
export const clock = (seconds: number) => {
  const n = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(n / 3600)).padStart(2, '0')}:${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};
export const timeInput = (v: string) =>
  `${v.slice(0, 2).padEnd(2, '−')}:${v.slice(2).padEnd(2, '−')}`;
const btn = (label: string, action: string, cls = '', more = '') =>
  `<button type="button" data-action="${action}" class="${cls}" ${more}>${label}</button>`;
const resource = (name: string, value: string | number, kind: string) =>
  `<span class="resource ${kind}">${icon(kind === 'lp' ? 'zap' : kind === 'gems' ? 'gem' : 'layers-3')}<span>${esc(value)}<small>${name}</small></span></span>`;
function header(title: string, label: string, resources = '') {
  return `<header class="page-header">${btn(icon('arrow-left') + '<span>戻る</span>', 'back', 'back')}<div><span class="eyebrow">${label}</span><h1>${title}</h1></div><div class="header-resources">${resources}</div></header>`;
}
function tabs(items: string[], current: string) {
  return `<div class="tabs" role="tablist">${items.map((t) => btn(esc(t), 'tab', current === t ? 'selected' : '', `role="tab" aria-selected="${current === t}" data-value="${esc(t)}"`)).join('')}</div>`;
}
function nav(screen: Screen) {
  const items = [
    ['home', 'orbit', 'ホーム'],
    ['study', 'book-open', '学習記録'],
    ['dungeons', 'swords', 'ダンジョン'],
    ['characters', 'users', 'キャラクター'],
    ['summon', 'sparkles', '召喚'],
    ['plans', 'chart-no-axes-combined', '計画・分析'],
  ];
  return `<aside class="sidebar"><button data-action="navigate" data-value="home" class="sigil" aria-label="ホームへ"><img src="/icon.svg" alt="" /></button><nav aria-label="メインメニュー">${items.map(([key, i, name]) => btn(icon(i) + `<span>${name}</span>`, 'navigate', screen === key ? 'nav-item selected' : 'nav-item', `data-value="${key}" aria-label="${name}" ${screen === key ? 'aria-current="page"' : ''}`)).join('')}</nav><div class="sidebar-bottom">${btn(icon('maximize'), 'fullscreen', 'icon-button', 'aria-label="全画面にする"')}${btn(icon('settings-2'), 'navigate', screen === 'settings' ? 'icon-button selected' : 'icon-button', 'data-value="settings" aria-label="設定"')}<small>SA / 01</small></div></aside>`;
}
export function renderApp(s: State, ui: UIState) {
  if (ui.screen === 'battle') return battleUI(s);
  let content = '';
  if (ui.screen === 'home') content = home(s);
  if (ui.screen === 'study') content = study(s, ui);
  if (ui.screen === 'dungeons') content = dungeons(s, ui);
  if (ui.screen === 'characters') content = characters(s, ui);
  if (ui.screen === 'summon') content = summonScreen(s, ui);
  if (ui.screen === 'plans') content = plans(s, ui);
  if (ui.screen === 'settings') content = settings(s, ui);
  return `${nav(ui.screen)}<main class="main screen-${ui.screen}">${content}</main><button class="timer-fab ${s.timer ? 'running' : ''}" data-action="timer" aria-label="学習タイマー">${icon('timer')}<span>${s.timer ? '<b data-timer-label>計測中</b>' : '集中タイマー'}</span>${s.timer ? '<span class="pulse-dot"></span>' : ''}</button><div class="rotate-hint">${icon('smartphone')} 横画面にすると、もっと広く冒険できます</div>`;
}
function home(s: State) {
  const m = todayMinutes(s),
    c = CHARACTERS[s.selected];
  return `<header class="home-header"><div class="wordmark"><span class="eyebrow">STUDY ARCANA</span><span>学習戦記<span class="edition">星の書庫</span></span></div><div class="home-resources"><div class="rank-badge"><span>RANK</span><strong>${String(rank(s)).padStart(2, '0')}</strong><div class="rank-bar"><i style="width:${((s.exp % 180) / 180) * 100}%"></i></div></div>${resource('学習パワー', number(s.lp), 'lp')}${resource('星晶石', number(s.gems), 'gems')}</div></header>
    <section class="hero-copy"><span class="chapter"><i></i> CHAPTER 01 · 星の書庫</span><h1>学ぶ時間が、<br><em>冒険の力になる。</em></h1><p>今日の一歩が、まだ見ぬ世界をひらく。</p></section>
    <div class="character-caption"><span class="tiny-label">${esc(c.element)} / ${esc(c.role)}</span><h2>${esc(c.name)}</h2><span>${esc(c.title)}</span><div class="character-dots">${CHARACTER_IDS.map((id) => btn('', 'select-character', id === s.selected ? 'selected' : '', `data-value="${id}" aria-label="${CHARACTERS[id].name}を表示" aria-pressed="${id === s.selected}"`)).join('')}</div></div>
    <section class="home-missions"><div class="section-label"><span>YOUR NEXT ADVENTURE</span>${icon('compass')}</div><div class="mission-main"><div class="mission-visual"><span class="orbit-art">✧</span><span class="chapter-tag">ARCHIVE 01</span></div><div class="mission-content"><span class="tiny-label">通常ダンジョン</span><h2>星降る資料庫</h2><p>頁喰らいが潜む、忘れられた書庫へ。</p><div class="rewards-inline">${icon('gem')} 45 <span>／</span> ${icon('layers-3')} 12 <span>／</span> ${icon('book-marked')} 1</div>${btn((s.battle ? '戦闘を再開する' : '冒険に出る') + icon('arrow-up-right'), s.battle ? 'resume' : 'navigate', 'primary gold full', 'data-value="dungeons"')}</div></div>
    <button class="target-card" data-action="boss"><span class="target-icon">${icon('scan-eye')}</span><span><small>TARGET BOSS</small><strong>未踏の公式</strong></span>${icon('chevron-right')}</button>
    <div class="home-note">${icon('cloud-moon')} <span>急がなくていい。<br>知識は、少しずつ力になる。</span></div></section>
    <section class="home-bottom"><button class="today-card" data-action="navigate" data-value="study"><div class="today-icon">${icon('book-open')}</div><div><span class="tiny-label">TODAY'S STUDY</span><div><strong>${m}</strong><span>分の積み重ね</span></div></div><span class="record-link">学習を記録 ${icon('plus')}</span></button><div class="daily-card"><div><span class="tiny-label">DAILY MISSION</span><h3>15分の学びを、今日も。</h3><div class="daily-track"><i style="width:${Math.min(100, (m / 15) * 100)}%"></i></div><small>${Math.min(15, m)} / 15 分 <span>調査証 ×5</span></small></div>${btn(s.daily.claimed ? icon('check') + '受領済' : m >= 15 ? '受け取る' : icon('lock-keyhole'), 'claim-daily', s.daily.claimed || m < 15 ? 'daily-claim muted' : 'daily-claim', `aria-label="デイリー報酬を受け取る" ${s.daily.claimed || m < 15 ? 'disabled' : ''}`)}</div><div class="total-card"><span class="tiny-label">TOTAL JOURNEY</span><strong>${duration(totalMinutes(s))}</strong><span>${s.clears} 回のダンジョンクリア ${icon('flag')}</span></div></section>`;
}
function study(s: State, ui: UIState) {
  const f = ui.study,
    isHistory = ui.tab === '履歴',
    minutes =
      f.mode === 'minutes' ? Number(f.minutes) : timeToNumber(f.end) - timeToNumber(f.start);
  return `${header('学習記録', 'STUDY LOG', resource('LP', number(s.lp), 'lp'))}<section class="workspace study-workspace">${tabs(['記録する', '履歴'], isHistory ? '履歴' : '記録する')}${isHistory ? history(s, ui) : `<div class="study-layout"><div class="study-form"><div class="form-heading"><div><span class="eyebrow">ONE STEP FORWARD</span><h2>今日、何を学んだ？</h2></div><label class="date-control">${icon('calendar-days')}<input type="date" name="study-date" aria-label="記録の日付" value="${f.date}"></label></div><label class="field-label">科目</label><div class="subject-grid">${SUBJECTS.map((subject, i) => btn(`<span class="subject-dot s${i}"></span>${subject}`, 'subject', f.subject === subject ? 'selected' : '', `data-value="${subject}" aria-pressed="${f.subject === subject}"`)).join('')}</div><label class="field-label" for="study-content">教材・学んだこと <span>任意・80文字まで</span></label><input id="study-content" class="text-input" name="study-content" maxlength="80" placeholder="例：数学Ⅰ チャート式 / 二次関数" value="${esc(f.content)}"><div class="input-mode">${btn('分数で入力', 'input-mode', f.mode === 'minutes' ? 'selected' : '', 'data-value="minutes"')}${btn('時刻で入力', 'input-mode', f.mode === 'time' ? 'selected' : '', 'data-value="time"')}</div><div class="time-entry">${f.mode === 'minutes' ? `<button class="minute-display ${f.active === 'minutes' ? 'active' : ''}" data-action="activate-input" data-value="minutes" aria-label="学習分数を入力"><strong>${f.minutes || '0'}</strong><span>分</span></button><span class="input-hint">右のキーパッドで入力<br>1〜720分</span>` : `<button class="clock-display ${f.active === 'start' ? 'active' : ''}" data-action="activate-input" data-value="start"><small>開始</small><strong>${timeInput(f.start)}</strong></button><span class="time-arrow">→</span><button class="clock-display ${f.active === 'end' ? 'active' : ''}" data-action="activate-input" data-value="end"><small>終了</small><strong>${timeInput(f.end)}</strong></button>`}</div><div class="study-gains"><span>今回の学びが、力になる</span><div>${icon('zap')} <strong>+${minutes > 0 && minutes <= 720 ? Math.round((minutes * 4) / 3) : 0} LP</strong><span>＋</span><strong>${minutes > 0 && minutes <= 720 ? minutes : 0} EXP</strong></div></div></div><div class="keypad-panel"><span class="tiny-label">STUDY TIME</span><div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => btn(key === '⌫' ? icon('delete') : key, 'key', '', `data-value="${key}" aria-label="${key === 'C' ? '全消去' : key === '⌫' ? '1文字削除' : key}"`)).join('')}</div>${btn(icon('check') + '学習を記録する', 'save-study', 'primary full')}<p class="keypad-note">${icon('shield-check')} 記録はこの端末に自動保存</p></div></div>`}</section>`;
}
export function timeToNumber(value: string) {
  if (value.length !== 4 || Number(value.slice(0, 2)) > 23 || Number(value.slice(2)) > 59)
    return NaN;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(2));
}
function history(s: State, ui: UIState) {
  const records = s.records.filter((r) => r.date === ui.study.date),
    page = Math.min(ui.historyPage, Math.max(0, Math.ceil(records.length / 6) - 1));
  return `<div class="history-heading"><label class="date-control">${icon('calendar-days')}<input type="date" name="study-date" aria-label="履歴の日付" value="${ui.study.date}"></label><strong>${duration(records.reduce((n, r) => n + r.minutes, 0))}</strong><span>${records.length}件の記録</span></div><div class="timeline" aria-label="0時から24時までの学習タイムライン"><div class="timeline-inner">${Array.from({ length: 24 }, (_, h) => `<button data-action="timeline" data-value="${h}" style="left:${(h / 24) * 100}%">${h}:00</button>`).join('')}${records
    .filter((r) => r.start)
    .map(
      (r) =>
        `<div class="timeline-block" title="${esc(r.subject + ' ' + r.start + '–' + r.end)}" style="left:${(timeToNumber(r.start!.replace(':', '')) / 1440) * 100}%;width:${(r.minutes / 1440) * 100}%">${esc(r.subject)}</div>`,
    )
    .join('')}</div></div><div class="record-list">${
    records.length
      ? records
          .slice(page * 6, page * 6 + 6)
          .map(
            (r) =>
              `<article class="record-row"><span class="record-subject">${icon('book-open')} ${esc(r.subject)}</span><div><strong>${esc(r.content || '学習の記録')}</strong><span>${r.start ? `${r.start} — ${r.end}` : '分数で記録'}</span></div><b>${r.minutes}<small> 分</small></b><span class="record-reward">+${Math.round((r.minutes * 4) / 3)} LP</span>${btn(icon('trash-2'), 'delete-record', 'icon-button', `data-value="${r.id}" aria-label="${esc(r.subject)}の記録を削除"`)}</article>`,
          )
          .join('')
      : empty('book-open', 'まだ記録がありません', '小さな積み重ねから、冒険がはじまります。')
  } </div>${records.length > 6 ? `<div class="pagination">${btn(icon('chevron-left'), 'history-page', 'icon-button', 'data-value="-1" aria-label="前のページ"')}<span>${page + 1} / ${Math.ceil(records.length / 6)}</span>${btn(icon('chevron-right'), 'history-page', 'icon-button', 'data-value="1" aria-label="次のページ"')}</div>` : ''}`;
}
function dungeons(s: State, ui: UIState) {
  const d = DUNGEONS[ui.dungeon];
  return `${header('ダンジョン', 'EXPLORE THE ARCHIVE', resource('LP', number(s.lp), 'lp') + `<span class="ticket-count">${icon('ticket')} 調査証 ${s.daily.tickets}</span>`)}<section class="dungeon-layout"><div class="dungeon-options">${(Object.keys(DUNGEONS) as Mode[]).map((mode, i) => `<button class="dungeon-option ${mode === ui.dungeon ? 'selected' : ''}" data-action="dungeon" data-value="${mode}" aria-pressed="${mode === ui.dungeon}"><span class="dungeon-number">0${i + 1}</span><span><small>${DUNGEONS[mode].eyebrow}</small><strong>${DUNGEONS[mode].name}</strong></span>${icon('chevron-right')}</button>`).join('')}<p class="quiet-note">${icon('info')} 初めてなら「訓練の庭」がおすすめ。<br>LPを使わずターン制バトルを練習できます。</p></div><div class="dungeon-preview mode-${ui.dungeon}"><div class="dungeon-seal">${icon(ui.dungeon === 'practice' ? 'target' : ui.dungeon === 'boss' ? 'scan-eye' : 'orbit')}</div><div class="dungeon-detail"><span class="eyebrow">${d.eyebrow}</span><h2>${d.name}</h2><p>${d.description}</p><div class="enemy-info"><span>${icon('skull')} ${d.enemy}</span><span>HP ${number(d.hp)}</span></div><div class="reward-box"><span class="tiny-label">CLEAR REWARDS</span>${ui.dungeon === 'practice' ? '<p>操作の練習用・報酬なし</p>' : `<div>${resource('星晶石', d.gems, 'gems')}${resource('強化素材', d.materials, 'materials')}<span>${icon('book-marked')} ${d.book ? '知識本 ×1' : 'EXP +' + d.exp}</span></div>`}</div><div class="entry-condition">${icon('zap')} ${ui.dungeon === 'practice' ? 'LP消費なし' : ui.dungeon === 'endgame' ? '入場20 LP / 戦闘中の消費なし' : ui.dungeon === 'normal' && s.daily.tickets > 0 ? '調査証1枚 / 戦闘中のLP消費なし' : `行動ごとに${s.baseLP} LP消費（挑戦時${s.baseLP * 4} LP必要）`}</div><div class="entry-actions">${s.battle ? btn('進行中の戦闘を再開' + icon('play'), 'resume', 'primary gold full') : btn('挑戦する' + icon('arrow-right'), 'start-battle', 'primary gold full')}${btn(icon('gamepad-2'), 'controls', 'secondary', 'aria-label="操作方法"')}</div>${s.best && ui.dungeon === 'endgame' ? `<small class="best-record">自己ベスト ${s.best.turns ? s.best.turns + ' ターン' : s.best.seconds.toFixed(1) + ' 秒（旧版）'} / 累計学習 ${duration(s.best.studyMinutes)}</small>` : ''}</div></div></section>`;
}
function characters(s: State, ui: UIState) {
  const id = s.selected,
    c = CHARACTERS[id],
    st = stats(s, id),
    w = s.weapons.find((w) => w.id === s.loadouts[id].weapon)!,
    tab = ['武器・知識本', 'スキル'].includes(ui.tab) ? ui.tab : 'プロフィール';
  return `${header('キャラクター', 'THE OBSERVERS', resource('強化素材', s.materials, 'materials'))}<div class="character-layout"><section class="character-display"><div class="character-select">${CHARACTER_IDS.map((cid) => btn(`<span class="avatar-mark" style="--char-color:${CHARACTERS[cid].color}">${CHARACTERS[cid].name.slice(0, 1)}</span><span>${CHARACTERS[cid].name}</span><small>Lv.${s.levels[cid]}</small>`, 'select-character', cid === id ? 'selected' : '', `data-value="${cid}" aria-pressed="${cid === id}"`)).join('')}</div><div class="character-info"><span class="rarity rarity-${c.rarity}">${c.rarity}</span><span class="tiny-label">${c.element} / ${c.role}</span><h2>${c.name}</h2><p>${c.title}</p><span class="constellation">${Array.from({ length: 6 }, (_, i) => `<i class="${i < s.copies[id] ? 'lit' : ''}">✧</i>`).join('')}<small>凸 ${s.copies[id]} / 6</small></span></div></section><section class="character-panel workspace">${tabs(['プロフィール', '武器・知識本', 'スキル'], tab)}<div class="character-panel-scroll">${
    tab === 'プロフィール'
      ? `<span class="eyebrow">CHARACTER PROFILE</span><h2>${c.name}</h2><p class="character-bio">${c.description}</p><div class="level-panel"><div><span>キャラクターレベル</span><strong>Lv.${s.levels[id]} <small>/ ${levelCap(s)}</small></strong></div>${btn(icon('plus') + '強化', 'upgrade', 'primary compact', 'data-kind="character"')}<span class="upgrade-cost">${icon('layers-3')} 10</span></div><div class="stat-grid"><div><span>攻撃力</span><strong>${number(st.attack)}</strong></div><div><span>会心率</span><strong>${Math.round(st.crit * 100)}%</strong></div><div><span>追加HP</span><strong>+${number(st.hp)}</strong></div><div><span>防御力</span><strong>${number(st.defense)}</strong></div></div><p class="quiet-note">ランク ${rank(s)} / 次のランクまで ${180 - (s.exp % 180)} EXP<br>凸はコレクション要素です。現在、性能への影響はありません。</p>`
      : tab === '武器・知識本'
        ? `<div class="equipment-weapon"><span class="equipment-symbol">${icon('sword')}</span><div><span class="tiny-label">${WEAPONS[w.template].rarity} · ${c.weapon}</span><h3>${WEAPONS[w.template].name}</h3><span>Lv.${w.level} · 攻撃力 +${st.weaponAttack}</span><small>${WEAPONS[w.template].effect}</small></div><div>${btn('変更', 'equipment', 'secondary compact', 'data-slot="weapon"')}${btn('強化 · 10', 'upgrade', 'primary compact', 'data-kind="weapon"')}</div></div><div class="book-grid">${s.loadouts[
            id
          ].books
            .map((bid, slot) => {
              const b = s.books.find((b) => b.id === bid)!,
                val = bookValue(b);
              return `<article class="book-card"><div>${icon('book-marked')}<span>${EDITIONS[b.edition]} · Lv.${b.level}</span></div><h4>${BOOK_NAMES[slot]}</h4><span>${BOOK_STATS[slot]} +${slot < 3 ? number(val) : (val * 100).toFixed(1) + '%'}</span><footer>${btn('変更', 'equipment', 'text-button', `data-slot="${slot}"`)}${btn('+4 · 20素材', 'upgrade', 'text-button', `data-kind="book" data-slot="${slot}"`)}</footer></article>`;
            })
            .join(
              '',
            )}</div>${s.battle ? '<p class="quiet-note">戦闘中は装備の変更・強化はできません。</p>' : ''}`
        : `<div class="skill-list">${ACTIONS.map((action, i) => `<article class="skill-card"><span class="skill-symbol">${icon(['sword', 'orbit', 'wind', 'sparkles'][i])}</span><div><small>${['通常攻撃', 'スキル1', 'スキル2', '必殺技'][i]} · SP ${c.sp[i]} · ${i === 3 ? 'ゲージ100' : 'ゲージ +' + [28, 40, 25][i]}</small><h3>${c.skills[i]} <span>Lv.${s.skillLevels[id][action]}</span></h3><p>${SKILL_DETAILS[id][i]}</p><small>技倍率 ${(1 + (s.skillLevels[id][action] - 1) * 0.06).toFixed(2)} → ${(1 + Math.min(9, s.skillLevels[id][action]) * 0.06).toFixed(2)} / 基準10 LP</small>${i === 3 ? btn(icon('play') + '必殺演出を見る', 'preview-ultimate', 'secondary preview-ultimate', `data-value="${id}"`) : ''}</div>${btn('+1', 'upgrade', 'secondary compact', `data-kind="skill" data-slot="${i}" aria-label="${c.skills[i]}を20素材で強化"`)}</article>`).join('')}</div>`
  }</div></section></div>`;
}
function summonScreen(s: State, ui: UIState) {
  const weapon = ui.banner === 'weapon',
    c = CHARACTERS[weapon ? s.selected : (ui.banner as CharacterId)],
    pity = s.pity[ui.banner];
  return `${header('星の召喚', 'ASTRAL WISH', resource('星晶石', s.gems, 'gems'))}<div class="summon-layout"><section class="summon-banner"><div class="banner-switch">${['ko', 'ao', 'io', 'weapon'].map((id) => btn(id === 'weapon' ? icon('sword') + '武器' : CHARACTERS[id as CharacterId].name, 'banner', id === ui.banner ? 'selected' : '', `data-value="${id}" aria-pressed="${id === ui.banner}"`)).join('')}</div><div class="summon-copy"><span class="eyebrow">${weapon ? 'WEAPON INVOCATION' : 'OBSERVER INVOCATION'}</span><h2>${weapon ? '星の記憶を、<br>その手に。' : '可能性は、<br>星の数ほど。'}</h2><span class="rarity rarity-S">S</span><h3>${weapon ? WEAPONS[s.weaponTarget].name : c.name}</h3><p>${weapon ? WEAPONS[s.weaponTarget].effect : c.title}</p></div><div class="summon-orbit" aria-hidden="true">✦</div></section><section class="summon-panel workspace"><span class="eyebrow">SUMMON DETAILS</span><h2>${weapon ? '武器召喚' : '限定キャラクター召喚'}</h2><p>${weapon ? '知識に応える、あなただけの装備を。' : '初期4人はすべて使用可能。重複で凸を獲得。'}</p>${weapon ? `<label class="field-label" for="weapon-target">狙うS武器</label><select class="text-input" name="weapon-target" id="weapon-target">${[0, 1, 2, 8].map((i) => `<option value="${i}" ${i === s.weaponTarget ? 'selected' : ''}>${WEAPONS[i].name}</option>`).join('')}</select>` : ''}<div class="pity-box"><span>次のS確定まで</span><strong>${(weapon ? 50 : 60) - pity.count}<small> 回</small></strong><div class="daily-track"><i style="width:${(pity.count / (weapon ? 50 : 60)) * 100}%"></i></div><small>${pity.guaranteed ? '次のSはピックアップ確定' : 'ピックアップ確率：S当選時 ' + (weapon ? '50%' : '75%')}</small></div><div class="rate-row"><span><b class="rarity-S">S</b> 5%</span><span><b class="rarity-A">A</b> 20%</span><span><b class="rarity-B">B</b> 75%</span></div>${btn(icon('sparkles') + '1回召喚' + '<span class="button-cost">◇ 100</span>', 'summon', 'primary gold full', s.gems < 100 ? 'disabled' : '')}<div class="summon-foot">${btn(icon('history') + '履歴', 'summon-history', 'text-button')}${btn(icon('info') + '提供割合', 'summon-rates', 'text-button')}</div><p class="quiet-note">課金機能はありません。石はダンジョンで獲得できます。<br>恒常キャラはコレクションのみ。武器は個別に所持します。</p></section></div>`;
}
function plans(s: State, ui: UIState) {
  const tab = ui.tab === '分析' ? '分析' : '学習予定';
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return dayKey(d);
  });
  const values = dates.map((date) => todayMinutes(s, date)),
    max = Math.max(60, ...values);
  const subjects = SUBJECTS.map((subject) => ({
    subject,
    minutes: s.records.filter((r) => r.subject === subject).reduce((n, r) => n + r.minutes, 0),
  })).filter((s) => s.minutes > 0);
  return `${header('計画・分析', 'YOUR LEARNING JOURNEY')}<section class="workspace plan-workspace">${tabs(['学習予定', '分析'], tab)}${tab === '学習予定' ? `<div class="plans-header"><div><span class="eyebrow">MAKE ROOM TO GROW</span><h2>次の一歩を、決めておこう。</h2><p>${s.plans.filter((p) => !p.done).length}件の予定 / ${s.plans.filter((p) => p.done).length}件完了</p></div>${btn(icon('plus') + '予定を追加', 'add-plan', 'primary')}</div><div class="plan-list">${s.plans.length ? s.plans.map((p) => `<article class="plan-row ${p.done ? 'done' : ''}">${btn(icon(p.done ? 'circle-check' : 'circle'), 'toggle-plan', 'icon-button', `data-value="${p.id}" aria-label="${esc(p.title)}を${p.done ? '未完了' : '完了'}にする"`)}<div><strong>${esc(p.title)}</strong><span>${p.category}${p.due ? ' · ' + p.due.replaceAll('-', '/') : ' · 期日なし'}</span></div>${btn(icon('trash-2'), 'delete-plan', 'icon-button', `data-value="${p.id}" aria-label="予定を削除"`)}</article>`).join('') : empty('notebook-pen', 'あなたのペースで、はじめよう', '課題や自主学習の予定を追加できます。')}</div>` : `<div class="analytics-stats"><div><span>累計学習時間</span><strong>${duration(totalMinutes(s))}</strong></div><div><span>プレイヤーランク</span><strong>${rank(s)} <small>/ 30</small></strong></div><div><span>ダンジョンクリア</span><strong>${s.clears}<small> 回</small></strong></div></div><div class="charts"><div class="chart-card"><h3>過去7日間の学習 <span>分</span></h3><div class="bar-chart" role="img" aria-label="過去7日の学習：${dates.map((d, i) => `${d} ${values[i]}分`).join('、')}">${values.map((m, i) => `<div><span>${m}</span><i style="--bar-ratio:${m / max}" class="${i === 6 ? 'today' : ''}"></i><small>${dates[i].slice(5).replace('-', '/')}</small></div>`).join('')}</div></div><div class="chart-card"><h3>科目別の積み重ね</h3>${subjects.length ? subjects.map(({ subject, minutes }, i) => `<div class="subject-stat"><span><i class="subject-dot s${SUBJECTS.indexOf(subject)}"></i>${subject}</span><div><i style="width:${(minutes / Math.max(...subjects.map((s) => s.minutes))) * 100}%;animation-delay:${i * 40}ms"></i></div><b>${duration(minutes)}</b></div>`).join('') : '<p class="empty-chart">最初の学習を記録すると<br>科目ごとの時間が表示されます。</p>'}</div></div><p class="quiet-note">${icon('hard-drive')} 記録はこの端末に保存されます。Google・Anki・AI連携と公開ランキングは未実装です。</p>`}</section>`;
}
function settings(s: State, ui: UIState) {
  const tab = ['アプリ', 'セーブ'].includes(ui.tab) ? ui.tab : 'ゲーム';
  return `${header('設定', 'MAKE IT YOURS')}<section class="workspace settings-workspace">${tabs(['ゲーム', 'アプリ', 'セーブ'], tab)}<div class="settings-content">${tab === 'ゲーム' ? `<div class="setting-row"><div><h3>行動ごとのLP消費</h3><p>有料戦闘のダメージ・回復・盾の倍率は消費LP÷10。</p></div><div class="segmented">${[10, 20, 30].map((n) => btn(String(n), 'base-lp', n === s.baseLP ? 'selected' : '', `data-value="${n}" aria-pressed="${s.baseLP === n}"`)).join('')}</div></div><div class="setting-row"><div><h3>効果音</h3><p>攻撃・学習記録・召喚のサウンド。</p></div><button data-action="toggle-sound" class="toggle" role="switch" id="sound-toggle" aria-checked="false" aria-label="効果音"><i></i></button></div><div class="setting-row"><div><h3>動きを抑える</h3><p>背景の動きや技の演出を軽減。OSの設定も反映します。</p></div><button data-action="toggle-motion" class="toggle" role="switch" id="motion-toggle" aria-checked="false" aria-label="動きを抑える"><i></i></button></div>${s.battle ? `<div class="setting-row"><div><h3>中断中の戦闘</h3><p>${DUNGEONS[s.battle.mode].name} / 敵HP ${number(s.battle.enemyHp)}。LPの返還はありません。</p></div>${btn('撤退する', 'retreat', 'secondary danger')}</div>` : ''}${btn(icon('gamepad-2') + '操作方法を見る', 'controls', 'secondary')}` : tab === 'アプリ' ? `<div class="app-about"><img src="/icon.svg" alt="学習戦記の紋章"><div><span class="eyebrow">STUDY ARCANA</span><h2>学習戦記</h2><p>3D TURN-BASED RPG · v1.1.0</p></div></div><div class="setting-row"><div><h3>ホーム画面に追加</h3><p>初回オンライン読み込み後、オフラインでも遊べます。</p></div>${btn(icon('download') + 'インストール', 'install', 'primary')}</div><div class="setting-row"><div><h3>アプリの更新</h3><p id="update-status">更新時も学習記録とゲームデータを保持します。</p></div>${btn('更新を確認', 'check-update', 'secondary')}<button data-action="apply-update" id="apply-update" class="primary" hidden>更新を適用</button></div><p class="quiet-note">縦画面でも使えます。3Dバトルは横画面を推奨。<br>Safariでは共有メニューの「ホーム画面に追加」を使ってください。</p>` : `<div class="save-notice">${icon('shield-check')}<div><h2>積み重ねを、大切に。</h2><p>ブラウザのデータ削除で記録が消える場合があります。<br>定期的なバックアップをおすすめします。</p></div></div><div class="save-summary"><span>学習記録 <b>${s.records.length}件</b></span><span>所持武器 <b>${s.weapons.length}個</b></span><span>知識本 <b>${s.books.length}冊</b></span></div><div class="save-actions">${btn(icon('download') + 'JSONを書き出す', 'export-save', 'primary')}${btn(icon('upload') + 'セーブを読み込む', 'import-save', 'secondary')}<input type="file" id="save-file" accept="application/json,.json" hidden></div><p class="quiet-note">この3D版のセーブ形式のみ対応。読み込み前に現在のセーブを自動ダウンロードします。<br>v18の既存データは別の保存領域に保持し、このアプリから上書きしません。</p><div class="setting-row"><div><h3>データの初期化</h3><p>この3D版の記録・育成・召喚をすべて削除します。</p></div>${btn('初期化', 'reset-save', 'secondary danger')}</div>`}</div></section>`;
}
export function battleUI(s: State) {
  const b = s.battle;
  if (!b) return '';
  const c = CHARACTERS[b.char],
    d = DUNGEONS[b.mode],
    t = b.turn;
  const busy = t.phase === 'animating' || t.phase === 'enemy';
  return `<main class="battle-ui turn-battle" data-phase="${t.phase}">
    <header class="battle-top">${btn(icon('arrow-left') + '中断', 'pause-battle', 'back', 'aria-label="戦闘を中断"')}
      <div class="enemy-hud"><div><span>${d.enemy}</span><small id="battle-enemy-text">${number(b.enemyHp)} / ${number(d.hp)}</small></div><div class="enemy-bar"><i id="battle-enemy-fill" style="width:${(b.enemyHp / d.hp) * 100}%"></i></div><small>${d.name}<span id="battle-clock">TURN ${String(t.number).padStart(2, '0')}</span></small></div>
      <div class="battle-top-right"><span>${icon('zap')}<b id="battle-lp">${b.free ? 'LP無料' : number(s.lp) + ' LP'}</b></span>${btn(icon('history'), 'battle-log', 'icon-button', `aria-label="戦闘ログ" ${busy ? 'disabled' : ''}`)}${btn(icon('gamepad-2'), 'controls', 'icon-button', `aria-label="操作方法" ${busy ? 'disabled' : ''}`)}</div>
    </header>
    <aside class="turn-order" aria-label="行動順"><span class="tiny-label">ACTION ORDER</span>${CHARACTER_IDS.map((id, i) => `<article class="turn-actor ${t.index === i && t.phase !== 'ready' ? 'active' : ''} ${i < t.index ? 'acted' : ''}" data-turn-entry="${id}" ${t.index === i ? 'aria-current="step"' : ''}><span class="order-number">${i < t.index ? '✓' : '0' + (i + 1)}</span><span class="party-avatar" style="--char-color:${CHARACTERS[id].color}">${CHARACTERS[id].name[0]}</span><div><strong>${CHARACTERS[id].name}</strong><small>Lv.${s.levels[id]} <i data-party-gauge="${id}">${b.gauges[id]}%</i></small></div></article>`).join('')}<div class="turn-enemy ${t.phase === 'enemy' ? 'active' : ''}">${icon('skull')} 敵の反撃</div></aside>
    <div class="turn-state" aria-live="polite"><span class="eyebrow">TURN ${String(t.number).padStart(2, '0')}</span><strong>${t.phase === 'ready' ? '次の一手を、選ぼう。' : t.phase === 'enemy' ? '敵の反撃' : t.phase === 'animating' ? c.name + 'の行動' : c.name + 'のターン'}</strong><p>${t.phase === 'ready' ? '4人の行動後、敵が反撃します' : t.phase === 'command' ? '通常攻撃・スキル・必殺技から1つ選択' : t.phase === 'enemy' ? '共有状態異常 → 敵の攻撃' : '行動を確定しています'}</p>${t.phase === 'ready' ? btn('ターン開始' + icon('play'), 'begin-turn', 'primary gold turn-start') : ''}</div>
    <div class="battle-status"><div><span>共有HP <b id="battle-hp-text">${number(b.hp)} / ${number(b.maxHp)}</b></span><span id="battle-shield">${icon('shield')} ${number(b.shield)}</span></div><div class="hp-bar"><i id="battle-hp-fill" style="width:${(b.hp / b.maxHp) * 100}%"></i></div><div class="sp-gauge"><span>SP</span>${Array.from({ length: 10 }, (_, i) => `<i data-sp="${i}" class="${i < b.sp ? 'lit' : ''}"></i>`).join('')}<b id="battle-sp">${b.sp}/10</b></div><span class="battle-buffs" id="battle-buffs"></span></div>
    <section class="turn-command-panel"><div class="command-heading"><span>${c.element} / ${c.role} <b>${c.name}</b></span><div class="battle-lp-picker" aria-label="行動の消費LP">${b.free ? '<span>LP消費なし・倍率1</span>' : [10, 20, 30].map((lp) => btn(lp + ' LP', 'base-lp', lp === s.baseLP ? 'selected' : '', `data-value="${lp}" aria-pressed="${lp === s.baseLP}" ${busy ? 'disabled' : ''}`)).join('')}</div></div>
    <div class="action-controls">${ACTIONS.map((a, i) => btn(`<span class="action-icon">${icon(['sword', 'orbit', 'shield-plus', 'sparkles'][i])}</span><b>${c.skills[i]}</b><small>${i === 3 ? '必殺ゲージ ' + b.gauges[b.char] + '/100' : i === 0 ? '通常攻撃 · SP +1' : 'スキル' + i + ' · SP ' + c.sp[i]}</small><kbd>${['J / 1', 'K / 2', 'L / 3', 'U / 4'][i]}</kbd>`, 'attack', `action-button action-${a}`, `data-value="${a}" aria-label="${c.skills[i]}" title="${esc(SKILL_DETAILS[b.char][i])}" ${t.phase !== 'command' ? 'disabled' : ''}`)).join('')}</div></section>
    <div id="damage-layer" aria-live="off"></div><div class="battle-footer"><span>選択中は時間制限なし</span><span>共有SP ${b.sp}/10 · 必殺 ${b.gauges[b.char]}/100</span></div>
  </main>`;
}
function empty(i: string, title: string, text: string) {
  return `<div class="empty-state">${icon(i)}<h3>${title}</h3><p>${text}</p></div>`;
}
export function modal(title: string, body: string, footer = '', cls = '') {
  return `<div class="modal-backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">${title}</h2>${btn(icon('x'), 'close-modal', 'icon-button', 'aria-label="閉じる"')}</header><div class="modal-body">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</section></div>`;
}
export function summonResult(r: Summon) {
  return `<div class="summon-result rarity-${r.rarity}"><div class="summon-light">${icon(r.kind === 'weapon' ? 'sword' : 'sparkles')}</div><span class="eyebrow">A NEW POSSIBILITY</span><div class="result-rarity">${r.rarity}</div><h2>${esc(r.name)}</h2><p>${esc(r.info)}</p><span class="tiny-label">${r.kind === 'weapon' ? '武器を獲得しました' : '星の記憶を獲得しました'}</span></div>`;
}
