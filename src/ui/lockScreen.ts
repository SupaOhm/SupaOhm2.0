/**
 * The contact phone's lock screen, "liquid glass": pastel blooms behind a translucent clock and a frosted
 * notification. Plain Canvas 2D, so the 3D phone's screen texture and the no-WebGL phone draw the same picture.
 */

export interface LockState {
  time: string;
  date: string;
  /** 0..1: the Face ID ring sweeping round; 1 is a tick; 0 hides the glyph. */
  faceId: number;
}

export const LOCK_NOTE = { from: 'Supakorn', when: 'now', text: 'made it to the bottom? say hi 👋' };

const FONT = '"Inter Tight", system-ui, sans-serif';

/** The visitor's own time and date, as a lock screen shows them: "9:41", "Sunday 18 October". */
export function lockClock(now: Date): Pick<LockState, 'time' | 'date'> {
  return {
    time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
    date: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function bloom(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function faceIdGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, progress: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = r * 0.13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (progress < 1) {
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  } else {
    ctx.moveTo(x - r * 0.5, y);
    ctx.lineTo(x - r * 0.12, y + r * 0.4);
    ctx.lineTo(x + r * 0.55, y - r * 0.38);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawLockScreen(ctx: CanvasRenderingContext2D, w: number, h: number, s: LockState): void {
  ctx.fillStyle = '#e9ecf5';
  ctx.fillRect(0, 0, w, h);
  bloom(ctx, w, h, 0.3 * w, 0.3 * h, 0.75 * w, 'rgba(201, 214, 255, 1)');
  bloom(ctx, w, h, 0.75 * w, 0.65 * h, 0.7 * w, 'rgba(255, 209, 232, 1)');
  bloom(ctx, w, h, 0.4 * w, 0.92 * h, 0.85 * w, 'rgba(184, 240, 228, 1)');
  bloom(ctx, w, h, 0.5 * w, 0.26 * h, 0.5 * w, 'rgba(255, 255, 255, 0.55)');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
  ctx.font = `600 ${Math.round(h * 0.03)}px ${FONT}`;
  ctx.fillText(s.date, w / 2, h * 0.12);

  // the clock: clear glass lifted by a soft shadow
  ctx.save();
  ctx.shadowColor = 'rgba(80, 90, 140, 0.35)';
  ctx.shadowBlur = h * 0.04;
  ctx.shadowOffsetY = h * 0.006;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `700 ${Math.round(h * 0.19)}px ${FONT}`;
  ctx.fillText(s.time, w / 2, h * 0.3);
  ctx.restore();

  // the notification: a frosted pill near the bottom
  const nx = w * 0.06;
  const nw = w * 0.88;
  const nh = h * 0.11;
  const ny = h * 0.79;
  ctx.save();
  ctx.shadowColor = 'rgba(80, 90, 140, 0.18)';
  ctx.shadowBlur = h * 0.03;
  roundRect(ctx, nx, ny, nw, nh, h * 0.028);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, nx, ny, nw, nh, h * 0.028);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(1, h * 0.002);
  ctx.stroke();

  const tx = nx + w * 0.05;
  const small = Math.round(h * 0.026);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1d1d1f';
  ctx.font = `700 ${small}px ${FONT}`;
  ctx.fillText(LOCK_NOTE.from, tx, ny + nh * 0.42);
  const fromWidth = ctx.measureText(`${LOCK_NOTE.from} `).width;
  ctx.fillStyle = 'rgba(29, 29, 31, 0.55)';
  ctx.font = `600 ${small}px ${FONT}`;
  ctx.fillText(LOCK_NOTE.when, tx + fromWidth, ny + nh * 0.42);
  ctx.fillStyle = '#1d1d1f';
  ctx.font = `500 ${small}px ${FONT}`;
  ctx.fillText(LOCK_NOTE.text, tx, ny + nh * 0.76, nw - w * 0.1);

  // home indicator
  roundRect(ctx, w * 0.37, h * 0.966, w * 0.26, h * 0.006, h * 0.003);
  ctx.fillStyle = 'rgba(30, 30, 50, 0.35)';
  ctx.fill();

  if (s.faceId > 0) faceIdGlyph(ctx, w / 2, h * 0.62, w * 0.1, s.faceId);
}
