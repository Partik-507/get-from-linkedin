import type { Point, AnyElement } from '../elements/types';

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function isPointInElement(px: number, py: number, el: AnyElement, pad = 4): boolean {
  const cos = Math.cos(-el.angle);
  const sin = Math.sin(-el.angle);
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rx = (px - cx) * cos - (py - cy) * sin + cx;
  const ry = (px - cx) * sin + (py - cy) * cos + cy;
  return rx >= el.x - pad && rx <= el.x + el.width + pad &&
         ry >= el.y - pad && ry <= el.y + el.height + pad;
}

export function getBoundingBox(elements: AnyElement[]): { x: number; y: number; width: number; height: number } {
  if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function snapToGrid(value: number, gridStep: number): number {
  return Math.round(value / gridStep) * gridStep;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function getConnectionPoints(el: AnyElement): Point[] {
  const { x, y, width, height } = el;
  return [
    { x: x + width / 2, y },
    { x: x + width, y: y + height / 2 },
    { x: x + width / 2, y: y + height },
    { x, y: y + height / 2 },
    { x: x + width / 2, y: y + height / 2 },
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function nearestConnectionPoint(el: AnyElement, target: Point): Point {
  const pts = getConnectionPoints(el);
  return pts.reduce((best, pt) => distance(pt, target) < distance(best, target) ? pt : best, pts[0]);
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function simplifyPoints(points: Point[], tolerance = 2): Point[] {
  if (points.length <= 2) return points;
  return rdpSimplify(points, tolerance);
}

function rdpSimplify(points: Point[], eps: number): Point[] {
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToLineDistance(points[i], start, end);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > eps) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), eps);
    const right = rdpSimplify(points.slice(maxIdx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function pointToLineDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return distance(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
