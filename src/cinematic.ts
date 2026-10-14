import * as THREE from 'three';
import { CHARACTERS, type CharacterId } from './data';

type Point = [number, number, number];
export const ULTIMATE_THEMES = {
  ko: {
    title: '虚数の衝突',
    subtitle: 'IMAGINARY COLLISION',
    motif: '質量が、世界を歪める。',
    duration: 5,
    color: '#b3e7f2',
  },
  ao: {
    title: '反応の起爆',
    subtitle: 'CHAIN DETONATION',
    motif: 'すべての反応を、ひとつに。',
    duration: 4.8,
    color: '#91b9ff',
  },
  io: {
    title: '大地の再生',
    subtitle: 'GENESIS OF EARTH',
    motif: 'この大地が、みんなを守る。',
    duration: 5.2,
    color: '#f1c98e',
  },
  mi: {
    title: '毒の共鳴',
    subtitle: 'RESONANCE OF LIFE',
    motif: '命の記憶よ、響き渡れ。',
    duration: 4.9,
    color: '#9ee7b7',
  },
} as const;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
export const impactProgress = 0.72;
/** Authored camera rails, in world coordinates. Sampling has no gameplay effects. */
export function cinematicCamera(id: CharacterId, progress: number, reduced = false) {
  const p = Math.max(0, Math.min(1, progress));
  const keys: { at: number; position: Point; target: Point; fov: number; roll: number }[] = [
    { at: 0, position: [-0.45, 2.18, 0.9], target: [-1, 1.98, 2.65], fov: 27, roll: -0.035 },
    { at: 0.18, position: [-1.8, 1.95, 0.6], target: [-1, 1.85, 2.65], fov: 31, roll: 0.03 },
    {
      at: 0.5,
      position:
        id === 'ko'
          ? [-4.1, 0.75, 4.8]
          : id === 'ao'
            ? [2.6, 3.8, 2.4]
            : id === 'io'
              ? [-3, 0.65, 5]
              : [-2.3, 5.8, 1.8],
      target: [-1, 1.3, 2.65],
      fov: 44,
      roll: id === 'ao' ? -0.12 : 0.06,
    },
    {
      at: 0.66,
      position:
        id === 'ko'
          ? [-2.3, 1.65, -0.5]
          : id === 'ao'
            ? [4, 2.8, -2]
            : id === 'io'
              ? [1.5, 7.8, 2]
              : [1, 7, -2.6],
      target: [0, 1.6, -2.2],
      fov: id === 'ko' ? 34 : 48,
      roll: -0.1,
    },
    {
      at: 0.73,
      position:
        id === 'ko'
          ? [3.4, 0.9, -6.7]
          : id === 'ao'
            ? [-4.5, 2.5, -5.5]
            : id === 'io'
              ? [4.8, 1.05, -5.6]
              : [-3.8, 3.5, -6],
      target: [0, 1.5, -3.5],
      fov: 64,
      roll: 0.08,
    },
    { at: 0.85, position: [5.8, 4.4, 7.8], target: [0, 1.2, -2], fov: 48, roll: 0 },
    { at: 1, position: [7, 3.5, 10.5], target: [0, 1.4, -1], fov: 40, roll: 0 },
  ];
  if (reduced) return { ...keys[0], phase: 'portrait' };
  const next = keys.findIndex((k) => k.at >= p);
  const a = keys[Math.max(0, next - 1)],
    b = keys[next < 0 ? keys.length - 1 : next];
  const t = smooth(b.at === a.at ? 0 : (p - a.at) / (b.at - a.at));
  return {
    position: a.position.map((n, i) => mix(n, b.position[i], t)) as Point,
    target: a.target.map((n, i) => mix(n, b.target[i], t)) as Point,
    fov: mix(a.fov, b.fov, t),
    roll: mix(a.roll, b.roll, t),
    phase:
      p < 0.18
        ? 'portrait'
        : p < 0.5
          ? 'charge'
          : p < 0.72
            ? 'release'
            : p < 0.85
              ? 'impact'
              : 'recovery',
  };
}

export class UltimateScene {
  group = new THREE.Group();
  time = 0;
  hit = false;
  duration: number;
  private pieces: THREE.Mesh[] = [];
  private rings: THREE.Mesh[] = [];
  private beam: THREE.Mesh;
  private light: THREE.PointLight;
  constructor(
    public id: CharacterId,
    public reduced: boolean,
  ) {
    this.duration = reduced ? 0.4 : ULTIMATE_THEMES[id].duration;
    const color = ULTIMATE_THEMES[id].color;
    // Keep the character's magic color under the stage's bright HDR lighting.
    // Unlit effects avoid washing blue/green/gold into the same white highlight.
    const material = new THREE.MeshBasicMaterial({
      color: { ko: '#50d7f4', ao: '#4780ff', io: '#efa850', mi: '#55d899' }[id],
      toneMapped: false,
    });
    const rock = new THREE.MeshStandardMaterial({
      color: id === 'ko' ? '#314c68' : '#846c4c',
      metalness: 0.7,
      roughness: 0.4,
    });
    const add = (g: THREE.BufferGeometry, m: THREE.Material = material) => {
      const mesh = new THREE.Mesh(g, m);
      this.group.add(mesh);
      return mesh;
    };
    for (let i = 0; i < (id === 'mi' ? 20 : 12); i++) {
      let geometry: THREE.BufferGeometry;
      if (id === 'io') geometry = new THREE.CylinderGeometry(0.18, 0.6, 3.4, 5);
      else if (id === 'mi') geometry = new THREE.SphereGeometry(0.18, 6, 5);
      else geometry = new THREE.IcosahedronGeometry(id === 'ko' ? 0.32 : 0.19, 0);
      const part = add(geometry, id === 'ko' && i % 3 ? rock : material);
      if (id === 'mi') part.scale.set(1.8, 0.2, 0.7);
      this.pieces.push(part);
    }
    for (let i = 0; i < 4; i++) {
      const ring = add(new THREE.TorusGeometry(1 + i * 0.37, 0.018 + (i === 3 ? 0.035 : 0), 5, 64));
      this.rings.push(ring);
    }
    this.beam = add(new THREE.CylinderGeometry(0.1, 0.65, 11, 10));
    this.beam.position.set(0, 5, -3.5);
    if (id === 'mi') {
      for (const side of [-1, 1]) {
        const points = Array.from({ length: 65 }, (_, i) => {
          const a = (i / 64) * Math.PI * 5;
          return new THREE.Vector3(
            Math.cos(a) * side * 1.3,
            (i / 64) * 6,
            -3.5 + Math.sin(a) * 1.3,
          );
        });
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.055, 5, false));
      }
      // The open codex is original geometry, suspended in front of Minato.
      for (const side of [-1, 1]) {
        const cover = add(new THREE.BoxGeometry(0.65, 0.06, 0.85), rock);
        cover.position.set(-1 + side * 0.33, 1.8, 1.8);
        cover.rotation.z = side * 0.24;
        const pages = add(new THREE.BoxGeometry(0.59, 0.04, 0.79));
        pages.position.copy(cover.position);
        pages.position.y += 0.045;
        pages.rotation.copy(cover.rotation);
      }
    }
    this.light = new THREE.PointLight(color, 15, 12);
    this.light.position.set(-1, 2.5, 2.5);
    this.group.add(this.light);
  }
  update(dt: number) {
    this.time = Math.min(this.duration, this.time + dt);
    const p = this.time / this.duration;
    const charge = smooth(Math.min(1, Math.max(0, (p - 0.15) / 0.35))),
      fly = smooth(Math.min(1, Math.max(0, (p - 0.5) / 0.22)));
    const fade = p > 0.85 ? (1 - p) / 0.15 : 1;
    this.group.visible = !this.reduced && p > 0.14;
    this.light.intensity = (p > 0.7 ? 32 : 10) * fade;
    this.pieces.forEach((part, i) => {
      const angle =
        (i * Math.PI * 2) / this.pieces.length + this.time * (this.id === 'ao' ? 3 : 1.5);
      if (this.id === 'ko') {
        const radius =
          (1 + (i % 3) * 0.3) * charge * (1 - fly) + (p > 0.72 ? (p - 0.72) * 12 : 0.25);
        part.position.set(
          mix(-1, 0, fly) + Math.cos(angle) * radius,
          1.4 + Math.sin(angle * 1.7) * radius,
          mix(2.65, -3.5, fly) + Math.sin(angle) * radius,
        );
      } else if (this.id === 'ao') {
        const radius = 1.25 * charge * (1 - fly) + (p > 0.72 ? (p - 0.72) * 11 : 0.12);
        part.position.set(
          mix(-1, 0, fly) + Math.cos(angle) * radius,
          1.7 + Math.sin(angle * 2) * radius,
          mix(2.3, -3.5, fly) + Math.sin(angle) * radius,
        );
      } else if (this.id === 'io') {
        const growth = Math.max(0, Math.min(1, (p - 0.35 - i * 0.018) / 0.17));
        part.position.set(
          Math.cos(i * 2.4) * (1.2 + (i % 3)),
          -1.5 + growth * 2.7,
          -3.5 + Math.sin(i * 2.4) * 2.5,
        );
        part.scale.y = Math.max(0.01, growth * fade);
        part.rotation.z = Math.sin(i) * 0.25;
      } else {
        part.position.set(
          Math.cos(angle) * (1 + (i % 4) * 0.25),
          1 + (i % 7) * 0.65 * charge,
          -3.5 + Math.sin(angle) * 1.7,
        );
        part.rotation.set(Math.sin(this.time + i) * 0.8, angle, 0.4);
      }
      if (this.id !== 'mi' && this.id !== 'io') part.scale.setScalar(Math.max(0.01, charge * fade));
      part.rotation.y += dt * 3;
    });
    this.rings.forEach((ring, i) => {
      const impact = p >= 0.7;
      ring.position.set(impact ? 0 : -1, impact ? 0.12 + i * 0.025 : 1.3, impact ? -3.5 : 2.65);
      ring.rotation.set(
        impact || this.id === 'io' ? Math.PI / 2 : this.time * 0.5 + i,
        this.id === 'ao' && !impact ? this.time : 0,
        this.time * 0.8 + i,
      );
      ring.scale.setScalar(Math.max(0.01, impact ? (p - 0.7) * (16 + i * 2) : charge));
    });
    this.beam.visible = p >= 0.7 && p < 0.9;
    this.beam.scale.set(1 + Math.sin(p * 21) * 0.3, Math.max(0.1, fade), 1);
    const impact = !this.hit && p >= impactProgress;
    if (impact) this.hit = true;
    return { p, impact, done: p >= 1, camera: cinematicCamera(this.id, p, this.reduced) };
  }
  dispose() {
    const materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
      }
    });
    materials.forEach((m) => m.dispose());
  }
}
