import * as THREE from 'three';
import { CHARACTERS, type ActionId, type CharacterId } from './data';
import type { State } from './model';
import { UltimateScene } from './cinematic';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mat = (color: string | number, metalness = 0.15, roughness = 0.7) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });
const glow = (color: string, strength = 1.6) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: strength,
    roughness: 0.4,
    metalness: 0.3,
  });
function mesh(
  g: THREE.BufferGeometry,
  m: THREE.Material,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cyl = (top: number, bottom: number, height: number, n = 8) =>
  new THREE.CylinderGeometry(top, bottom, height, n);

interface Avatar {
  root: THREE.Group;
  body: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  cape: THREE.Mesh;
  weapon: THREE.Group;
}
function makeAvatar(id: CharacterId): Avatar {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const c = CHARACTERS[id],
    navy = mat('#122338', 0.35, 0.53),
    dark = mat('#0b172a'),
    trim = mat('#d8c294', 0.7, 0.3),
    cloth = mat(c.color, 0.1, 0.62),
    skin = mat('#e3bcab', 0, 0.9),
    hair = mat(
      id === 'ao' ? '#c6d7e3' : id === 'io' ? '#544239' : id === 'mi' ? '#a2b3a1' : '#1d3850',
      0.12,
      0.8,
    );
  const legs: THREE.Group[] = [],
    arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.18, 0.92, 0);
    body.add(leg);
    mesh(cyl(0.115, 0.095, 0.64), dark, leg, 0, -0.28, 0);
    mesh(cyl(0.1, 0.13, 0.35), navy, leg, 0, -0.66, 0.015);
    mesh(box(0.23, 0.12, 0.38), dark, leg, 0, -0.86, 0.085);
    mesh(cyl(0.112, 0.112, 0.05), trim, leg, 0, -0.5, 0);
    legs.push(leg);
  }
  mesh(cyl(0.26, 0.31, 0.66), navy, body, 0, 1.28, 0);
  mesh(cyl(0.32, 0.55, 0.8, 10), navy, body, 0, 0.85, -0.045);
  mesh(cyl(0.325, 0.325, 0.075), trim, body, 0, 1.1, 0);
  const chest = mesh(box(0.13, 0.55, 0.03), cloth, body, -0.055, 1.39, 0.27);
  chest.rotation.z = -0.13;
  for (let i = 0; i < 3; i++)
    mesh(new THREE.SphereGeometry(0.027, 6, 4), trim, body, 0.1, 1.2 + i * 0.14, 0.285);
  mesh(cyl(0.12, 0.15, 0.17), skin, body, 0, 1.72, 0);
  const capeShape = new THREE.Shape();
  capeShape.moveTo(-0.37, 0);
  capeShape.lineTo(0.37, 0);
  capeShape.lineTo(0.67, -1.3);
  capeShape.lineTo(0.15, -1.18);
  capeShape.lineTo(-0.6, -1.35);
  capeShape.closePath();
  const capeMat = mat(id === 'ko' ? '#b1d7d5' : c.color, 0.12, 0.8);
  capeMat.side = THREE.DoubleSide;
  const cape = mesh(
    new THREE.ExtrudeGeometry(capeShape, { depth: 0.05, bevelEnabled: false }),
    capeMat,
    body,
    0,
    1.7,
    -0.2,
  );
  cape.rotation.x = 0.18;
  mesh(cyl(0.35, 0.3, 0.16), cloth, body, 0, 1.69, 0);
  const scarf = mesh(box(0.16, 0.7, 0.065), cloth, body, 0.22, 1.27, 0.31);
  scarf.rotation.z = -0.17;
  const face = mesh(new THREE.SphereGeometry(0.28, 20, 16), skin, body, 0, 2.04, 0);
  face.scale.set(0.9, 1.14, 0.9);
  const cap = mesh(
    new THREE.SphereGeometry(0.285, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hair,
    body,
    0,
    2.12,
    -0.025,
  );
  cap.scale.set(1, 1.1, 1);
  for (let i = 0; i < 9; i++) {
    const angle = (i - 4) * 0.29;
    const lock = mesh(
      new THREE.ConeGeometry(0.09, 0.19 + (i % 3) * 0.035, 4),
      hair,
      body,
      Math.sin(angle) * 0.24,
      2.2,
      0.14 + Math.cos(angle) * 0.08,
    );
    lock.rotation.set(0.13, angle, Math.PI + angle * 0.45);
  }
  for (const side of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.055, 8, 6), skin, body, side * 0.26, 2, 0);
    const eye = mesh(box(0.088, 0.025, 0.018), mat('#f3f7f3'), body, side * 0.105, 2.035, 0.235);
    eye.rotation.z = side * 0.08;
    mesh(
      box(0.034, 0.03, 0.02),
      mat(id === 'ko' ? '#58c6db' : c.color),
      body,
      side * 0.104,
      2.033,
      0.248,
    );
    mesh(box(0.018, 0.027, 0.022), dark, body, side * 0.102, 2.033, 0.255);
    const brow = mesh(box(0.095, 0.018, 0.025), hair, body, side * 0.105, 2.09, 0.235);
    brow.rotation.z = side * -0.13;
    const arm = new THREE.Group();
    arm.position.set(side * 0.35, 1.58, 0);
    body.add(arm);
    mesh(new THREE.SphereGeometry(0.17, 10, 8), navy, arm, side * 0.04, -0.03, 0);
    const sleeve = mesh(cyl(0.13, 0.1, 0.47), navy, arm, side * 0.09, -0.24, 0);
    sleeve.rotation.z = side * 0.12;
    mesh(cyl(0.11, 0.11, 0.1), trim, arm, side * 0.11, -0.44, 0);
    mesh(new THREE.SphereGeometry(0.105, 8, 6), skin, arm, side * 0.11, -0.57, 0.015);
    arms.push(arm);
  }
  const weapon = new THREE.Group();
  weapon.position.set(0.49, 0.75, 0.12);
  body.add(weapon);
  if (id === 'ko') {
    mesh(box(0.045, 1.12, 0.09), trim, weapon, 0, 0.42, 0);
    mesh(box(0.03, 1.04, 0.045), glow(c.color, 0.6), weapon, 0.03, 0.45, 0.055);
    mesh(box(0.32, 0.045, 0.13), trim, weapon, 0, -0.08, 0);
    mesh(cyl(0.04, 0.04, 0.28), dark, weapon, 0, -0.25, 0);
    weapon.rotation.z = -0.25;
  } else if (id === 'ao') {
    mesh(new THREE.IcosahedronGeometry(0.22, 0), glow(c.color), weapon, 0, 0.5, 0);
    const ring = mesh(new THREE.TorusGeometry(0.34, 0.018, 6, 32), trim, weapon, 0, 0.5, 0);
    ring.rotation.x = 0.6;
  } else {
    mesh(cyl(0.035, 0.035, 1.8), trim, weapon, 0, 0.2, 0);
    mesh(new THREE.OctahedronGeometry(0.21), glow(c.color), weapon, 0, 1.17, 0);
    const ring = mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 16), trim, weapon, 0, 1.15, 0);
    ring.rotation.y = 0.3;
  }
  return { root, body, legs, arms, cape, weapon };
}

export class World {
  renderer: THREE.WebGLRenderer | null = null;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 180);
  avatar: Avatar;
  enemy = new THREE.Group();
  enemyCore!: THREE.Mesh;
  portal = new THREE.Group();
  telegraph: THREE.Mesh;
  danger: THREE.Mesh;
  active = 'home';
  selected: CharacterId = 'ko';
  time = 0;
  attackTime = 0;
  dodgeTime = 0;
  reduced = false;
  private stars!: THREE.Points;
  private floaters: THREE.Object3D[] = [];
  private effects: { mesh: THREE.Mesh; age: number; life: number; kind: string }[] = [];
  private target = v(-0.8, 1.65, -1.4);
  private resizeObserver: ResizeObserver;
  private isMoving = false;
  private party: Record<CharacterId, Avatar>;
  private ultimate: { scene: UltimateScene; impact: () => void; complete: () => void } | null =
    null;
  get cinematic() {
    return this.ultimate !== null;
  }
  ready = false;
  constructor(canvas: HTMLCanvasElement) {
    this.camera.position.set(7.6, 4, 11);
    this.camera.lookAt(this.target);
    this.avatar = makeAvatar('ko');
    this.scene.add(this.avatar.root);
    this.party = Object.fromEntries(
      (['ko', 'ao', 'io', 'mi'] as CharacterId[]).map((id) => {
        const a = makeAvatar(id);
        a.root.visible = false;
        this.scene.add(a.root);
        return [id, a];
      }),
    ) as Record<CharacterId, Avatar>;
    this.telegraph = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 2.8, 64),
      new THREE.MeshBasicMaterial({
        color: '#ff7165',
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.telegraph.rotation.x = -Math.PI / 2;
    this.telegraph.position.y = 0.06;
    this.telegraph.visible = false;
    this.scene.add(this.telegraph);
    this.danger = new THREE.Mesh(
      new THREE.RingGeometry(2.72, 2.8, 64),
      new THREE.MeshBasicMaterial({
        color: '#ff8474',
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    this.danger.rotation.x = -Math.PI / 2;
    this.danger.position.y = 0.07;
    this.danger.visible = false;
    this.scene.add(this.danger);
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      const gl = this.renderer.getContext(),
        debug = gl.getExtension('WEBGL_debug_renderer_info');
      const software =
        debug &&
        /swiftshader|llvmpipe|software/i.test(
          String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
        );
      this.renderer.setPixelRatio(
        software ? 0.85 : Math.min(devicePixelRatio, innerWidth < 1100 ? 1.25 : 1.5),
      );
      this.renderer.shadowMap.enabled = !software;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.3;
      this.buildScene();
      this.ready = true;
    } catch {
      canvas.classList.add('webgl-unavailable');
    }
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(document.body);
    this.resize();
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.ready = false;
      document.dispatchEvent(new CustomEvent('world-lost'));
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.ready = true;
      document.dispatchEvent(new CustomEvent('world-restored'));
    });
  }
  buildScene() {
    this.scene.background = new THREE.Color('#132735');
    this.scene.fog = new THREE.FogExp2('#132b3a', 0.022);
    this.scene.add(new THREE.HemisphereLight('#b6e6ef', '#142239', 2.4));
    const sun = new THREE.DirectionalLight('#ffe1ae', 3.8);
    sun.position.set(-7, 14, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 45 });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#7bdaf5', 3);
    rim.position.set(4, 7, -7);
    this.scene.add(rim);
    const portalLight = new THREE.PointLight('#8fe9ed', 24, 14);
    portalLight.position.set(0, 4, -5);
    this.scene.add(portalLight);
    const stone = mat('#41505a', 0.18, 0.85),
      darkStone = mat('#243540', 0.25, 0.9),
      edge = mat('#a2a697', 0.32, 0.7),
      gold = mat('#bcaa7b', 0.65, 0.4);
    mesh(cyl(14, 13, 0.8, 64), darkStone, this.scene, 0, -0.5, 0);
    mesh(cyl(13.6, 13.6, 0.12, 64), edge, this.scene, 0, -0.07, 0);
    mesh(cyl(13.4, 13.4, 0.08, 64), stone, this.scene, 0, 0.02, 0);
    for (const radius of [3, 6.5, 11.5, 13]) {
      const ring = mesh(
        new THREE.TorusGeometry(radius, 0.018, 4, 100),
        radius === 6.5 ? glow('#89cfd0', 0.5) : gold,
        this.scene,
        0,
        0.075,
        0,
      );
      ring.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2,
        r = 12.4;
      const line = mesh(
        box(0.035, 0.012, 8),
        gold,
        this.scene,
        Math.sin(angle) * 7,
        0.077,
        Math.cos(angle) * 7,
      );
      line.rotation.y = angle;
      const marker = mesh(
        box(0.18, 0.02, 0.7),
        glow('#b7e4df', 0.4),
        this.scene,
        Math.sin(angle) * r,
        0.09,
        Math.cos(angle) * r,
      );
      marker.rotation.y = angle;
    }
    // Monumental ruined library, built from original geometry and locally rendered materials.
    for (let i = 0; i < 13; i++) {
      const angle = Math.PI * (0.55 + (i / 12) * 0.9),
        x = Math.cos(angle) * 14.8,
        z = Math.sin(angle) * -13;
      const height = 7 + (i % 3) * 1.7;
      mesh(box(1.4, 0.45, 1.4), edge, this.scene, x, 0.2, z);
      mesh(cyl(0.42, 0.58, height, 8), darkStone, this.scene, x, height / 2 + 0.4, z);
      mesh(cyl(0.65, 0.45, 0.5, 8), edge, this.scene, x, height + 0.5, z);
      mesh(
        box(0.06, height * 0.65, 0.06),
        glow('#b2dfdd', 0.65),
        this.scene,
        x + 0.36,
        height * 0.55,
        z + 0.3,
      );
      if (i < 12) {
        const arch = mesh(box(3, 0.55, 0.8), darkStone, this.scene, x + 1.1, height, z);
        arch.rotation.z = 0.06;
      }
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++)
        mesh(box(3.2, 0.3, 1.4), edge, this.scene, side * 8, i * 0.28, -5 - i * 1.2);
      mesh(box(2.5, 1.4, 1.4), darkStone, this.scene, side * 8, 1.8, -9.7);
      const lantern = mesh(
        new THREE.OctahedronGeometry(0.28),
        glow('#bdebf0', 3),
        this.scene,
        side * 8,
        3,
        -9.7,
      );
      this.floaters.push(lantern);
    }
    this.portal.position.set(0, 4.7, -8);
    this.scene.add(this.portal);
    for (let i = 0; i < 8; i++) {
      const arc = mesh(
        new THREE.TorusGeometry(3.7, 0.16, 8, 20, 0.56),
        i % 2 ? gold : edge,
        this.portal,
      );
      arc.rotation.z = (i * Math.PI) / 4;
      const rune = mesh(
        box(0.12, 0.55, 0.16),
        glow('#a9e6df', 1.3),
        this.portal,
        Math.sin((i * Math.PI) / 4) * 3.3,
        Math.cos((i * Math.PI) / 4) * 3.3,
        0.15,
      );
      rune.rotation.z = (-i * Math.PI) / 4;
    }
    const inner = mesh(
      new THREE.TorusGeometry(2.8, 0.018, 4, 100),
      glow('#c5b47d', 1.3),
      this.portal,
    );
    inner.rotation.x = 0.12;
    const star = mesh(new THREE.OctahedronGeometry(0.48), glow('#c7eee7', 2), this.portal);
    star.scale.y = 1.6;
    this.floaters.push(star);
    for (let i = 0; i < 20; i++) {
      const a = i * 2.39,
        r = 5 + (i % 5) * 2;
      const book = new THREE.Group();
      book.position.set(Math.sin(a) * r, 2 + (i % 4), -6 - Math.abs(Math.cos(a) * 5));
      book.rotation.set(0.3, a, -0.25);
      mesh(box(0.45, 0.11, 0.65), mat(i % 2 ? '#6b7972' : '#566679'), book);
      mesh(box(0.41, 0.075, 0.59), mat('#c6bea2'), book, 0, 0.01, 0.01);
      mesh(box(0.45, 0.02, 0.65), gold, book, 0, 0.07, 0);
      this.scene.add(book);
      this.floaters.push(book);
    }
    for (let i = 0; i < 22; i++) {
      const rock = mesh(
        new THREE.DodecahedronGeometry(1.2 + (i % 4), 0),
        darkStone,
        this.scene,
        Math.sin(i * 2.4) * 35,
        -5 - (i % 4) * 2,
        -20 - i * 1.7,
      );
      rock.scale.set(1.8, 0.6, 1);
      mesh(
        cyl(0.25, 0.45, 5 + (i % 3)),
        darkStone,
        this.scene,
        rock.position.x,
        rock.position.y + 3,
        rock.position.z,
      );
    }
    const stars = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      stars[i * 3] = (Math.random() - 0.5) * 65;
      stars[i * 3 + 1] = Math.random() * 30;
      stars[i * 3 + 2] = (Math.random() - 0.7) * 60;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: '#cae6d8', size: 0.055, transparent: true, opacity: 0.7 }),
    );
    this.scene.add(this.stars);
    this.createEnemy();
    this.enemy.visible = false;
  }
  createEnemy() {
    const shell = mat('#24394c', 0.65, 0.4),
      dark = mat('#172433', 0.55, 0.45),
      light = glow('#f1b38b', 1.8);
    this.enemyCore = mesh(new THREE.OctahedronGeometry(0.75, 0), light, this.enemy, 0, 1.8, 0);
    this.enemyCore.scale.y = 1.4;
    for (const side of [-1, 1]) {
      const shoulder = mesh(
        new THREE.DodecahedronGeometry(0.65, 0),
        shell,
        this.enemy,
        side * 1.1,
        2.1,
        0,
      );
      shoulder.scale.set(0.8, 1.2, 0.8);
      const claw = mesh(
        new THREE.ConeGeometry(0.3, 1.3, 4),
        dark,
        this.enemy,
        side * 1.3,
        1.1,
        0.12,
      );
      claw.rotation.z = side * -0.3;
      mesh(box(0.16, 0.045, 0.05), light, this.enemy, side * 0.22, 2, 0.59);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const shard = mesh(
        new THREE.OctahedronGeometry(0.35),
        shell,
        this.enemy,
        Math.cos(a) * 1.2,
        1.8 + Math.sin(a) * 1.4,
        -0.25,
      );
      shard.rotation.z = a;
      shard.scale.y = 1.6;
    }
    const ring = mesh(new THREE.TorusGeometry(1.1, 0.025, 5, 48), light, this.enemy, 0, 1.8, 0);
    ring.rotation.set(0.3, 0.5, 0);
    this.scene.add(this.enemy);
  }
  setCharacter(id: CharacterId) {
    if (id === this.selected) return;
    this.selected = id;
    const position = this.avatar.root.position.clone(),
      rotation = this.avatar.root.rotation.clone();
    this.scene.remove(this.avatar.root);
    this.disposeObject(this.avatar.root);
    this.avatar = makeAvatar(id);
    this.avatar.root.position.copy(position);
    this.avatar.root.rotation.copy(rotation);
    this.scene.add(this.avatar.root);
  }
  disposeObject(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
  setView(view: string) {
    this.active = view;
    this.enemy.visible = view === 'battle' || this.cinematic;
    if (view !== 'battle') {
      this.telegraph.visible = this.danger.visible = false;
      this.avatar.root.position.set(0, 0, 1);
    }
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(w, h);
  }
  project(x: number, y: number, z: number) {
    const p = v(x, y, z).project(this.camera);
    return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
  }
  setMoving(value: boolean) {
    this.isMoving = value;
  }
  attack(action: ActionId, x: number, z: number) {
    this.attackTime = 0.5;
    if (!this.ready) return;
    const color = CHARACTERS[this.selected].color;
    const ring = mesh(
      new THREE.TorusGeometry(
        action === 'ultimate' ? 2.4 : 1.2,
        action === 'ultimate' ? 0.11 : 0.055,
        4,
        48,
        Math.PI * 1.6,
      ),
      glow(color, 3),
      this.scene,
      x,
      0.6,
      z,
    );
    ring.rotation.x = Math.PI / 2 - 0.4;
    this.effects.push({ mesh: ring, age: 0, life: this.reduced ? 0.15 : 0.55, kind: 'slash' });
    if (action === 'ultimate') {
      const beam = mesh(
        cyl(0.12, 0.8, 12, 12),
        glow(color, 3),
        this.scene,
        this.enemy.position.x,
        5,
        this.enemy.position.z,
      );
      this.effects.push({ mesh: beam, age: 0, life: 0.8, kind: 'beam' });
    }
  }
  playUltimate(id: CharacterId, impact: () => void, complete: () => void) {
    if (this.ultimate) return;
    this.setCharacter(id);
    this.avatar.root.rotation.y = Math.PI;
    this.avatar.root.position.set(-1, 0.04, 2.65);
    this.enemy.position.set(0, 0.07, -3.5);
    this.enemy.visible = true;
    const scene = new UltimateScene(id, this.reduced);
    this.scene.add(scene.group);
    this.ultimate = { scene, impact, complete };
    this.scene.background = new THREE.Color('#081422');
    (this.scene.fog as THREE.FogExp2).density = 0.045;
  }
  skipUltimate() {
    const u = this.ultimate;
    if (!u) return;
    if (!u.scene.hit) {
      u.scene.hit = true;
      u.impact();
    }
    this.ultimate = null;
    this.scene.remove(u.scene.group);
    u.scene.dispose();
    this.camera.fov = 40;
    this.camera.updateProjectionMatrix();
    this.camera.rotation.z = 0;
    this.scene.background = new THREE.Color('#132735');
    (this.scene.fog as THREE.FogExp2).density = 0.022;
    u.complete();
  }
  impact(x: number, z: number) {
    const ring = mesh(
      new THREE.TorusGeometry(0.3, 0.08, 4, 48),
      glow('#f7a28d', 2),
      this.scene,
      x,
      0.15,
      z,
    );
    ring.rotation.x = Math.PI / 2;
    this.effects.push({ mesh: ring, age: 0, life: 0.5, kind: 'impact' });
  }
  update(dt: number, s: State) {
    if (!this.ready || !this.renderer) return;
    this.time += dt;
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.dodgeTime = Math.max(0, this.dodgeTime - dt);
    const b = s.battle,
      battle = this.active === 'battle' && b;
    const portrait = this.active === 'characters' || this.active === 'summon';
    const narrow = innerWidth / innerHeight < 1.1;
    const cinematic = this.ultimate;
    Object.entries(this.party).forEach(([id, ally], i) => {
      ally.root.visible = !!battle && !cinematic && id !== b?.char;
      ally.root.position.set([-4.5, -2.6, 0.6, 2.6][i], 0.04, 5.6 + (i % 2) * 0.2);
      ally.root.scale.setScalar(0.78);
      ally.root.rotation.y = Math.PI;
      ally.body.position.y = this.reduced ? 0 : Math.sin(this.time * 1.6 + i) * 0.015;
    });
    let cinematicFrame: ReturnType<UltimateScene['update']> | null = null;
    if (cinematic) {
      this.setCharacter(cinematic.scene.id);
      cinematicFrame = cinematic.scene.update(dt);
      const f = cinematicFrame,
        p = f.p;
      this.avatar.root.position.set(-1, 0.04, 2.65);
      this.avatar.root.rotation.y = Math.PI;
      if (cinematic.scene.id === 'ko' && p > 0.5 && p < 0.85)
        this.avatar.root.position.z -= Math.sin(((p - 0.5) / 0.35) * Math.PI) * 4.5;
      this.camera.position.set(...f.camera.position);
      this.target.set(...f.camera.target);
      this.camera.fov = f.camera.fov;
      this.camera.updateProjectionMatrix();
      this.avatar.root.scale.setScalar(1);
      this.enemy.position.set(0, 0.07, -3.5);
      this.enemyCore.rotation.y += dt;
      this.renderer.domElement.dataset.cameraShot = f.camera.phase;
      this.renderer.domElement.dataset.cinematic = cinematic.scene.id;
    } else if (battle) {
      this.setCharacter(b.char);
      this.avatar.root.position.set(-1, 0.04, 2.65);
      this.avatar.root.rotation.y = Math.PI;
      this.enemy.position.set(0, 0.07, -3.5);
      if (this.attackTime > 0)
        this.avatar.root.position.z -= Math.sin((this.attackTime / 0.5) * Math.PI) * 0.7;
      const cam = narrow ? v(8, 5.6, 14) : v(7, 3.5, 10.5);
      this.camera.position.lerp(cam, Math.min(1, dt * 6));
      this.target.lerp(v(0, 1.4, -1), Math.min(1, dt * 6));
      this.enemyCore.rotation.y += dt * 0.45;
      this.enemyCore.position.y = 1.8 + Math.sin(this.time * 2) * 0.12;
    } else {
      this.setCharacter(s.selected);
      const cam = narrow ? v(6.8, 4.1, 12.8) : portrait ? v(4.7, 3, 7.3) : v(7.6, 4, 11);
      const target = portrait ? v(1.7, 1.3, 0) : narrow ? v(0, 1.5, -1) : v(-0.8, 1.65, -1.4);
      this.camera.position.lerp(cam, Math.min(1, dt * 3));
      this.target.lerp(target, Math.min(1, dt * 3));
      this.avatar.root.rotation.y = 0.25 + (this.reduced ? 0 : Math.sin(this.time * 0.22) * 0.08);
      this.avatar.root.position.y = 0.04;
    }
    this.avatar.root.scale.setScalar(
      battle || cinematic ? 1 : portrait ? 1 : innerHeight < 500 ? 1.42 : 1.12,
    );
    this.camera.lookAt(this.target);
    if (cinematicFrame) this.camera.rotation.z += cinematicFrame.camera.roll;
    const animTime = this.reduced ? 0 : this.time;
    const run = battle && this.isMoving;
    this.avatar.legs.forEach(
      (leg, i) => (leg.rotation.x = run ? Math.sin(animTime * 12 + i * Math.PI) * 0.6 : 0),
    );
    this.avatar.arms.forEach(
      (arm, i) =>
        (arm.rotation.x =
          this.attackTime > 0
            ? -Math.sin((this.attackTime / 0.5) * Math.PI) * 1.4
            : run
              ? Math.sin(animTime * 12 + (i + 1) * Math.PI) * 0.4
              : Math.sin(animTime * 1.5) * 0.025),
    );
    this.avatar.body.position.y = run
      ? Math.abs(Math.sin(animTime * 12)) * 0.04
      : Math.sin(animTime * 1.6) * 0.015;
    this.avatar.body.rotation.z = this.dodgeTime > 0 ? -0.22 : 0;
    this.avatar.cape.rotation.x = 0.18 + (run ? 0.3 : 0) + Math.sin(animTime * 2) * 0.035;
    if (cinematicFrame) {
      const p = cinematicFrame.p,
        id = cinematic!.scene.id;
      const charge = Math.sin((Math.min(1, p / 0.65) * Math.PI) / 2);
      this.avatar.arms[1].rotation.x =
        id === 'ko'
          ? p < 0.6
            ? -0.8 * charge
            : -2.1 * Math.sin(((p - 0.6) / 0.4) * Math.PI)
          : -1.5 * charge;
      this.avatar.arms[0].rotation.x = id === 'io' ? -1.6 * charge : -0.6 * charge;
      this.avatar.body.rotation.x =
        id === 'ko' && p > 0.55 ? 0.25 * Math.sin(((p - 0.55) / 0.45) * Math.PI) : 0;
      this.avatar.weapon.rotation.y = id === 'ao' ? this.time * 2 : 0;
    } else {
      this.avatar.body.rotation.x = 0;
      this.avatar.weapon.rotation.y = 0;
    }
    if (!this.reduced) {
      this.portal.rotation.z = Math.sin(this.time * 0.08) * 0.07;
      this.stars.rotation.y += dt * 0.008;
      this.floaters.forEach((f, i) => {
        f.position.y += Math.sin(this.time + i) * dt * 0.065;
        f.rotation.y += dt * 0.07;
      });
    }
    this.effects = this.effects.filter((e) => {
      e.age += dt;
      const p = e.age / e.life;
      if (p >= 1) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        (e.mesh.material as THREE.Material).dispose();
        return false;
      }
      e.mesh.scale.setScalar(
        e.kind === 'beam' ? 1 - p * 0.8 : 1 + p * (e.kind === 'impact' ? 8 : 1.2),
      );
      const m = e.mesh.material as THREE.MeshStandardMaterial;
      m.transparent = true;
      m.opacity = 1 - p;
      if (e.kind === 'slash') e.mesh.rotation.z += dt * 8;
      return true;
    });
    this.renderer.render(this.scene, this.camera);
    if (cinematicFrame && this.ultimate === cinematic) {
      if (cinematicFrame.impact) cinematic!.impact();
      if (cinematicFrame.done) this.skipUltimate();
    }
  }
  setTelegraph(x: number, z: number, visible: boolean, progress = 0) {
    this.telegraph.visible = this.danger.visible = visible;
    this.telegraph.position.set(x, 0.09, z);
    this.danger.position.set(x, 0.1, z);
    this.telegraph.scale.setScalar(0.15 + 0.85 * progress);
    (this.telegraph.material as THREE.MeshBasicMaterial).opacity = 0.12 + progress * 0.2;
  }
  face(dx: number, dz: number) {
    if (dx || dz) this.avatar.root.rotation.y = Math.atan2(dx, dz);
  }
}
