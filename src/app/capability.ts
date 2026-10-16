export type SceneMode = 'full' | 'lite' | 'static';

const LOW_END = /swiftshader|llvmpipe|softpipe|software|mali-4|adreno \(tm\) [23]\d\d/i;

export function pickSceneMode(o: { override: string | null; hasWebGL2: boolean; renderer: string; width: number }): SceneMode {
  if (o.override === 'full' || o.override === 'lite' || o.override === 'static') return o.override;
  if (!o.hasWebGL2) return 'static';
  if (o.width < 800 || LOW_END.test(o.renderer)) return 'lite';
  return 'full';
}

/** Probes WebGL2 once with a throwaway canvas. three.js r170 needs WebGL2, so without it the page shows still images. */
export function detectSceneMode(): SceneMode {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement('canvas').getContext('webgl2');
  } catch {
    gl = null;
  }
  let renderer = '';
  if (gl) {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return pickSceneMode({
    override: new URLSearchParams(window.location.search).get('scene'),
    hasWebGL2: Boolean(gl),
    renderer,
    width: window.innerWidth,
  });
}
