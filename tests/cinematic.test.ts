import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_IDS } from '../src/data';
import { cinematicCamera, UltimateScene, ULTIMATE_THEMES } from '../src/cinematic';

test('four authored camera rails have close-ups, chase shots and distinct impact angles', () => {
  const impacts = new Set<string>();
  for (const id of CHARACTER_IDS) {
    const frames = [0, 0.18, 0.5, 0.66, 0.73, 0.85, 1].map((p) => cinematicCamera(id, p));
    assert.ok(
      frames.every((f) => [...f.position, ...f.target, f.fov, f.roll].every(Number.isFinite)),
    );
    assert.ok(frames[0].fov < frames[4].fov);
    assert.ok(Math.hypot(...frames[0].position.map((n, i) => n - frames[4].position[i])) > 4);
    assert.equal(frames[0].phase, 'portrait');
    assert.equal(frames[4].phase, 'impact');
    impacts.add(JSON.stringify(frames[4].position));
  }
  assert.equal(impacts.size, 4);
});
test('each 3D ultimate emits exactly one impact and releases its geometry', () => {
  for (const id of CHARACTER_IDS) {
    const scene = new UltimateScene(id, false);
    let hits = 0;
    assert.equal(scene.duration, ULTIMATE_THEMES[id].duration);
    for (let i = 0; i < 100; i++) if (scene.update(0.1).impact) hits++;
    assert.equal(hits, 1);
    assert.ok(scene.group.children.length >= 18);
    scene.dispose();
  }
});
test('reduced motion retains a stable portrait camera and still commits one impact', () => {
  for (const id of CHARACTER_IDS) {
    assert.deepEqual(cinematicCamera(id, 0.1, true), cinematicCamera(id, 0.9, true));
    const scene = new UltimateScene(id, true);
    assert.ok(scene.duration < 0.5);
    const f = scene.update(0.4);
    assert.equal(f.impact, true);
    assert.equal(f.done, true);
    assert.equal(scene.group.visible, false);
    scene.dispose();
  }
});
