import { CanvasTexture, Group, LinearMipmapLinearFilter, Mesh, PlaneGeometry, ShaderMaterial, Texture, TextureLoader, Vector2 } from 'three';
import { coverFit } from './coverFit';
import type { PlaneSpec } from './objects/types';
import type { ScenePic } from './types';

export const isPlaceholder = (src: string): boolean => src.includes('.placeholder.');

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uImg; uniform float uAmt, uPlaneAsp; uniform vec2 uScale, uOffset;
  void main(){
    // rounded corners, so the picture sits inside the screen face
    vec2 d = abs(vUv - 0.5) * vec2(uPlaneAsp, 1.0); float r = 0.025; vec2 h = vec2(uPlaneAsp, 1.0) * 0.5 - r;
    if (length(max(d - h, 0.0)) - r > 0.0) discard;
    gl_FragColor = vec4(texture2D(uImg, vUv * uScale + uOffset).rgb, uAmt);
  }`;

/** The screen-face material: a texture in rounded corners, faded by uAmt. */
export function screenMaterial(aspect: number): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uImg: { value: null },
      uAmt: { value: 0 },
      uPlaneAsp: { value: aspect },
      uScale: { value: new Vector2(1, 1) },
      uOffset: { value: new Vector2(0, 0) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
}

export interface PictureSet {
  group: Group;
  setAmount(a: number): void;
  dispose(): void;
}

export function createPictures(planes: PlaneSpec[], pics: ScenePic[], label: string, anisotropy: number): PictureSet {
  const group = new Group();
  const materials: ShaderMaterial[] = [];
  const textures: Texture[] = [];
  let disposed = false;

  for (const plane of planes) {
    const pic = pics[plane.pic];
    if (!pic) continue;
    const aspect = plane.size[0] / plane.size[1];
    const material = screenMaterial(aspect);
    const mesh = new Mesh(new PlaneGeometry(1, 1), material);
    mesh.renderOrder = 1; // always after the object: in lite mode both are transparent and depth-sorting can put the screen first
    mesh.position.set(...plane.pos);
    mesh.rotation.set(...plane.rot);
    mesh.scale.set(plane.size[0], plane.size[1], 1);
    mesh.visible = false; // until its texture is ready
    group.add(mesh);
    materials.push(material);

    const show = (texture: Texture, imageAspect: number, focus?: [number, number]) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      textures.push(texture);
      const fit = coverFit(aspect, imageAspect, focus);
      material.uniforms.uImg.value = texture;
      (material.uniforms.uScale.value as Vector2).set(...fit.scale);
      (material.uniforms.uOffset.value as Vector2).set(...fit.offset);
      mesh.visible = true;
    };

    if (isPlaceholder(pic.src)) {
      show(tileTexture(aspect, ['Screenshot coming', label]), aspect);
    } else {
      new TextureLoader().load(
        pic.src,
        (texture) => {
          texture.anisotropy = anisotropy;
          texture.minFilter = LinearMipmapLinearFilter;
          const img = texture.image as HTMLImageElement;
          show(texture, img.width / img.height, pic.focus);
        },
        undefined,
        () => show(tileTexture(aspect, [label]), aspect),
      );
    }
  }

  group.visible = false;
  return {
    group,
    setAmount(a) {
      group.visible = a > 0.001;
      for (const m of materials) m.uniforms.uAmt.value = a;
    },
    dispose() {
      disposed = true;
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

/** Graphite panel with centred text: used for placeholders and for screenshots that fail to load. */
function tileTexture(aspect: number, lines: string[]): CanvasTexture {
  const h = 512;
  const w = Math.round(h * aspect);
  const shorter = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2C2C2E';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const first = i === 0;
      ctx.fillStyle = first ? '#F5F5F7' : '#A1A1A6';
      ctx.font = `${first ? 800 : 600} ${Math.round(shorter * (first ? 0.075 : 0.05))}px "Inter Tight", system-ui, sans-serif`;
      ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * h * 0.1, w * 0.86);
    });
  }
  return new CanvasTexture(canvas);
}
