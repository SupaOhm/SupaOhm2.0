import { CanvasTexture, Mesh, PlaneGeometry } from 'three';
import { drawLockScreen, lockClock } from '../ui/lockScreen';
import type { PlaneSpec } from './objects/types';
import { screenMaterial } from './pictures';

const HEIGHT = 1024;
const FACE_ID_STEPS = 24;

export interface LockPlane {
  mesh: Mesh;
  /** amount: 0..1 opacity over the dark glass; faceId: 0..1 Face ID progress. */
  update(amount: number, faceId: number): void;
  dispose(): void;
}

/** The contact phone's lock screen on its 3D screen, repainted only when the minute or the Face ID step changes. */
export function createLockPlane(plane: PlaneSpec): LockPlane {
  const aspect = plane.size[0] / plane.size[1];
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(HEIGHT * aspect);
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  const material = screenMaterial(aspect);
  material.uniforms.uImg.value = texture;
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.renderOrder = 1;
  mesh.position.set(...plane.pos);
  mesh.rotation.set(...plane.rot);
  mesh.scale.set(plane.size[0], plane.size[1], 1);
  mesh.visible = false;
  let painted = '';

  return {
    mesh,
    update(amount, faceId) {
      mesh.visible = amount > 0.001;
      material.uniforms.uAmt.value = amount;
      if (!mesh.visible || !ctx) return;
      const clock = lockClock(new Date());
      const step = Math.round(faceId * FACE_ID_STEPS) / FACE_ID_STEPS;
      const key = `${clock.time}|${step}`;
      if (key === painted) return;
      painted = key;
      drawLockScreen(ctx, canvas.width, canvas.height, { ...clock, faceId: step });
      texture.needsUpdate = true;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
