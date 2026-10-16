import { describe, expect, it } from 'vitest';
import { createObjectMaterial } from './material';

describe('createObjectMaterial', () => {
  it('is clear liquid glass when molten and glossy black when set', () => {
    const look = createObjectMaterial(false, false);
    look.setSolid(0, 1);
    expect(look.material.transmission).toBe(1);
    expect(look.material.color.getHexString()).toBe('ffffff');
    look.setSolid(1, 1);
    expect(look.material.transmission).toBeLessThan(0.001);
    expect(look.material.color.getHexString()).toBe('141416');
    expect(look.material.metalness).toBeCloseTo(0.35);
    expect(look.material.roughness).toBeCloseTo(0.16);
    expect(look.material.envMapIntensity).toBeCloseTo(1.3);
  });

  it('lite mode never uses transmission and fades through opacity', () => {
    const look = createObjectMaterial(true, false);
    look.setSolid(0, 0.5);
    expect(look.material.transmission).toBe(0);
    expect(look.material.transparent).toBe(true);
    expect(look.material.opacity).toBeCloseTo(0.15);
  });

  it('patches the liquid ripple into the vertex shader, and the rim into lite fragments', () => {
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: '#include <common>\n#include <morphtarget_vertex>',
      fragmentShader: '#include <common>\n#include <dithering_fragment>',
    };
    const look = createObjectMaterial(true, false);
    look.material.onBeforeCompile(shader as never, null as never);
    expect(shader.uniforms.uLiquid).toBe(look.uniforms.uLiquid);
    expect(shader.vertexShader).toContain('transformed += nrm * w * 0.28 * uLiquid');
    expect(shader.fragmentShader).toContain('rim');
  });
});
