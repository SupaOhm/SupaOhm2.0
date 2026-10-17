import { ACESFilmicToneMapping, Color, DirectionalLight, Group, Mesh, PMREMGenerator, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { backgroundCenter, createBackground } from './background';
import { buildMorphGeometry } from './geometry';
import { CAMERA_Z, FOV, fitToSlot, placement, viewSize } from './layout';
import { createObjectMaterial } from './material';
import { clamp01, ease, lerp, smoothstep } from './math';
import { blob, resolveObject } from './objects';
import { BASE, PALETTE, STATE_COUNT } from './palette';
import { createLockPlane } from './lockPlane';
import { createPictures } from './pictures';
import { POSITION_SPRING, SWELL_SPRING, createSpring } from './springs';
import { stepState } from './step';
import { nextPixelRatio } from './watchdog';
import type { SceneHandle, SceneItem, SceneOptions, Theme } from './types';

const WHITE = new Color('#ffffff');

export function createScene(canvas: HTMLCanvasElement, items: SceneItem[], opts: SceneOptions): SceneHandle {
  if (items.length !== STATE_COUNT) throw new Error(`createScene expects ${STATE_COUNT} items, got ${items.length}`);

  const renderer = new WebGLRenderer({ canvas, antialias: true }); // throws when WebGL is unavailable
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = env.texture;

  const background = createBackground();
  scene.add(background.mesh);

  // every state is a morph target of one mesh; the liquid blob is the last target
  const objects = items.map((item) => resolveObject(item.kind, item.pics.length));
  const geometry = buildMorphGeometry([...objects.map((o) => o.shape), blob], opts.lite ? 40 : 80);
  const BLOB = objects.length;
  const look = createObjectMaterial(opts.lite, opts.reducedMotion);
  const mesh = new Mesh(geometry, look.material);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const pictures = objects.map((o, i) => createPictures(o.planes, items[i].pics, items[i].label, anisotropy));

  // a slot state (the contact phone) rolls in and settles face-on behind the page's [data-phone-slot]
  const slotIndex = items.findIndex((item) => item.slot);
  const slotScreen = slotIndex >= 0 ? objects[slotIndex].planes[0] : undefined;
  let slotOn = false;

  const group = new Group();
  group.add(mesh, ...pictures.map((p) => p.group));
  scene.add(group);
  const lock = slotScreen ? createLockPlane(slotScreen) : null;
  if (lock) group.add(lock.mesh);
  const key = new DirectionalLight('#fff4e6', 2);
  key.position.set(3, 4, 5);
  scene.add(key);

  const still = opts.reducedMotion || opts.snap;
  const posX = createSpring(0, POSITION_SPRING.stiffness, POSITION_SPRING.damping);
  const posY = createSpring(0, POSITION_SPRING.stiffness, POSITION_SPRING.damping);
  const swell = createSpring(1, SWELL_SPRING.stiffness, SWELL_SPRING.damping);
  const glow = new Color();
  const wash = new Color();
  const bar = new Color();

  let theme: Theme = 'light';
  let target = 0;
  let smooth = 0;
  let primed = false;
  let ready = false;
  let mx = 0;
  let my = 0;
  let active = true;
  let running = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let frames = 0;
  let frameSum = 0;
  let dip = 0;
  let dipNow = 0;
  let arrive = 0;
  let arriveNow = 0;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(t: number, dt: number) {
    // frame-rate independent damping of the scroll position
    if (!primed || still) smooth = target;
    else smooth += (target - smooth) * (1 - Math.exp(-dt * 3));

    const s = stepState(smooth, STATE_COUNT, opts.reducedMotion);
    const { k, wA, wBlob, wB, fade, dir } = s;

    // shape: object k melts into the blob, the blob sets into object k+1
    const influences = mesh.morphTargetInfluences!;
    influences.fill(0);
    influences[k] = wA;
    influences[k + 1] = wB;
    influences[BLOB] = wBlob;
    look.uniforms.uLiquid.value = wBlob;
    look.uniforms.uT.value = t;
    look.setSolid(smoothstep(wA + wB, 0.6, 1), fade);

    // pictures appear only once the object has set
    pictures.forEach((pic, i) => {
      const w = i === k ? wA : i === k + 1 ? wB : 0;
      pic.setAmount(smoothstep(w, 0.82, 1) * fade);
    });

    // position: opposite the text, following on a springy, liquid path
    const mode = opts.centered ? 'centered' : window.innerWidth >= 800 ? 'wide' : 'narrow';
    const place = placement(camera.aspect, mode);
    const tx = dir * place.side;
    const ty = place.y;
    const swellTarget = 1 + 0.2 * wBlob;
    if (!primed || still) {
      posX.set(tx);
      posY.set(ty);
      swell.set(swellTarget);
    } else {
      posX.step(tx, dt);
      posY.step(ty, dt);
      swell.step(swellTarget, dt);
    }
    primed = true;

    const slotW = slotIndex === k ? wA : slotIndex === k + 1 ? wB : 0;
    const rect = slotScreen && slotW > 0 && !opts.centered ? (opts.getSlot?.() ?? null) : null;
    const fit =
      rect && slotScreen
        ? fitToSlot(
            rect,
            canvas.clientWidth || window.innerWidth,
            canvas.clientHeight || window.innerHeight,
            slotScreen.size[1],
            slotScreen.pos[2],
          )
        : null;
    const settle = fit ? smoothstep(slotW, 0.5, 1) : 0;
    const free = 1 - settle;
    // the arrival: from just past the right edge, edge-on and tilted (roll 1), to face-on in the slot (roll 0)
    arriveNow = still ? arrive : arriveNow + (arrive - arriveNow) * (1 - Math.exp(-dt * 10));
    const roll = opts.reducedMotion ? 0 : 1 - ease(arriveNow);
    const on = settle > 0.98 && arriveNow >= 0.97;
    if (on !== slotOn) {
      slotOn = on;
      opts.onSlotChange?.(on);
    }
    // the lock screen wakes halfway through the arrival, runs Face ID from 80%, and gives way to the chat
    lock?.update(
      opts.centered ? 0 : settle * smoothstep(arriveNow, 0.5, 0.6) * (1 - smoothstep(arriveNow, 0.97, 1)),
      clamp01((arriveNow - 0.8) / 0.17),
    );
    // capture stills leave a slot state empty: the page draws its own phone there
    mesh.visible = !(opts.centered && slotW > 0.5);
    const offX = viewSize(camera.aspect).w / 2 + (fit?.scale ?? 0) * 1.2;
    const slotX = fit ? lerp(fit.x, offX, roll) : 0;
    // it rolls in at the normal placement's height and descends into the slot as it lands
    const slotY = fit ? lerp(fit.y, place.y, roll) : 0;
    group.position.set(lerp(posX.x, slotX, settle), lerp(posY.x, slotY, settle), 0);

    // resting angle (turned toward the text), a full spin and wobble through the liquid; in a slot, only the arrival roll
    const restA = objects[k].rest;
    const restB = objects[k + 1].rest;
    const sway = still ? 0 : Math.sin(t * 0.4) * 0.06;
    const tiltX = opts.reducedMotion ? 0 : my * 0.15;
    const tiltY = opts.reducedMotion ? 0 : mx * 0.35;
    const spin = opts.reducedMotion ? 0 : ease(s.g) * Math.PI * 2 * dir;
    group.rotation.set(
      (restA[0] * wA + restB[0] * wB + 0.15 * wBlob + tiltX + sway * 0.5 + wBlob * 0.5) * free,
      ((restA[1] * wA + restB[1] * wB) * dir + tiltY + sway + spin) * free - 1.47 * roll * settle,
      wBlob * Math.sin(t * 1.6) * 0.18 * free + 0.14 * roll * settle,
    );

    // swell with overshoot, squash and stretch from sideways speed (units per frame at 60 fps)
    const stretch = (still ? 0 : Math.min(0.35, (Math.abs(posX.v) / 60) * 2.6)) * free;
    // part headings passing the middle of the screen melt the object down to a droplet
    dipNow = still ? dip : dipNow + (dip - dipNow) * (1 - Math.exp(-dt * 10));
    const size = lerp(swell.x * place.fit, fit?.scale ?? 0, settle) * (1 - 0.82 * dipNow);
    group.scale.set(size * (1 + stretch), size * (1 - stretch * 0.6), size);
    camera.position.z = CAMERA_Z - wBlob * 1.1;

    // per-section glow, blended through the melt
    const pal = PALETTE[theme];
    const dark = theme === 'dark';
    const ef = ease(s.g);
    glow.copy(pal[k].glow).lerp(pal[k + 1].glow, ef);
    wash.copy(pal[k].wash).lerp(pal[k + 1].wash, ef);
    bar.copy(glow).lerp(WHITE, dark ? 0.6 : 0);
    background.update({
      base: BASE[theme],
      a: glow,
      b: wash,
      bar,
      t: opts.reducedMotion ? 0 : t,
      center: backgroundCenter(group.position.x, group.position.y, camera.position.z),
      bars: opts.lite ? 0 : 1,
    });
    renderer.toneMappingExposure = dark ? 1.05 : 1;

    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      opts.onReady?.();
    }
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    time += dt;
    if (dt > 0) {
      frameSum += dt;
      if (++frames === 60) {
        const next = nextPixelRatio(pixelRatio, frameSum / 60);
        if (next !== pixelRatio) {
          pixelRatio = next;
          renderer.setPixelRatio(next);
          resize();
        }
        frames = 0;
        frameSum = 0;
      }
    }
    render(time, dt);
  }

  function start() {
    if (running || !active || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const onPointer = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  };
  const onVisibility = () => (document.hidden ? stop() : start());

  resize();
  window.addEventListener('resize', resize);
  if (!opts.reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  start();

  return {
    setProgress(p) {
      target = p;
    },
    setTheme(t) {
      theme = t;
    },
    setDip(d) {
      dip = d;
    },
    setArrive(a) {
      arrive = a;
    },
    setActive(a) {
      // no frames run while hidden: come back already at the scroll position, so the contact phone arrives formed
      if (a && !active) primed = false;
      active = a;
      if (a) start();
      else stop();
    },
    dispose() {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const p of pictures) p.dispose();
      lock?.dispose();
      geometry.dispose();
      look.material.dispose();
      background.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
