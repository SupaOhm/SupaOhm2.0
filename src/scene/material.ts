import { Color, MeshPhysicalMaterial } from 'three';
import { lerp } from './math';

export interface LiquidUniforms {
  uLiquid: { value: number };
  uT: { value: number };
}

export interface ObjectMaterial {
  material: MeshPhysicalMaterial;
  uniforms: LiquidUniforms;
  /** solid: 0 = liquid glass, 1 = glossy black. fade: overall opacity (reduced-motion swaps). */
  setSolid(solid: number, fade: number): void;
}

const CLEAR = new Color('#ffffff');
const INK = new Color('#141416');

const VERTEX_LIQUID = /* glsl */ `#include <morphtarget_vertex>
  // molten: slow travelling ripples along the surface, plus a twist around the vertical axis
  vec3 nrm = normalize(transformed + 1e-5);
  float w = sin(2.6 * transformed.x + uT * 2.4) * sin(2.2 * transformed.y - uT * 1.9)
          + 0.6 * sin(3.4 * transformed.z + uT * 3.1) + 0.35 * sin(5.0 * (transformed.x + transformed.y) - uT * 4.0);
  transformed += nrm * w * 0.28 * uLiquid;
  float tw = uLiquid * sin(transformed.y * 1.6 + uT * 2.2) * 0.7;
  transformed.xz = mat2(cos(tw), -sin(tw), sin(tw), cos(tw)) * transformed.xz;`;

// lite has no transmission: the liquid reads as a bright, opaque rim instead
const FRAGMENT_RIM = /* glsl */ `#include <dithering_fragment>
  float rim = pow(1.0 - abs(dot(normalize(vViewPosition), normalize(vNormal))), 2.5);
  gl_FragColor.rgb += rim * uLiquid * 0.5;
  gl_FragColor.a = mix(gl_FragColor.a, 1.0, rim * uLiquid);`;

export function createObjectMaterial(lite: boolean, fadeable: boolean): ObjectMaterial {
  const uniforms: LiquidUniforms = { uLiquid: { value: 0 }, uT: { value: 0 } };
  const material = new MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0,
    ior: 1.38,
    specularIntensity: 0.8,
    envMapIntensity: 0.4,
    clearcoatRoughness: 0.05,
    ...(lite ? { transparent: true } : { transmission: 1, thickness: 0.6, dispersion: 7, transparent: fadeable }),
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLiquid, uT;')
      .replace('#include <morphtarget_vertex>', VERTEX_LIQUID);
    if (lite) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLiquid;')
        .replace('#include <dithering_fragment>', FRAGMENT_RIM);
    }
  };

  return {
    material,
    uniforms,
    setSolid(solid, fade) {
      material.color.copy(CLEAR).lerp(INK, solid);
      material.metalness = 0.35 * solid;
      material.roughness = 0.16 * solid;
      // never exactly 0: crossing 0 toggles a shader define and forces a recompile mid-scroll
      material.clearcoat = Math.max(0.0001, solid);
      material.envMapIntensity = lerp(0.4, 1.3, solid);
      if (lite) {
        material.opacity = lerp(0.3, 1, solid) * fade;
      } else {
        material.transmission = Math.max(0.0001, 1 - solid);
        material.opacity = fade;
      }
    },
  };
}
