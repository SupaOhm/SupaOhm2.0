import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';

export const BG_Z = -6;
export const BG_SIZE: [number, number] = [40, 22];

export interface BackgroundFrame {
  base: Color;
  a: Color;
  b: Color;
  bar: Color;
  t: number;
  center: [number, number];
  /** 1 draws the thin light-bars, 0 hides them (lite). */
  bars: number;
}

export interface Background {
  mesh: Mesh;
  update(f: BackgroundFrame): void;
  dispose(): void;
}

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Output is written without colour conversion, exactly as in the approved prototype.
const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uBase, uA, uB, uBar; uniform float uT, uBars; uniform vec2 uC;
  float blob(vec2 p, vec2 c, float r){ return exp(-dot(p - c, p - c) / (r * r)); }
  void main(){
    vec2 p = vUv * vec2(1.8, 1.0);
    vec2 c1 = uC + vec2(0.03 * sin(uT * 0.3), 0.04 + 0.02 * cos(uT * 0.25));
    vec2 c2 = uC + vec2(-0.05 * cos(uT * 0.2), -0.08 + 0.02 * sin(uT * 0.35));
    vec3 col = mix(uBase, uB, blob(p, c2, 0.36) * 0.85);
    col = mix(col, uA, blob(p, c1, 0.13) * 0.4);
    float bars = smoothstep(0.94, 1.0, abs(sin((p.x - uC.x) * 70.0)));
    col = mix(col, uBar, bars * blob(p, uC, 0.15) * 0.85 * uBars);
    gl_FragColor = vec4(col, 1.0);
  }`;

/** An opaque plane behind the object: a soft glow and thin light-bars, so the glass has something to refract. */
export function createBackground(): Background {
  const material = new ShaderMaterial({
    uniforms: {
      uBase: { value: new Color() },
      uA: { value: new Color() },
      uB: { value: new Color() },
      uBar: { value: new Color() },
      uT: { value: 0 },
      uC: { value: new Vector2() },
      uBars: { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  const mesh = new Mesh(new PlaneGeometry(...BG_SIZE), material);
  mesh.position.z = BG_Z;

  return {
    mesh,
    update(f) {
      const u = material.uniforms;
      u.uBase.value.copy(f.base);
      u.uA.value.copy(f.a);
      u.uB.value.copy(f.b);
      u.uBar.value.copy(f.bar);
      u.uT.value = f.t;
      u.uC.value.set(f.center[0], f.center[1]);
      u.uBars.value = f.bars;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

/** Where an object at world (x, y) appears on the background, in the shader's p space. */
export function backgroundCenter(x: number, y: number, cameraZ: number): [number, number] {
  const k = (cameraZ - BG_Z) / cameraZ;
  return [(0.5 + (x * k) / BG_SIZE[0]) * 1.8, 0.5 + (y * k) / BG_SIZE[1]];
}
