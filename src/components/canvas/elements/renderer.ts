import rough from 'roughjs';
import type { AnyElement, TextElement, FreedrawElement, ArrowElement, ImageElement, FrameElement, StickyNoteElement, CanvasElement, Point } from './types';
import type { Viewport } from './types';

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) return imageCache.get(src)!;
  const img = new Image();
  img.onload = () => imageCache.set(src, img);
  img.src = src;
  return null;
}

export function renderElement(ctx: CanvasRenderingContext2D, el: AnyElement, selected: boolean, zoom: number) {
  if (el.hidden) return;
  ctx.save();
  ctx.globalAlpha = el.opacity / 100;

  // Apply rotation
  if (el.angle !== 0) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(el.angle);
    ctx.translate(-cx, -cy);
  }

  switch (el.type) {
    case 'rectangle': renderRect(ctx, el); break;
    case 'diamond': renderDiamond(ctx, el); break;
    case 'ellipse': renderEllipse(ctx, el); break;
    case 'triangle': renderTriangle(ctx, el); break;
    case 'star': renderStar(ctx, el); break;
    case 'pentagon': renderPolygon(ctx, el, 5); break;
    case 'hexagon': renderPolygon(ctx, el, 6); break;
    case 'octagon': renderPolygon(ctx, el, 8); break;
    case 'parallelogram': renderParallelogram(ctx, el); break;
    case 'trapezoid': renderTrapezoid(ctx, el); break;
    case 'cylinder': renderCylinder(ctx, el); break;
    case 'callout': renderCallout(ctx, el); break;
    case 'cloud': renderCloud(ctx, el); break;
    case 'cross': renderCross(ctx, el); break;
    case 'database': renderDatabase(ctx, el); break;
    case 'text': renderText(ctx, el as TextElement, zoom); break;
    case 'sticky-note': renderStickyNote(ctx, el as StickyNoteElement, zoom); break;
    case 'arrow':
    case 'line': renderArrow(ctx, el as ArrowElement); break;
    case 'freedraw': renderFreedraw(ctx, el as FreedrawElement); break;
    case 'image': renderImage(ctx, el as ImageElement); break;
    case 'frame': renderFrame(ctx, el as FrameElement, zoom); break;
    case 'zone': renderZone(ctx, el); break;
    default: renderRect(ctx, el); break;
  }

  ctx.restore();

  if (selected && !el.hidden) {
    renderSelectionBox(ctx, el);
  }

  if (el.locked) {
    renderLockIcon(ctx, el);
  }
}

function applyStroke(ctx: CanvasRenderingContext2D, el: AnyElement) {
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  if (el.strokeStyle === 'dashed') ctx.setLineDash([el.strokeWidth * 4, el.strokeWidth * 2]);
  else if (el.strokeStyle === 'dotted') ctx.setLineDash([el.strokeWidth, el.strokeWidth * 2]);
  else ctx.setLineDash([]);
}

function applyFill(ctx: CanvasRenderingContext2D, el: AnyElement) {
  if (el.fillStyle === 'none' || el.fillColor === 'transparent') {
    ctx.fillStyle = 'transparent';
  } else {
    ctx.fillStyle = el.fillColor;
  }
}

function getCornerRadius(el: AnyElement): number {
  switch (el.roundness) {
    case 'sharp': return 0;
    case 'round': return Math.min(el.width, el.height) * 0.15;
    case 'extra-round': return Math.min(el.width, el.height) * 0.3;
    default: return 0;
  }
}

function renderRect(ctx: CanvasRenderingContext2D, el: AnyElement) {
  if (el.roughness > 0) {
    renderRoughShape(ctx, el, 'rect');
    return;
  }
  const r = getCornerRadius(el);
  ctx.beginPath();
  if (r > 0) {
    ctx.roundRect(el.x, el.y, el.width, el.height, r);
  } else {
    ctx.rect(el.x, el.y, el.width, el.height);
  }
  applyFill(ctx, el);
  if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el);
  ctx.stroke();
}

function renderDiamond(ctx: CanvasRenderingContext2D, el: AnyElement) {
  if (el.roughness > 0) { renderRoughShape(ctx, el, 'diamond'); return; }
  const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
  ctx.beginPath();
  ctx.moveTo(cx, el.y);
  ctx.lineTo(el.x + el.width, cy);
  ctx.lineTo(cx, el.y + el.height);
  ctx.lineTo(el.x, cy);
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderEllipse(ctx: CanvasRenderingContext2D, el: AnyElement) {
  if (el.roughness > 0) { renderRoughShape(ctx, el, 'ellipse'); return; }
  ctx.beginPath();
  ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderTriangle(ctx: CanvasRenderingContext2D, el: AnyElement) {
  if (el.roughness > 0) { renderRoughShape(ctx, el, 'triangle'); return; }
  ctx.beginPath();
  ctx.moveTo(el.x + el.width / 2, el.y);
  ctx.lineTo(el.x + el.width, el.y + el.height);
  ctx.lineTo(el.x, el.y + el.height);
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderPolygon(ctx: CanvasRenderingContext2D, el: AnyElement, sides: number) {
  const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
  const rx = el.width / 2, ry = el.height / 2;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = cx + rx * Math.cos(angle), py = cy + ry * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderStar(ctx: CanvasRenderingContext2D, el: AnyElement) {
  const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
  const outerR = Math.min(el.width, el.height) / 2;
  const innerR = outerR * 0.4;
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + r * Math.cos(angle), py = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderParallelogram(ctx: CanvasRenderingContext2D, el: AnyElement) {
  const skew = el.width * 0.2;
  ctx.beginPath();
  ctx.moveTo(el.x + skew, el.y);
  ctx.lineTo(el.x + el.width, el.y);
  ctx.lineTo(el.x + el.width - skew, el.y + el.height);
  ctx.lineTo(el.x, el.y + el.height);
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderTrapezoid(ctx: CanvasRenderingContext2D, el: AnyElement) {
  const indent = el.width * 0.15;
  ctx.beginPath();
  ctx.moveTo(el.x + indent, el.y);
  ctx.lineTo(el.x + el.width - indent, el.y);
  ctx.lineTo(el.x + el.width, el.y + el.height);
  ctx.lineTo(el.x, el.y + el.height);
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderCylinder(ctx: CanvasRenderingContext2D, el: AnyElement) {
  const ry = el.height * 0.15;
  ctx.beginPath();
  ctx.ellipse(el.x + el.width / 2, el.y + ry, el.width / 2, ry, 0, 0, Math.PI * 2);
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(el.x, el.y + ry);
  ctx.lineTo(el.x, el.y + el.height - ry);
  ctx.ellipse(el.x + el.width / 2, el.y + el.height - ry, el.width / 2, ry, 0, Math.PI, 0);
  ctx.lineTo(el.x + el.width, el.y + ry);
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderCallout(ctx: CanvasRenderingContext2D, el: AnyElement) {
  const r = 8;
  const tailW = 20, tailH = 20;
  const { x, y, width, height } = el;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height - tailH, r);
  ctx.moveTo(x + width * 0.3, y + height - tailH);
  ctx.lineTo(x + width * 0.15, y + height);
  ctx.lineTo(x + width * 0.3 + tailW, y + height - tailH);
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderCloud(ctx: CanvasRenderingContext2D, el: AnyElement) {
  const { x, y, width, height } = el;
  ctx.beginPath();
  const bumps = 4;
  const bumpR = width / (bumps * 2 + 1);
  for (let i = 0; i < bumps; i++) {
    const cx = x + bumpR + i * bumpR * 2;
    ctx.arc(cx, y + height * 0.6, bumpR, Math.PI, 0);
  }
  ctx.arc(x + width * 0.85, y + height * 0.55, width * 0.15, -Math.PI * 0.3, Math.PI * 0.3);
  ctx.arc(x + width * 0.5, y + height * 0.3, width * 0.2, Math.PI * 1.2, Math.PI * 0.1);
  ctx.arc(x + width * 0.2, y + height * 0.5, width * 0.15, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderCross(ctx: CanvasRenderingContext2D, el: AnyElement) {
  const t = Math.min(el.width, el.height) * 0.3;
  const { x, y, width, height } = el;
  ctx.beginPath();
  ctx.moveTo(x + (width - t) / 2, y);
  ctx.lineTo(x + (width + t) / 2, y);
  ctx.lineTo(x + (width + t) / 2, y + (height - t) / 2);
  ctx.lineTo(x + width, y + (height - t) / 2);
  ctx.lineTo(x + width, y + (height + t) / 2);
  ctx.lineTo(x + (width + t) / 2, y + (height + t) / 2);
  ctx.lineTo(x + (width + t) / 2, y + height);
  ctx.lineTo(x + (width - t) / 2, y + height);
  ctx.lineTo(x + (width - t) / 2, y + (height + t) / 2);
  ctx.lineTo(x, y + (height + t) / 2);
  ctx.lineTo(x, y + (height - t) / 2);
  ctx.lineTo(x + (width - t) / 2, y + (height - t) / 2);
  ctx.closePath();
  applyFill(ctx, el); if (el.fillStyle !== 'none') ctx.fill();
  applyStroke(ctx, el); ctx.stroke();
}

function renderDatabase(ctx: CanvasRenderingContext2D, el: AnyElement) {
  renderCylinder(ctx, el);
  const ry = el.height * 0.12;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(el.x + el.width / 2, el.y + ry + (i * el.height * 0.25), el.width / 2, ry, 0, 0, Math.PI);
    applyStroke(ctx, el); ctx.stroke();
  }
}

function renderText(ctx: CanvasRenderingContext2D, el: TextElement, zoom: number) {
  ctx.font = `${el.fontStyle ?? ''} ${el.fontWeight ?? 'normal'} ${el.fontSize}px ${el.fontFamily}`;
  ctx.fillStyle = el.textColor || el.strokeColor;
  ctx.textAlign = el.textAlign as CanvasTextAlign;
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, el.content || '', el.width);
  const lineH = el.fontSize * (el.lineHeight ?? 1.4);
  if (el.textBackground && el.textBackground !== 'transparent') {
    ctx.fillStyle = el.textBackground;
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.fillStyle = el.textColor || el.strokeColor;
  }
  lines.forEach((line, i) => {
    const tx = el.textAlign === 'center' ? el.x + el.width / 2 :
               el.textAlign === 'right' ? el.x + el.width : el.x;
    ctx.fillText(line, tx, el.y + i * lineH);
  });
}

function renderStickyNote(ctx: CanvasRenderingContext2D, el: StickyNoteElement, zoom: number) {
  ctx.fillStyle = el.stickyColor || '#fef08a';
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(el.x, el.y, el.width, el.height, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `${el.fontSize ?? 14}px ${el.fontFamily ?? 'system-ui'}`;
  ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'left';
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, el.content || '', el.width - 16);
  lines.forEach((line, i) => {
    ctx.fillText(line, el.x + 8, el.y + 8 + i * (el.fontSize ?? 14) * 1.4);
  });
  if (el.pinned) {
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(el.x + el.width / 2, el.y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderArrow(ctx: CanvasRenderingContext2D, el: ArrowElement) {
  const pts = el.points;
  if (!pts || pts.length < 2) return;
  applyStroke(ctx, el);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (el.arrowType === 'curved' && pts.length === 2) {
    const cp = { x: (pts[0].x + pts[1].x) / 2, y: pts[0].y };
    ctx.quadraticCurveTo(cp.x, cp.y, pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  if (el.type === 'arrow') {
    if (el.endCap !== 'none') drawArrowhead(ctx, pts[pts.length - 2] || pts[0], pts[pts.length - 1], el.strokeColor, el.strokeWidth, el.endCap || 'arrow');
    if (el.startCap && el.startCap !== 'none') drawArrowhead(ctx, pts[1] || pts[pts.length - 1], pts[0], el.strokeColor, el.strokeWidth, el.startCap);
  }
  // Draw label
  if (el.label) {
    const mid = pts[Math.floor(pts.length / 2)];
    ctx.font = `14px system-ui`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(26,26,46,0.85)';
    const metrics = ctx.measureText(el.label);
    ctx.fillRect(mid.x - metrics.width / 2 - 4, mid.y - 10, metrics.width + 8, 20);
    ctx.fillStyle = el.strokeColor;
    ctx.fillText(el.label, mid.x, mid.y);
  }
}

function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string, width: number, cap: string) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = width * 4 + 6;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([]);
  if (cap === 'dot') {
    ctx.beginPath();
    ctx.arc(to.x, to.y, size / 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (cap === 'circle') {
    ctx.beginPath();
    ctx.arc(to.x, to.y, size / 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (cap === 'square') {
    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.rotate(angle);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 7), to.y - size * Math.sin(angle - Math.PI / 7));
    if (cap === 'arrow') ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 7), to.y - size * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }
}

function renderFreedraw(ctx: CanvasRenderingContext2D, el: FreedrawElement) {
  if (!el.points || el.points.length < 2) return;
  applyStroke(ctx, el);
  ctx.beginPath();
  ctx.moveTo(el.points[0].x, el.points[0].y);
  for (let i = 1; i < el.points.length - 1; i++) {
    const xc = (el.points[i].x + el.points[i + 1].x) / 2;
    const yc = (el.points[i].y + el.points[i + 1].y) / 2;
    ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
  }
  ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
  ctx.stroke();
}

function renderImage(ctx: CanvasRenderingContext2D, el: ImageElement) {
  const img = loadImage(el.src);
  if (!img) return;
  ctx.save();
  if (el.cornerRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(el.x, el.y, el.width, el.height, el.cornerRadius);
    ctx.clip();
  }
  if (el.filter === 'grayscale') {
    ctx.filter = 'grayscale(1)';
  } else if (el.filter === 'sepia') {
    ctx.filter = 'sepia(1)';
  } else if (el.filter === 'blur') {
    ctx.filter = `blur(${el.blurAmount || 4}px)`;
  }
  ctx.drawImage(img, el.x, el.y, el.width, el.height);
  ctx.restore();
}

function renderFrame(ctx: CanvasRenderingContext2D, el: FrameElement, zoom: number) {
  ctx.strokeStyle = '#7C3AED';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.strokeRect(el.x, el.y, el.width, el.height);
  ctx.setLineDash([]);
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.globalAlpha = el.opacity / 100;
  }
  // Frame label
  ctx.fillStyle = '#7C3AED';
  ctx.font = `bold ${Math.max(11, 12 / zoom)}px system-ui`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(el.name || 'Frame', el.x + 4, el.y - 2);
}

function renderZone(ctx: CanvasRenderingContext2D, el: AnyElement & { name?: string; themeColor?: string }) {
  ctx.fillStyle = (el as any).themeColor || 'rgba(124, 58, 237, 0.05)';
  ctx.fillRect(el.x, el.y, el.width, el.height);
  ctx.strokeStyle = (el as any).themeColor || '#7C3AED';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(el.x, el.y, el.width, el.height);
  ctx.setLineDash([]);
  ctx.fillStyle = (el as any).themeColor || '#7C3AED';
  ctx.font = '12px system-ui';
  ctx.textBaseline = 'top';
  ctx.fillText((el as any).name || 'Zone', el.x + 8, el.y + 8);
}

function renderRoughShape(ctx: CanvasRenderingContext2D, el: AnyElement, shape: string) {
  const rc = rough.canvas(ctx.canvas);
  const opts = {
    roughness: el.roughness,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fill: el.fillStyle !== 'none' ? el.fillColor : undefined,
    fillStyle: el.fillStyle === 'hachure' ? 'hachure' :
               el.fillStyle === 'cross-hatch' ? 'cross-hatch' :
               el.fillStyle === 'dots' ? 'dots' :
               el.fillStyle === 'zigzag' ? 'zigzag' : 'solid',
    seed: el.seed,
    strokeLineDash: el.strokeStyle === 'dashed' ? [8, 4] : el.strokeStyle === 'dotted' ? [2, 4] : undefined,
  };
  if (shape === 'rect') rc.rectangle(el.x, el.y, el.width, el.height, opts);
  else if (shape === 'ellipse') rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width, el.height, opts);
  else if (shape === 'diamond') {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
    rc.polygon([[cx, el.y], [el.x + el.width, cy], [cx, el.y + el.height], [el.x, cy]], opts);
  } else if (shape === 'triangle') {
    rc.polygon([[el.x + el.width / 2, el.y], [el.x + el.width, el.y + el.height], [el.x, el.y + el.height]], opts);
  }
}

function renderSelectionBox(ctx: CanvasRenderingContext2D, el: AnyElement) {
  ctx.save();
  if (el.angle !== 0) {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(el.angle);
    ctx.translate(-cx, -cy);
  }
  const pad = 6;
  ctx.strokeStyle = '#7C3AED';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(el.x - pad, el.y - pad, el.width + pad * 2, el.height + pad * 2);
  // Handles
  const handles = getHandlePositions(el, pad);
  for (const h of handles) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(h.x - 5, h.y - 5, 10, 10, 2);
    ctx.fill();
    ctx.stroke();
  }
  // Rotation handle
  ctx.fillStyle = '#7C3AED';
  ctx.beginPath();
  ctx.arc(el.x + el.width / 2, el.y - pad - 20, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getHandlePositions(el: AnyElement, pad: number): Point[] {
  const { x, y, width, height } = el;
  return [
    { x: x - pad, y: y - pad },
    { x: x + width / 2, y: y - pad },
    { x: x + width + pad, y: y - pad },
    { x: x + width + pad, y: y + height / 2 },
    { x: x + width + pad, y: y + height + pad },
    { x: x + width / 2, y: y + height + pad },
    { x: x - pad, y: y + height + pad },
    { x: x - pad, y: y + height / 2 },
  ];
}

function renderLockIcon(ctx: CanvasRenderingContext2D, el: AnyElement) {
  ctx.fillStyle = 'rgba(100,100,100,0.7)';
  ctx.font = '12px system-ui';
  ctx.fillText('🔒', el.x + el.width - 14, el.y + el.height - 2);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function renderGrid(ctx: CanvasRenderingContext2D, viewport: { x: number; y: number; zoom: number; width: number; height: number }, step: number, style: string, theme: 'light' | 'dark') {
  const { x: vpX, y: vpY, zoom, width, height } = viewport;
  const startX = Math.floor(vpX / step) * step;
  const startY = Math.floor(vpY / step) * step;
  const endX = vpX + width / zoom;
  const endY = vpY + height / zoom;
  const color = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 0.5;
  if (style === 'dots') {
    for (let gx = startX; gx <= endX; gx += step) {
      for (let gy = startY; gy <= endY; gy += step) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    for (let gx = startX; gx <= endX; gx += step) {
      ctx.beginPath(); ctx.moveTo(gx, vpY); ctx.lineTo(gx, endY); ctx.stroke();
    }
    for (let gy = startY; gy <= endY; gy += step) {
      ctx.beginPath(); ctx.moveTo(vpX, gy); ctx.lineTo(endX, gy); ctx.stroke();
    }
  }
}

export { getHandlePositions, wrapText };
