import { describe, expect, it } from 'vitest';
import { pickSceneMode } from './capability';

const capable = { override: null, hasWebGL2: true, renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)', width: 1440 };

describe('pickSceneMode', () => {
  it('runs the full scene on a wide, capable GPU', () => {
    expect(pickSceneMode(capable)).toBe('full');
  });

  it('falls back to static images without WebGL2', () => {
    expect(pickSceneMode({ ...capable, hasWebGL2: false })).toBe('static');
  });

  it('uses the lite scene under 800px', () => {
    expect(pickSceneMode({ ...capable, width: 799 })).toBe('lite');
    expect(pickSceneMode({ ...capable, width: 800 })).toBe('full');
  });

  it('uses the lite scene on software renderers', () => {
    expect(pickSceneMode({ ...capable, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))' })).toBe('lite');
  });

  it('honours ?scene= overrides', () => {
    expect(pickSceneMode({ ...capable, override: 'static' })).toBe('static');
    expect(pickSceneMode({ ...capable, width: 390, override: 'full' })).toBe('full');
    expect(pickSceneMode({ ...capable, override: 'nonsense' })).toBe('full');
  });
});
