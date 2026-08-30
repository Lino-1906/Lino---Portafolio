import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const stage = document.getElementById('acrylic-stage');
const status = document.getElementById('acrylic-status');
const controlsUI = document.querySelector('.acrylic-controls');
const spinButton = document.getElementById('acrylic-spin');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

async function start() {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,80);
  const orbit=new OrbitControls(camera,renderer.domElement);
  orbit.enablePan=false;orbit.enableZoom=false;orbit.enableDamping=true;
  orbit.minPolarAngle=.35;orbit.maxPolarAngle=Math.PI*.54;
  orbit.autoRotateSpeed=.6;
  scene.add(new THREE.HemisphereLight(0xffffff,0x73737e,2.4));
  const light=new THREE.DirectionalLight(0xffffff,2.4);
  light.position.set(-4,7,6);light.castShadow=true;
  light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.025;
  Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-6});scene.add(light);
  const rim=new THREE.DirectionalLight(0xd5dfff,1.6);rim.position.set(4,3,-4);scene.add(rim);
  const load=async file=>{const img=new Image();img.src=new URL(`../crafters-case/${file}`,import.meta.url).href;await img.decode();return img;};
  const faceNames=['right','left','top','bottom','front','back'];
  const [label,...faces]=await Promise.all([load('label-system.png'),...faceNames.map(name=>load(`box-faces/${name}.png`))]);
  function texture(image,rect,rotation=0,reference=[784,1160]) {
    const [x,y,w,h]=rect;
    const canvas=document.createElement('canvas');
    const swap=Math.abs(rotation)%Math.PI>.01;
    canvas.width=Math.round((swap?h:w)*2);canvas.height=Math.round((swap?w:h)*2);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation);
    ctx.drawImage(image,x*image.width/reference[0],y*image.height/reference[1],w*image.width/reference[0],h*image.height/reference[1],-w,-h,w*2,h*2);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=renderer.capabilities.getMaxAnisotropy();return map;
  }
  // Independent 288-dpi exports from the original vector PDF. Preserve native pixels.
  const printed=image=>{
    const map=new THREE.Texture(image);map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=renderer.capabilities.getMaxAnisotropy();map.needsUpdate=true;
    return new THREE.MeshStandardMaterial({map,roughness:.85});
  };
  const box=new THREE.Group();scene.add(box);
  const pack=new THREE.Mesh(new THREE.BoxGeometry(2.5,3.5,1.24),faces.map(printed));
  pack.castShadow=true;pack.receiveShadow=true;box.add(pack);
  // A fine edge follows the physical cardboard folds without changing artwork.
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(pack.geometry),new THREE.LineBasicMaterial({color:0x555555,transparent:true,opacity:.45}));pack.add(edges);
  const bottle=new THREE.Group();scene.add(bottle);
  const plastic=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45});
  const points=[new THREE.Vector2(0,-1.75),new THREE.Vector2(.49,-1.75),new THREE.Vector2(.55,-1.68),new THREE.Vector2(.55,1.03),new THREE.Vector2(.52,1.14),new THREE.Vector2(.36,1.26),new THREE.Vector2(.30,1.32),new THREE.Vector2(.30,1.65),new THREE.Vector2(0,1.65)];
  const body=new THREE.Mesh(new THREE.LatheGeometry(points,96),plastic);body.castShadow=true;body.receiveShadow=true;bottle.add(body);
  const sleeveMap=texture(label,[0,0,label.width,label.height],0,[label.width,label.height]);
  const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.554,.554,2.70,128,1,true),new THREE.MeshStandardMaterial({map:sleeveMap,roughness:.85}));
  sleeve.position.y=-.29;sleeve.rotation.y=Math.PI;bottle.add(sleeve);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.47,64),plastic);cap.position.y=1.48;cap.castShadow=true;bottle.add(cap);
  const ridgeGeometry=new THREE.CylinderGeometry(.008,.008,.38,4);
  for(let i=0;i<48;i++){const a=i*Math.PI*2/48;const ridge=new THREE.Mesh(ridgeGeometry,plastic);ridge.position.set(Math.sin(a)*.34,1.48,Math.cos(a)*.34);bottle.add(ridge);}
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.07,64),plastic);lid.position.y=1.755;bottle.add(lid);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.78;floor.receiveShadow=true;scene.add(floor);
  let mode='both',visible=true,previous=0;
  function spin(value){orbit.autoRotate=value;spinButton.textContent=value?'Pausar giro':'Activar giro';spinButton.setAttribute('aria-pressed',String(value));}
  function frame(){
    const aspect=stage.clientWidth/stage.clientHeight;
    const distance=mode==='both'?Math.max(10.2,8.8/aspect):Math.max(8.3,5.7/aspect);
    camera.position.set(distance*.28,distance*.18,distance*.94);orbit.target.set(0,.05,0);orbit.update();
  }
  function select(value){
    mode=value;box.visible=value!=='bottle';bottle.visible=value!=='box';
    box.position.x=value==='both'?-1.0:0;bottle.position.x=value==='both'?1.5:0;
    bottle.position.z=value==='both'?.4:0;
    box.rotation.y=-.1;bottle.rotation.y=0;
    document.querySelectorAll('[data-product]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.product===value)));
    status.textContent=`${value==='both'?'Caja + botella':value==='box'?'Caja':'Botella'} · Arrastra para girar · Flechas del teclado`;
    frame();
  }
  document.querySelectorAll('[data-product]').forEach(button=>button.onclick=()=>select(button.dataset.product));
  spinButton.onclick=()=>spin(!orbit.autoRotate);
  document.getElementById('acrylic-reset').onclick=()=>{select('both');spin(!reduceMotion.matches);};
  orbit.addEventListener('start',()=>spin(false));
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','Envases 3D de Crafter’s Acrylic. Arrastra o usa las flechas para girar.');
  renderer.domElement.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();spin(false);
    const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target));
    spherical.theta+=event.key==='ArrowLeft'?-.15:event.key==='ArrowRight'?.15:0;
    spherical.phi=THREE.MathUtils.clamp(spherical.phi+(event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0),orbit.minPolarAngle,orbit.maxPolarAngle);
    camera.position.copy(orbit.target).add(new THREE.Vector3().setFromSpherical(spherical));orbit.update();
  });
  stage.append(renderer.domElement);
  const resize=()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();frame();renderer.render(scene,camera);};
  new ResizeObserver(resize).observe(stage);resize();select('both');spin(!reduceMotion.matches);
  renderer.render(scene,camera);
  // Paint the initial photo/canvas state before starting the crossfade.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  stage.classList.add('is-ready');controlsUI.hidden=false;
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(stage);
  reduceMotion.addEventListener('change',()=>spin(!reduceMotion.matches));
  renderer.setAnimationLoop(time=>{const dt=Math.min((time-previous)/1000,.05);previous=time;if(!visible||document.hidden)return;orbit.update(dt);renderer.render(scene,camera);});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);stage.classList.remove('is-ready');renderer.domElement.hidden=true;controlsUI.hidden=true;status.textContent='Vista fotográfica de respaldo';});
}
export default start().catch(error=>{status.textContent='Vista fotográfica de respaldo';console.warn('Visor Crafter’s Acrylic no disponible:',error);});
