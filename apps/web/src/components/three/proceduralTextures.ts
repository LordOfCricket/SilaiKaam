import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintWoodGrain(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = '#c8a06a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 46; i++) {
    const y = Math.random() * size;
    const shade = 0.7 + Math.random() * 0.4;
    ctx.strokeStyle = `rgba(${Math.round(120 * shade)}, ${Math.round(86 * shade)}, ${Math.round(48 * shade)}, ${0.12 + Math.random() * 0.18})`;
    ctx.lineWidth = 1 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 4);
    }
    ctx.stroke();
  }
}

export function createWoodTexture(): CanvasTexture {
  const size = 256;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (ctx) paintWoodGrain(ctx, size);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createBrandedCapTexture(): CanvasTexture {
  const size = 512;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    paintWoodGrain(ctx, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2a2119';
    ctx.font = '600 46px Georgia, serif';
    ctx.fillText('SilaiKaam', 0, -8);
    ctx.fillStyle = '#4a3c26';
    ctx.font = '400 14px Georgia, serif';
    ctx.fillText('T A I L O R E D   F O R   Y O U', 0, 30);
    ctx.restore();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createThreadTexture(): CanvasTexture {
  const width = 512;
  const height = 128;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const base = ['#a6432c', '#8f3a26', '#b6543a', '#8a3722'];
    for (let y = 0; y < height; y += 3) {
      ctx.strokeStyle = base[Math.floor(Math.random() * base.length)] ?? '#a6432c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= width; x += 24) {
        ctx.lineTo(x, y + Math.sin(x * 0.08) * 1.5);
      }
      ctx.stroke();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(10, 3);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
