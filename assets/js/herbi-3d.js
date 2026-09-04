import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const stage = document.getElementById('viewer-stage');
const status = document.getElementById('viewer-status');
const spin = document.getElementById('box-spin');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.minPolarAngle = .4;
  controls.maxPolarAngle = Math.PI / 2 + .15;
  controls.autoRotate = !reduced.matches;
  controls.autoRotateSpeed = .65;
  // Reserve vertical single-finger gestures for page scrolling.
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  scene.add(new THREE.HemisphereLight(0xfff6dd, 0x777455, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-3, 7, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.normalBias = .03;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffdc8b, 1.5);
  fill.position.set(4, 2, -3); scene.add(fill);

  const source = new Image();
  source.src = new URL('../herbi-case/box-dieline-source.png', import.meta.url).href;
  await source.decode();
  const restored = new Image();
  restored.src = new URL('../herbi-case/box-dieline-restored.png', import.meta.url).href;
  await restored.decode();
  const loadFace = async name => {
    const image = new Image();
    const filename = name === 'top' ? 'box-top-exact.png' : `box-${name}-hq.png`;
    image.src = new URL(`../herbi-case/${filename}`, import.meta.url).href;
    await image.decode();
    return image;
  };
  const [backArt, topArt, blackArt] = await Promise.all(['back', 'top', 'black'].map(loadFace));
  function faceMaterial(art, prepare, unlit = false) {
    const canvas = document.createElement('canvas');
    canvas.width = art.naturalWidth; canvas.height = art.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(art, 0, 0);
    if (prepare) prepare(context, canvas);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return unlit
      ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
      : new THREE.MeshStandardMaterial({ map: texture, roughness: .9 });
  }
  // Exact printed panels extracted from page 7 of the original presentation.
  // Rotate the net to the portrait orientation used in the supplied mockup.
  function print(x, y, w, h, turn = -1, artwork = source) {
    const canvas = document.createElement('canvas');
    canvas.width = turn ? h * 3 : w * 3; canvas.height = turn ? w * 3 : h * 3;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(turn * Math.PI / 2);
    ctx.drawImage(artwork, x, y, w, h, -w * 1.5, -h * 1.5, w * 3, h * 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return new THREE.MeshStandardMaterial({ map: texture, roughness: .8 });
  }
  const front = print(43, 306, 469, 313, -1, restored);
  const back = faceMaterial(backArt);
  // Sample inside the flap's rounded die-cut outline: its white paper
  // margins are not part of the rectangular face of the assembled box.
  const left = print(43, 55, 469, 250, -1, restored);
  // Exclude the unprinted tuck-in flap below the three information frames.
  // Once rotated, that flap used to appear as a wide empty black side strip.
  const right = faceMaterial(blackArt, (ctx, canvas) => {
    // Typeset small copy directly: do not retain misspelled AI-generated text.
    ctx.scale(canvas.width / 984, canvas.height / 1599);
    ctx.translate(984, 0); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1599, 984);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    [[20,518],[570,553],[1153,426]].forEach(([x,w]) => ctx.strokeRect(x,20,w,944));
    const icon = (sx,sy,sw,sh,x,y,w,h) => {
      ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(-Math.PI/2);
      ctx.drawImage(blackArt,sx,sy,sw,sh,-h/2,-w/2,h,w);ctx.restore();
    };
    ctx.fillStyle = '#fff';ctx.font = 'bold 36px Georgia';ctx.textAlign='center';
    ctx.fillText('Tarma - Perú',279,86);ctx.fillText('Preparación',846,86);
    icon(507,86,264,389,80,145,398,322);
    icon(124,104,261,352,90,595,375,278);
    icon(653,818,202,220,852,170,225,226);
    icon(416,840,211,240,852,433,225,226);
    icon(58,760,231,299,852,696,225,226);
    ctx.textAlign='left';
    const lines = [
      ['1', 'Colocar un filtrante', 'en una taza y agregar', 'agua hirviendo.'],
      ['2', 'Dejar reposar de', '2 a 3 minutos.'],
      ['3', 'También se puede', 'consumir frío o', 'como helado.']
    ];
    lines.forEach((group, i) => {
      const y = 175 + i * 263;
      ctx.font = 'bold 38px Arial'; ctx.fillText(group[0], 603, y);
      ctx.font = '20px Arial';
      group.slice(1).forEach((line, n) => ctx.fillText(line, 603, y + 42 + n * 25));
    });
    // Preserve original manufacturer copy rather than generated identifiers.
    ctx.fillStyle = '#000'; ctx.fillRect(1175, 55, 385, 340);
    ctx.drawImage(source, 639, 361, 81, 54, 1185, 65, 366, 244);
    icon(426,1260,159,180,1270,410,193,175);
    icon(183,1260,183,186,1270,645,193,190);
    ctx.fillStyle='#fff';ctx.font='bold 24px Arial';ctx.textAlign='center';
    ctx.fillText('CUIDA EL MEDIO',1366,889);ctx.fillText('AMBIENTE',1366,920);
  });
  // User-selected artwork, applied whole and unlit with no compositing.
  const top = faceMaterial(topArt, null, true);
  const bottom = print(725, 191, 153, 164, 0);
  const card = new THREE.MeshStandardMaterial({ color: 0xd6bf84, roughness: 1 });
  const box = new THREE.Group(); scene.add(box);
  const w = 2.3, h = 3.72, d = 2.17, t = .022;
  function panel(size, position, mats, parent = box) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mats);
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  panel([w,h,t],[0,0,d/2],[card,card,card,card,front,card]);
  panel([w,h,t],[0,0,-d/2],[card,card,card,card,card,back]);
  panel([t,h,d],[-w/2,0,0],[card,left,card,card,card,card]);
  panel([t,h,d],[w/2,0,0],[right,card,card,card,card,card]);
  panel([w,t,d],[0,-h/2,0],[card,card,card,bottom,card,card]);
  const hinge = new THREE.Group(); hinge.position.set(0,h/2,-d/2); box.add(hinge);
  panel([w,t,d],[0,0,d/2],[card,card,top,card,card,card],hinge);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.17}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -h/2-.05; ground.receiveShadow = true; scene.add(ground);
  let visible = true;
  let loopRunning = false;
  let previous = 0;
  function reset() {
    const aspect = stage.clientWidth / stage.clientHeight;
    const distance = Math.max(10.5, 8.1 / aspect);
    camera.position.set(-distance*.46,distance*.27,distance*.86);
    controls.target.set(0,.15,0); controls.update();
  }
  function resize() {
    renderer.setSize(stage.clientWidth,stage.clientHeight);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix(); reset(); renderer.render(scene,camera);
  }
  function setSpin(value) { controls.autoRotate = value; spin.textContent = value ? 'Pausar giro' : 'Activar giro'; spin.setAttribute('aria-pressed', String(value)); }
  spin.onclick = () => setSpin(!controls.autoRotate);
  document.getElementById('box-reset').onclick = () => { reset();setSpin(!reduced.matches); };
  controls.addEventListener('start', () => setSpin(false));
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label','Caja 3D: arrastra para girar; usa las flechas del teclado para rotar');
  renderer.domElement.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault(); setSpin(false);
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += e.key==='ArrowLeft' ? -.15 : e.key==='ArrowRight' ? .15 : 0;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0),.4,Math.PI/2+.15);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update();
  });
  stage.append(renderer.domElement);
  status.textContent = 'Arrastra para explorar · vista 3D'; setSpin(!reduced.matches);
  new ResizeObserver(resize).observe(stage); resize();
  renderer.render(scene,camera);
  // Start the crossfade only after the first complete 3D frame is painted.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  stage.classList.add('viewer-ready');
  document.querySelector('.viewer-controls').hidden = false;
  reduced.addEventListener('change',()=>setSpin(!reduced.matches));
  const animate = time => {
    const dt = Math.min((time-previous)/1000,.05); previous=time;
    controls.update(dt); renderer.render(scene,camera);
  };
  const syncAnimationLoop = () => {
    const shouldRun = visible && !document.hidden;
    if (shouldRun === loopRunning) return;
    loopRunning = shouldRun;
    previous = 0;
    renderer.setAnimationLoop(shouldRun ? animate : null);
  };
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncAnimationLoop();
  }).observe(stage);
  document.addEventListener('visibilitychange', syncAnimationLoop);
  syncAnimationLoop();
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault(); visible=false; syncAnimationLoop(); stage.classList.remove('viewer-ready'); renderer.domElement.hidden=true;
    document.querySelector('.viewer-controls').hidden=true;status.textContent='Vista fotográfica de respaldo';
  });
}
export default init().catch(error => { status.textContent='Vista fotográfica de respaldo'; console.warn('Herbi 3D no disponible:', error); });
