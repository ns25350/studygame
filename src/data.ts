export const SUBJECTS = ['数学', '英語', '国語', '物理', '化学', '生物', '地学', 'その他'] as const;
export type CharacterId = 'ko' | 'ao' | 'io' | 'mi';
export type ActionId = 'normal' | 'skill1' | 'skill2' | 'ultimate';
export type Mode = 'normal' | 'boss' | 'endgame' | 'practice';
export const ACTIONS: ActionId[] = ['normal', 'skill1', 'skill2', 'ultimate'];
export const CHARACTERS = {
  ko: {
    name: 'コウイチロウ',
    title: '星を砕く観測者',
    element: '物理',
    role: '攻撃',
    rarity: 'S',
    weapon: '刃器',
    attack: 1000,
    color: '#b3e7f2',
    skills: ['運動の一撃', '一次元衝突', '加速する思考', '虚数の衝突'],
    sp: [0, 5, 2, 0],
    description: '質量と速さを操り、一撃にすべてを込める。',
  },
  ao: {
    name: 'アオイ',
    title: '蒼晶の錬金術師',
    element: '化学',
    role: '支援',
    rarity: 'S',
    weapon: '触媒',
    attack: 790,
    color: '#8fb4ff',
    skills: ['触媒の一滴', '連鎖反応', '反応促進', '反応の起爆'],
    sp: [0, 4, 2, 0],
    description: '連鎖する反応で、仲間の可能性を引き出す。',
  },
  io: {
    name: 'イオ',
    title: '地層の守り人',
    element: '地学',
    role: '防御',
    rarity: 'S',
    weapon: '測器',
    attack: 760,
    color: '#e2b58a',
    skills: ['地層の打撃', '堆積の盾', '岩盤の守り', '大地の再生'],
    sp: [0, 3, 2, 0],
    description: '幾重にも重なる大地の記憶を、仲間の盾に。',
  },
  mi: {
    name: 'ミナト',
    title: '生命を編む司書',
    element: '生物',
    role: '支援',
    rarity: 'A',
    weapon: '書杖',
    attack: 680,
    color: '#a0d9ae',
    skills: ['芽吹きの一撃', '毒性の標本', '生命の循環', '毒の共鳴'],
    sp: [0, 3, 2, 0],
    description: '小さな芽吹きが、やがて戦場を変えてゆく。',
  },
} as const;
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
export const DUNGEONS: Record<
  Mode,
  {
    name: string;
    enemy: string;
    hp: number;
    attack: number;
    gems: number;
    materials: number;
    exp: number;
    book: number;
    eyebrow: string;
    description: string;
  }
> = {
  normal: {
    name: '星降る資料庫',
    enemy: '頁喰らい',
    hp: 9000,
    attack: 90,
    gems: 45,
    materials: 12,
    exp: 25,
    book: 1,
    eyebrow: 'ARCHIVE 01',
    description: '散らばった知識の欠片を集める、最初の冒険。',
  },
  boss: {
    name: '未踏の公式',
    enemy: '未踏の公式',
    hp: 30000,
    attack: 130,
    gems: 120,
    materials: 40,
    exp: 60,
    book: 0,
    eyebrow: 'TARGET BOSS',
    description: 'まだ誰も解き明かしていない、星の方程式。',
  },
  endgame: {
    name: '終極の書庫',
    enemy: '終極の観測者',
    hp: 70000,
    attack: 220,
    gems: 180,
    materials: 60,
    exp: 100,
    book: 1,
    eyebrow: 'CHALLENGE',
    description: '学びの果てで待つ観測者。最少ターンの記録に挑もう。',
  },
  practice: {
    name: '訓練の庭',
    enemy: '訓練用の星核',
    hp: 9000,
    attack: 30,
    gems: 0,
    materials: 0,
    exp: 0,
    book: 0,
    eyebrow: 'FREE TRAINING',
    description: 'LP消費・報酬なし。4人の技とSPの使い方を試そう。',
  },
};
export interface WeaponTemplate {
  name: string;
  type: string;
  rarity: 'S' | 'A' | 'B';
  effect: string;
}
export const WEAPONS: WeaponTemplate[] = [
  { name: '慣性の定規', type: '刃器', rarity: 'S', effect: '通常攻撃 +18%' },
  { name: '蒼晶の試験管', type: '触媒', rarity: 'S', effect: 'スキル与ダメージ +15%' },
  { name: '地層の羅針盤', type: '測器', rarity: 'S', effect: '付与する盾 +25%' },
  { name: '星環のペン', type: '触媒', rarity: 'S', effect: '会心率 +10ポイント' },
  { name: '黎明の定理', type: '触媒', rarity: 'S', effect: '必殺ダメージ +25%' },
  { name: '観測者の杖', type: '書杖', rarity: 'S', effect: 'ゲージ獲得 +8' },
  { name: '白紙の刃', type: '刃器', rarity: 'S', effect: '攻撃力 +12%' },
  { name: '風化の針', type: '測器', rarity: 'S', effect: '与ダメージ +12%' },
  { name: '芽吹きの書杖', type: '書杖', rarity: 'S', effect: '回復量 +25%' },
  ...[
    '薄明の剣',
    '反応の瓶',
    '星読みの針',
    '新緑の杖',
    '静寂の刃',
    '群青の触媒',
    '方位の測器',
  ].flatMap((name, i): WeaponTemplate[] =>
    ['A', 'B'].map((rarity) => ({
      name: rarity === 'B' ? '見習いの' + name : name,
      type: ['刃器', '触媒', '測器', '書杖', '刃器', '触媒', '測器'][i],
      rarity: rarity as 'A' | 'B',
      effect: `与ダメージ +${rarity === 'A' ? 6 : 3}%`,
    })),
  ),
  ...CHARACTER_IDS.map((id) => ({
    name: '訓練用' + CHARACTERS[id].weapon,
    type: CHARACTERS[id].weapon,
    rarity: 'B' as const,
    effect: '追加効果なし',
  })),
];
export const BOOK_NAMES = ['基礎の書', '演習の書', '証明の書', '探究の書', '復習の書', '発見の書'];
export const BOOK_STATS = ['HP', '攻撃力', '防御力', '会心率', '属性ダメージ', '攻撃力'];
export const BOOK_BASE = [120, 35, 30, 0.05, 0.08, 0.06];
export const EDITIONS = ['基礎版', '観測版', '深淵版'];
export const SKILL_DETAILS: Record<CharacterId, string[]> = {
  ko: [
    '攻撃力60%の近接攻撃。衝突中は質量×速さ/20を加算し、初期質量の30%を失う。質量が負になると速さ²×0.2を加算して解除。',
    '攻撃力×技倍率×LP倍率の質量、50×技倍率×LP倍率の速さで衝突状態に入る。再使用は再設定。',
    '速さを10×技倍率×LP倍率加算。衝突状態で真価を発揮する。',
    '攻撃力1000%＋質量×速さ×3/20の大技。衝突状態を解除。',
  ],
  ao: [
    '攻撃力75%の遠距離攻撃。',
    '攻撃力170%の攻撃。共有状態異常を2追加。',
    '全員の与ダメージを1＋0.2×技倍率×LP倍率に更新。2ターン。',
    '攻撃力550%＋状態異常×300×LP倍率。状態異常を全消費。',
  ],
  io: [
    '攻撃力65%の近接攻撃。',
    '攻撃力80%の攻撃と、180×技倍率×LP倍率の共有盾。',
    '共有盾を130×技倍率×LP倍率追加する。',
    '攻撃力450%の攻撃。HPを150×技倍率×LP倍率回復。',
  ],
  mi: [
    '攻撃力70%の遠距離攻撃。',
    '攻撃力90%の攻撃。共有状態異常を3追加。',
    'HPを170×技倍率×LP倍率回復。',
    '攻撃力420%＋状態異常×180×LP倍率。状態異常は残る。',
  ],
};
