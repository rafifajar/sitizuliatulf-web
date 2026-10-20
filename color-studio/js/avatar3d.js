// 3D try-on avatar (Three.js, loaded on demand). A stylized, customizable figure:
// skin tone comes from the analysis, makeup is painted onto the face texture,
// and clothes, hijab, hair and accessories are rebuilt whenever the look changes.
// Swapping this module for a scanned-mesh avatar later only needs the same create/update API.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { lensPoints } from './render2d.js';
import { LENS_COLORS, METALS } from './data.js';
import { mix, shade } from './color.js';

const HEAD_SCALE = new THREE.Vector3(0.86, 1.08, 0.94);
const TARGET = new THREE.Vector3(0, -1.6, 0);
const LONG = ['blouse', 'kemeja', 'sweater', 'outer', 'setelan', 'kardigan'];
const SHORT = ['tshirt', 'dress', 'croptop'];

export async function createAvatar(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, -0.9, 21.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 7;
  controls.maxDistance = 26;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.maxPolarAngle = Math.PI * 0.68;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.7;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cdc0, 1.25));
  const key = new THREE.DirectionalLight(0xfff4ea, 1.7); key.position.set(5, 8, 10); scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf0ff, 0.55); fill.position.set(-8, 2, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(0, 6, -10); scene.add(rim);

  // soft floor shadow
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const sc = shadowCanvas.getContext('2d');
  const g = sc.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(60,40,30,.28)'); g.addColorStop(1, 'rgba(60,40,30,0)');
  sc.fillStyle = g; sc.fillRect(0, 0, 128, 128);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -7.2; scene.add(floor);

  // face texture
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = 1024; faceCanvas.height = 512;
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;

  const root = new THREE.Group(); scene.add(root);
  const dynamic = new THREE.Group(); root.add(dynamic);

  const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.55 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), headMat);
  head.scale.copy(HEAD_SCALE); root.add(head);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  let raf = 0;
  const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
  loop();

  /* ---------- builders ---------- */
  const mats = [];
  const M = (opts) => { const m = new THREE.MeshStandardMaterial(opts); mats.push(m); return m; };
  const metalMat = (hex) => { const m = M({ color: hex, metalness: 1, roughness: 0.22 }); m.envMap = envTex; return m; };
  let target = dynamic;
  const add = (geo, mat, parent = target) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };
  const lathe = (pts, mat, opts = {}) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64, opts.phiStart || 0, opts.phiLength || Math.PI * 2);
    const m = add(geo, mat, opts.parent); m.scale.z = opts.sz ?? 0.6; return m;
  };

  function paintFace(look, fx) {
    const c = faceCanvas.getContext('2d');
    const W = 1024, H = 512, cx = 256;
    c.fillStyle = look.skin; c.fillRect(0, 0, W, H);
    const k = look.makeupOn ? look.intensity : 0;
    const radial = (x, y, r, col, a) => {
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0));
      c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
    };
    // effect of the drape color on the skin
    if (fx?.glow) radial(cx, 270, 110, '#FFF6EC', fx.glow * 0.25);
    if (fx?.dull) radial(cx, 280, 140, fx.sallow, fx.dull * 0.3);
    if (fx?.pale) radial(cx, 270, 140, '#F3F1EE', fx.pale * 0.35);
    // blush
    [-72, 72].forEach((dx) => radial(cx + dx, 298, 36, look.blush, 0.55 * k));
    // eyeshadow + eyes
    [-58, 58].forEach((dx) => {
      const ex = cx + dx, ey = 238;
      c.save(); c.translate(ex, ey); c.scale(1.18, 1.18);
      const sg = c.createLinearGradient(0, 2, 0, -24);
      sg.addColorStop(0, hexA(look.shadow, 0.85 * k)); sg.addColorStop(1, hexA(look.shadow, 0));
      c.fillStyle = sg; c.beginPath(); c.ellipse(0, -6, 26, 16, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#FBF8F4'; c.beginPath(); c.moveTo(-21, 0); c.quadraticCurveTo(0, -14, 21, 0); c.quadraticCurveTo(0, 10, -21, 0); c.fill();
      c.fillStyle = '#3B2A22'; c.beginPath(); c.arc(0, -1, 7.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#120C0A'; c.beginPath(); c.arc(0, -1, 3.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(2.5, -3.5, 1.8, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#21160F'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(0, -17, 22, -1); c.stroke();
      c.strokeStyle = look.hijabOn ? '#3A2A22' : mix(look.hairColor, '#2A1E19', 0.4); c.lineWidth = 5.5;
      c.beginPath(); c.moveTo(-24, -22); c.quadraticCurveTo(dx < 0 ? -2 : 2, -34, 24, -24); c.stroke();
      c.restore();
    });
    // lips
    const natural = mix(look.skin, '#B4615E', 0.45);
    const lip = mix(natural, look.lip, Math.min(1, k * 1.15));
    c.save(); c.translate(cx, 338);
    c.fillStyle = shade(lip, -0.08); c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(-12, -12, 0, -6); c.quadraticCurveTo(12, -12, 26, 0); c.quadraticCurveTo(0, 5, -26, 0); c.fill();
    c.fillStyle = lip; c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(0, 22, 26, 0); c.quadraticCurveTo(0, 5, -26, 0); c.fill();
    c.strokeStyle = shade(lip, -0.4); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-24, 0.5); c.quadraticCurveTo(0, 4, 24, 0.5); c.stroke();
    c.restore();
    faceTex.needsUpdate = true;
  }

  function buildBody(look, skinMat) {
    const t = look.clothType, cloth = M({ color: look.clothColor, roughness: 0.82 });
    const neutralBottom = M({ color: '#D9D1C5', roughness: 0.9 });
    add(new THREE.CylinderGeometry(0.4, 0.46, 1.3, 32), skinMat).position.set(0, -1.05, -0.05);

    const jacket = ['outer', 'setelan', 'kardigan'].includes(t);
    const innerMat = t === 'setelan' ? M({ color: shade(look.clothColor, 0.3), roughness: 0.85 }) : jacket ? M({ color: '#F2EEE6', roughness: 0.9 }) : cloth;
    const chestPts = [[0.42, -1.45], [0.95, -1.62], [1.85, -1.85], [2.2, -2.2], [2.12, -2.9], [1.9, -3.8], [1.62, -4.3]];
    if (t === 'tanktop') {
      lathe([[0.42, -1.45], [0.95, -1.62], [1.85, -1.85], [2.2, -2.2]], skinMat);
      lathe([[1.6, -2.0], [2.16, -2.3], [2.12, -2.9], [1.9, -3.8], [1.62, -4.3]], cloth);
      [-1, 1].forEach((s) => { const st = add(new THREE.BoxGeometry(0.22, 0.05, 0.9), cloth); st.position.set(s * 0.9, -1.72, 0); st.rotation.z = s * -0.22; });
    } else {
      lathe(chestPts, innerMat);
    }
    lathe([[1.62, -4.3], [1.56, -4.6], [1.6, -4.85]], t === 'croptop' ? skinMat : t === 'dress' ? cloth : innerMat);
    if (t === 'dress') lathe([[1.6, -4.85], [1.95, -5.6], [2.5, -7.0], [2.75, -8.1], [0.01, -8.1]], cloth, { sz: 0.75 });
    else {
      lathe([[1.6, -4.85], [1.85, -5.6], [1.9, -6.3], [0.01, -6.3]], neutralBottom);
      [-1, 1].forEach((s) => add(new THREE.CylinderGeometry(0.78, 0.6, 2.1, 24), neutralBottom).position.set(s * 0.82, -7.3, 0));
    }
    if (jacket) {
      const gap = t === 'kardigan' ? 0.55 : 0.75;
      lathe(chestPts.map(([r, y]) => [r * 1.06 + 0.02, y]).concat([[1.75, -4.9], [1.9, -5.7]]), cloth, { phiStart: gap / 2, phiLength: Math.PI * 2 - gap, sz: 0.64 });
    }
    if (t === 'sweater' || t === 'tshirt') {
      const rib = add(new THREE.TorusGeometry(0.55, 0.07, 10, 40), cloth);
      rib.rotation.x = Math.PI / 2; rib.position.set(0, -1.5, 0.02); rib.scale.set(1, 0.62, 1);
    }
    if (t === 'kemeja') [-2.4, -3.0, -3.6].forEach((y) => add(new THREE.SphereGeometry(0.05, 10, 8), M({ color: shade(look.clothColor, 0.5) })).position.set(0, y, 1.3));
    if (t === 'blouse' || t === 'dress') [-1, 1].forEach((s) => { const p = add(new THREE.SphereGeometry(0.5, 24, 16), cloth); p.position.set(s * 2.1, -2.3, 0); p.scale.set(1, 0.8, 0.85); });

    // arms
    [-1, 1].forEach((s) => {
      const arm = new THREE.Group(); arm.position.set(s * 2.12, -2.25, 0); arm.rotation.z = s * 0.1; dynamic.add(arm);
      const upper = add(new THREE.CapsuleGeometry(0.36, 1.9, 6, 16), LONG.includes(t) || SHORT.includes(t) ? cloth : skinMat, arm); upper.position.y = -1.1;
      if (SHORT.includes(t)) { upper.material = skinMat; const sl = add(new THREE.CylinderGeometry(0.46, 0.44, 1.1, 20), cloth, arm); sl.position.y = -0.45; }
      const fore = add(new THREE.CapsuleGeometry(0.3, 1.8, 6, 16), LONG.includes(t) ? cloth : skinMat, arm); fore.position.set(s * 0.12, -3.1, 0.1);
      add(new THREE.SphereGeometry(0.3, 16, 12), skinMat, arm).position.set(s * 0.18, -4.3, 0.12);
    });
  }

  function buildHair(look) {
    const mat = M({ color: look.hairColor, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide });
    const hair = new THREE.Group(); hair.scale.copy(HEAD_SCALE); dynamic.add(hair);
    add(new THREE.SphereGeometry(1.05, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), mat, hair);
    add(new THREE.SphereGeometry(1.06, 48, 24, Math.PI * 0.5 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.62), mat, hair);
    const back = add(new THREE.CylinderGeometry(1.02, 1.35, 3.6, 40, 1, true, Math.PI / 2 + 0.55, Math.PI - 1.1), mat, hair);
    back.position.y = -1.6; back.rotation.y = Math.PI;
  }

  function buildHijab(look, bodyG) {
    const style = look.hijabStyle;
    const mat = M({ color: look.hijabColor, roughness: 0.92, side: THREE.DoubleSide });
    const hj = new THREE.Group(); dynamic.add(hj);
    const shell = new THREE.Group(); shell.scale.copy(HEAD_SCALE); hj.add(shell);
    if (style === 'turban') {
      add(new THREE.SphereGeometry(1.12, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.44), mat, shell);
      add(new THREE.SphereGeometry(1.1, 48, 24, Math.PI * 0.5 + 0.9, Math.PI * 2 - 1.8, Math.PI * 0.4, Math.PI * 0.18), mat, shell);
      const knot = add(new THREE.TorusKnotGeometry(0.22, 0.09, 64, 10, 2, 3), mat, shell); knot.position.set(0, 0.72, 0.82);
      return;
    }
    const tight = style === 'sport' ? 1.05 : 1.1;
    add(new THREE.SphereGeometry(tight, 48, 32, Math.PI * 0.5 + 0.88, Math.PI * 2 - 1.76, 0, Math.PI * 0.8), mat, shell);
    add(new THREE.SphereGeometry(tight + 0.005, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.31), mat, shell);
    if (style === 'bergo') { const brim = add(new THREE.SphereGeometry(tight + 0.04, 32, 8, Math.PI * 0.5 - 0.7, 1.4, Math.PI * 0.28, Math.PI * 0.06), M({ color: shade(look.hijabColor, -0.2), roughness: 0.8, side: THREE.DoubleSide }), shell); brim.scale.set(1.02, 1, 1.12); }

    const profiles = {
      instant: [[0.66, -0.7], [0.82, -1.2], [1.6, -1.72], [2.4, -2.25], [2.5, -2.9], [2.36, -3.6]],
      bergo: [[0.66, -0.7], [0.82, -1.2], [1.6, -1.72], [2.36, -2.25], [2.4, -2.75]],
      khimar: [[0.66, -0.7], [0.84, -1.2], [1.7, -1.72], [2.55, -2.3], [2.7, -3.4], [2.78, -5.0], [2.8, -5.9]],
      'segi-empat': [[0.66, -0.7], [0.82, -1.2], [1.6, -1.72], [2.4, -2.25], [2.5, -2.9], [2.4, -3.4]],
      pashmina: [[0.66, -0.7], [0.82, -1.2], [1.6, -1.72], [2.38, -2.25], [2.45, -2.75]],
      shawl: [[0.66, -0.7], [0.84, -1.2], [1.65, -1.72], [2.45, -2.25], [2.5, -2.85]],
      sport: [[0.62, -0.72], [0.74, -1.3], [1.2, -1.78], [1.32, -2.05]],
    };
    const drapeG = new THREE.Group(); drapeG.scale.copy(bodyG.scale); drapeG.position.copy(bodyG.position); hj.add(drapeG);
    const drape = lathe(profiles[style] || profiles.instant, mat, { sz: 0.66, parent: drapeG });
    if (style === 'segi-empat') {
      const p = drape.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (y < -2.0) { const front = Math.max(0, z / Math.hypot(x, z || 1e-6)); p.setY(i, y + (y + 2.0) * front ** 3 * 0.8); }
      }
      drape.geometry.computeVertexNormals();
    }
    if (style === 'pashmina' || style === 'shawl') {
      const wrap = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.0, -1.9, 0.6), new THREE.Vector3(-0.6, -2.7, 1.75), new THREE.Vector3(0.9, -2.5, 1.7), new THREE.Vector3(2.1, -1.9, 0.5), new THREE.Vector3(2.0, -1.6, -0.8)]);
      add(new THREE.TubeGeometry(wrap, 48, 0.32, 12), mat, drapeG);
      const tails = style === 'shawl' ? [-1, 1] : [-1];
      tails.forEach((s) => {
        const tail = add(new THREE.BoxGeometry(1.0, 3.8, 0.08, 1, 12, 1), mat, drapeG);
        tail.position.set(s * 1.25, -4.1, 1.32); tail.rotation.set(-0.12, 0, s * -0.06);
      });
    }
  }

  function buildGlasses(look) {
    const L = LENS_COLORS.find((l) => l.id === look.lensColor) || LENS_COLORS[0];
    const F = METALS.find((m) => m.id === look.frame) || METALS[0];
    const lensMat = new THREE.MeshPhysicalMaterial({ color: L.hex, transparent: true, opacity: Math.min(0.85, L.alpha + 0.18), roughness: 0.08, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    mats.push(lensMat);
    const fm = F.id === 'clear' ? M({ color: F.hex, transparent: true, opacity: 0.5, roughness: 0.1 }) : metalMat(F.hex);
    const gl = new THREE.Group(); gl.position.set(0, 0.17, 1.02); dynamic.add(gl);
    [-1, 1].forEach((s) => {
      const shape = new THREE.Shape(lensPoints(look.lensShape).map(([x, y]) => new THREE.Vector2(s * x * 0.6, -y * 0.55)));
      const m = add(new THREE.ShapeGeometry(shape, 24), lensMat, gl); m.position.set(s * 0.34, 0, s === 1 ? 0 : 0); m.rotation.y = s * 0.12;
      const temple = add(new THREE.BoxGeometry(0.03, 0.03, 1.15), fm, gl); temple.position.set(s * 0.68, 0.02, -0.55); temple.rotation.y = s * 0.24;
    });
    const bridge = add(new THREE.TorusGeometry(0.07, 0.016, 8, 16, Math.PI), fm, gl); bridge.position.set(0, 0.02, 0.02);
  }

  function buildJewelry(look, bodyG) {
    const showEars = !look.hijabOn || look.hijabStyle === 'turban';
    const m = METALS.find((x) => x.id === look.earrings);
    if (showEars && m) [-1, 1].forEach((s) => {
      add(new THREE.SphereGeometry(0.045, 12, 10), metalMat(m.hex)).position.set(s * 0.86, -0.18, 0.05);
      add(new THREE.SphereGeometry(0.08, 16, 12), metalMat(m.hex)).position.set(s * 0.87, -0.42, 0.05);
    });
    const showNeck = !look.hijabOn || ['turban', 'sport'].includes(look.hijabStyle);
    if (look.necklace && showNeck && m) {
      const n = add(new THREE.TorusGeometry(0.62, 0.022, 8, 64), metalMat(m.hex), bodyG); n.rotation.x = Math.PI / 2 - 0.35; n.position.set(0, -1.72, 0.12); n.scale.set(1, 0.7, 1);
      add(new THREE.OctahedronGeometry(0.09), metalMat(m.hex), bodyG).position.set(0, -2.02, 0.62);
    }
  }

  function clearDynamic() {
    dynamic.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    mats.splice(0).forEach((m) => m.dispose());
    dynamic.clear();
  }

  function update(look, fx) {
    clearDynamic();
    paintFace(look, fx);
    const skinMat = M({ color: look.skin, roughness: 0.6 });
    // nose + ears live on the head; the body is drawn a bit smaller for a friendlier, stylized proportion
    add(new THREE.SphereGeometry(1, 24, 16), skinMat).position.set(0, -0.16, 0.9); dynamic.children.at(-1).scale.set(0.12, 0.24, 0.15);
    [-1, 1].forEach((s) => { const e = add(new THREE.SphereGeometry(1, 16, 12), skinMat); e.position.set(s * 0.84, 0.02, 0); e.scale.set(0.1, 0.22, 0.13); });
    const bodyG = new THREE.Group(); bodyG.scale.setScalar(0.84); bodyG.position.y = -0.12; dynamic.add(bodyG);
    target = bodyG;
    buildBody(look, skinMat);
    target = dynamic;
    if (look.hijabOn) buildHijab(look, bodyG); else buildHair(look);
    if (look.glassesOn) buildGlasses(look);
    buildJewelry(look, bodyG);
  }

  function setView(name) {
    const d = camera.position.distanceTo(controls.target);
    const a = { front: 0, side: Math.PI / 2, back: Math.PI, threeq: Math.PI / 4 }[name] ?? 0;
    controls.autoRotate = false;
    camera.position.set(TARGET.x + Math.sin(a) * d, TARGET.y + 0.8, TARGET.z + Math.cos(a) * d);
    if (name === 'face') { camera.position.set(0, 0.2, 9); }
    controls.update();
  }

  function dispose() {
    cancelAnimationFrame(raf); ro.disconnect(); clearDynamic(); controls.dispose(); renderer.dispose(); pmrem.dispose();
    renderer.domElement.remove();
  }

  return { update, setView, dispose, canvas: renderer.domElement };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
