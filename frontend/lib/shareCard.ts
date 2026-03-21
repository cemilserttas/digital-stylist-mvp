/**
 * Generates a 1080×1920 Instagram Story-style look card using the Canvas API.
 * Returns a Blob (PNG) ready for navigator.share({ files }) or download.
 *
 * No external dependencies — pure Canvas 2D.
 */
import type { Suggestion } from '@/lib/types';

// Gradient stops (dark purple → blue)
const BG_STOPS: [number, string][] = [
  [0, '#0f0a1e'],
  [0.4, '#1a0a3d'],
  [1, '#0a1a3d'],
];

function applyGradientBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  BG_STOPS.forEach(([stop, color]) => grad.addColorStop(stop, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill: string
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

export async function generateLookCard(sug: Suggestion): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const PAD = 80;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ── Background
  applyGradientBg(ctx, W, H);

  // ── Decorative circles
  const drawCircle = (cx: number, cy: number, r: number, color: string) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  drawCircle(W - 100, 200, 350, 'rgba(147,51,234,0.08)');
  drawCircle(100, H - 300, 280, 'rgba(59,130,246,0.08)');

  let y = PAD + 40;

  // ── Branding
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText('✨ Digital Stylist', PAD, y);
  y += 80;

  // ── Occasion pill
  const occasionText = sug.occasion?.toUpperCase() || 'LOOK';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(168,85,247,0.9)';
  const pillW = ctx.measureText(occasionText).width + 48;
  drawRoundRect(ctx, PAD, y, pillW, 56, 28, 'rgba(147,51,234,0.25)');
  // pill border
  ctx.strokeStyle = 'rgba(147,51,234,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PAD, y, pillW, 56, 28);
  ctx.stroke();
  ctx.fillStyle = 'rgba(168,85,247,1)';
  ctx.textAlign = 'left';
  ctx.fillText(occasionText, PAD + 24, y + 37);
  y += 88;

  // ── Title
  ctx.font = 'bold 82px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  y = wrapText(ctx, sug.titre || 'Look du jour', PAD, y, W - PAD * 2, 95);
  y += 20;

  // ── Description
  if (sug.description) {
    ctx.font = '34px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    y = wrapText(ctx, sug.description, PAD, y, W - PAD * 2, 48);
    y += 48;
  }

  // ── Divider
  const gradLine = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  gradLine.addColorStop(0, 'rgba(147,51,234,0)');
  gradLine.addColorStop(0.5, 'rgba(147,51,234,0.5)');
  gradLine.addColorStop(1, 'rgba(147,51,234,0)');
  ctx.strokeStyle = gradLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 52;

  // ── Pieces
  const pieces = (sug.pieces || []).slice(0, 4);
  for (const piece of pieces) {
    const prix = typeof piece.prix === 'number' ? piece.prix : parseFloat(String(piece.prix)) || 0;

    // Row background
    drawRoundRect(ctx, PAD, y, W - PAD * 2, 110, 20, 'rgba(255,255,255,0.04)');

    // Bullet dot
    ctx.beginPath();
    ctx.arc(PAD + 30, y + 55, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168,85,247,0.8)';
    ctx.fill();

    // Type
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(piece.type || '', PAD + 56, y + 44);

    // Marque
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(168,85,247,0.9)';
    ctx.fillText(piece.marque || '', PAD + 56, y + 82);

    // Price
    ctx.font = 'bold 38px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${prix.toFixed(0)}€`, W - PAD, y + 65);

    ctx.textAlign = 'left';
    y += 130;
  }

  y += 20;

  // ── Total row
  const total = (sug.pieces || []).reduce((sum, p) => {
    const n = typeof p.prix === 'number' ? p.prix : parseFloat(String(p.prix)) || 0;
    return sum + n;
  }, 0);

  drawRoundRect(ctx, PAD, y, W - PAD * 2, 100, 20, 'rgba(147,51,234,0.15)');
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText('Total du look', PAD + 32, y + 62);
  ctx.font = 'bold 48px system-ui, sans-serif';

  const totalGrad = ctx.createLinearGradient(W - PAD - 200, 0, W - PAD, 0);
  totalGrad.addColorStop(0, '#a855f7');
  totalGrad.addColorStop(1, '#ec4899');
  ctx.fillStyle = totalGrad;
  ctx.textAlign = 'right';
  ctx.fillText(`${total.toFixed(0)} €`, W - PAD, y + 67);
  y += 140;

  // ── CTA card
  const ctaY = H - 240;
  drawRoundRect(ctx, PAD, ctaY, W - PAD * 2, 140, 24, 'rgba(147,51,234,0.2)');
  ctx.strokeStyle = 'rgba(147,51,234,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(PAD, ctaY, W - PAD * 2, 140, 24);
  ctx.stroke();

  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('Génère ton look avec l\'IA ✨', W / 2, ctaY + 55);
  ctx.font = '30px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(168,85,247,0.9)';
  ctx.fillText('digitalstylist.app', W / 2, ctaY + 100);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

/**
 * Share or download the look card.
 * Uses native Web Share API with file if supported, otherwise triggers download.
 */
export async function shareLookCard(sug: Suggestion): Promise<void> {
  const blob = await generateLookCard(sug);
  if (!blob) throw new Error('Canvas not available');

  const filename = `look-${(sug.titre || 'du-jour').toLowerCase().replace(/\s+/g, '-')}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  // Try native share with file (works on mobile)
  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title: `Look "${sug.titre}"`,
      text: `Mon look ${sug.occasion} via Digital Stylist ✨`,
      files: [file],
    });
    return;
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
