/* ================= 3D building (three.js + LDraw) =================
 * Loads the packed LDraw models in models/, renders a picture of every piece for the Brickyard and cards,
 * and shows each player's model in 3D: pieces they have placed are solid, the rest are a see-through
 * "ghost" that shows where everything goes. Exposes window.Build3D for game.js.
 */
import * as THREE from 'three';
import {LDrawLoader} from 'three/addons/loaders/LDrawLoader.js';
import {LDrawConditionalLineMaterial} from 'three/addons/materials/LDrawConditionalLineMaterial.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const loader = new LDrawLoader();
loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
const materialsReady = loader.preloadMaterials('ldraw/LDConfig.ldr');

const models = new Map(); // file -> {root, units}

// A "unit" is one piece: a single part, or a whole minifigure. Keys match the pack files:
// "<part file>@<color code>" or "fig:<minifig sub-model>".
function collectUnits(root, figs) {
  const figSet = new Set((figs || []).map(f => f.toLowerCase()));
  const units = [];
  const walk = (group, inherited) => {
    for (const c of group.children) {
      if (!c.isGroup) continue;
      const name = (c.name || '').toLowerCase().replace(/\\/g, '/');
      let color = c.userData.colorCode;
      color = color === undefined || String(color) === '16' ? inherited : String(color);
      if (figSet.has(name)) units.push({obj: c, key: `fig:${name}`});
      else if (/part/i.test(c.userData.type || '') || name.endsWith('.dat')) units.push({obj: c, key: `${name}@${color}`});
      else walk(c, color);
    }
  };
  walk(root, '16');
  return units;
}

async function loadModel(model) {
  if (models.has(model.file)) return models.get(model.file);
  await materialsReady;
  // loader.load() would reset the preloaded LDConfig colors, so fetch the file and parse it ourselves.
  const text = await (await fetch(model.file)).text();
  const root = await new Promise((resolve, reject) => loader.parse(text, resolve, reject));
  root.rotation.x = Math.PI; // LDraw's up is -Y
  root.updateMatrixWorld(true);
  const units = collectUnits(root, model.figs);
  // Check the 3D model against the pack's piece list.
  const counts = {};
  for (const u of units) counts[u.key] = (counts[u.key] || 0) + 1;
  for (const k of new Set([...Object.keys(counts), ...Object.keys(model.parts)]))
    if ((counts[k] || 0) !== (model.parts[k] || 0)) console.warn(`${model.no}: ${k} model ${counts[k] || 0} vs pack ${model.parts[k] || 0}`);
  const data = {root, units};
  models.set(model.file, data);
  return data;
}

/* ---------- Piece pictures ---------- */
let thumbRenderer = null;
function thumbnail(obj) {
  const size = 128;
  if (!thumbRenderer) {
    thumbRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
    thumbRenderer.setSize(size, size);
  }
  const scene = lightScene(new THREE.Scene());
  const piece = obj.clone();
  piece.position.set(0, 0, 0);
  piece.quaternion.identity();
  const holder = new THREE.Group();
  holder.rotation.x = Math.PI;
  holder.add(piece);
  scene.add(holder);
  const box = new THREE.Box3().setFromObject(holder);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  const dir = new THREE.Vector3(1, .9, 1.3).normalize();
  camera.position.copy(sphere.center).addScaledVector(dir, sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.02);
  camera.lookAt(sphere.center);
  thumbRenderer.render(scene, camera);
  return thumbRenderer.domElement.toDataURL('image/png');
}

function lightScene(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6070, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(300, 500, 400);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, .8);
  fill.position.set(-400, 200, -300);
  scene.add(fill);
  return scene;
}

// Load every model in a card set and give each piece a picture (PIECES[key].img).
async function loadSet(set, onProgress) {
  let done = 0;
  const all = await Promise.all(set.models.map(m => loadModel(m).then(d => { onProgress && onProgress(++done, set.models.length); return d; })));
  for (const d of all) for (const u of d.units) {
    const p = PIECES[u.key];
    if (p && !p.img) p.img = thumbnail(u.obj);
  }
}

/* ---------- Build views ---------- */
const ghostMesh = new THREE.MeshBasicMaterial({color: 0x9fb6cc, transparent: true, opacity: .1, depthWrite: false});
const ghostLine = new THREE.LineBasicMaterial({color: 0x6f8aa6, transparent: true, opacity: .35});
const hintMesh = new THREE.MeshBasicMaterial({color: 0xffd500, transparent: true, opacity: .55, depthWrite: false});
const views = new Set();

class BuildView {
  constructor(container, model, {autoRotate = false} = {}) {
    const data = models.get(model.file);
    this.container = container;
    this.root = data.root.clone(true);
    this.units = collectUnits(this.root, model.figs);
    for (const u of this.units) {
      u.placed = false;
      u.obj.userData.home = u.obj.position.clone();
      u.obj.traverse(o => { if (o.material) o.userData.mat = o.material; });
      this.setLook(u, 'ghost');
    }
    this.scene = lightScene(new THREE.Scene());
    this.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    const sphere = new THREE.Box3().setFromObject(this.root).getBoundingSphere(new THREE.Sphere());
    this.height = sphere.radius;
    this.camera = new THREE.PerspectiveCamera(32, 1, 1, 20000);
    this.camera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(1, .75, 1.35).normalize(), sphere.radius / Math.sin(THREE.MathUtils.degToRad(16)) * .82);
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(sphere.center);
    this.controls.enablePan = false;
    this.controls.autoRotate = autoRotate;
    this.controls.autoRotateSpeed = 3;
    this.controls.addEventListener('change', () => this.dirty = true);
    this.controls.update();
    this.anims = [];
    this.dirty = true;
    this.resizer = new ResizeObserver(() => this.resize());
    this.resizer.observe(container);
    this.resize();
    views.add(this);
  }
  setLook(u, look) {
    u.obj.traverse(o => {
      if (!o.userData.mat) return;
      if (look === 'solid') { o.material = o.userData.mat; o.visible = true; }
      else if (o.isMesh) o.material = look === 'hint' ? hintMesh : ghostMesh;
      else if (o.isConditionalLine) o.visible = false;
      else o.material = ghostLine;
    });
  }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  // Show exactly `counts[key]` placed pieces of each kind (no animation).
  setPlaced(counts) {
    const seen = {};
    for (const u of this.units) {
      seen[u.key] = (seen[u.key] || 0) + 1;
      const placed = seen[u.key] <= (counts[u.key] || 0);
      if (placed !== u.placed) { u.placed = placed; this.setLook(u, placed ? 'solid' : 'ghost'); u.obj.position.copy(u.obj.userData.home); }
    }
    this.dirty = true;
  }
  // Drop the next piece of this kind into place.
  place(key) {
    const u = this.units.find(x => x.key === key && !x.placed);
    if (!u) return;
    u.placed = true;
    this.setLook(u, 'solid');
    const parent = u.obj.parent, home = u.obj.userData.home;
    const worldHome = parent.localToWorld(home.clone());
    const start = parent.worldToLocal(worldHome.clone().add(new THREE.Vector3(0, this.height * 1.2, 0)));
    u.obj.position.copy(start);
    this.anims.push({u, start, home, t0: performance.now(), dur: 650});
    this.dirty = true;
  }
  // Take the most recently placed piece of this kind back off the model.
  unplace(key) {
    const u = [...this.units].reverse().find(x => x.key === key && x.placed);
    if (!u) return;
    u.placed = false;
    u.obj.position.copy(u.obj.userData.home);
    this.setLook(u, 'ghost');
    this.dirty = true;
  }
  // Light up where pieces of this kind go.
  hint(key) {
    for (const u of this.units) if (!u.placed) this.setLook(u, u.key === key ? 'hint' : 'ghost');
    this.dirty = true;
  }
  celebrate() { this.controls.autoRotate = true; }
  tick(now) {
    if (this.anims.length) {
      this.anims = this.anims.filter(a => {
        const t = Math.min(1, (now - a.t0) / a.dur);
        const e = bounce(t);
        a.u.obj.position.lerpVectors(a.start, a.home, e);
        return t < 1;
      });
      this.dirty = true;
    }
    if (this.controls.autoRotate) { this.controls.update(); this.dirty = true; }
    if (this.dirty) { this.renderer.render(this.scene, this.camera); this.dirty = false; }
  }
  dispose() {
    views.delete(this);
    this.resizer.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
function bounce(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
  return n * (t -= 2.625 / d) * t + .984375;
}
(function loop(now) {
  for (const v of views) v.tick(now);
  requestAnimationFrame(loop);
})(performance.now());

window.Build3D = {
  loadSet,
  createView: (container, model, opts) => new BuildView(container, model, opts),
};
window.dispatchEvent(new Event('build3d-ready'));
