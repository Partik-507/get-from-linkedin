import type { Viewport, Point } from '../elements/types';

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 30;

export function worldToScreen(worldX: number, worldY: number, vp: Viewport): Point {
  return {
    x: (worldX - vp.x) * vp.zoom,
    y: (worldY - vp.y) * vp.zoom,
  };
}

export function screenToWorld(screenX: number, screenY: number, vp: Viewport): Point {
  return {
    x: screenX / vp.zoom + vp.x,
    y: screenY / vp.zoom + vp.y,
  };
}

export function zoomAtPoint(vp: Viewport, newZoom: number, anchorScreen: Point): Viewport {
  const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
  const worldAnchor = screenToWorld(anchorScreen.x, anchorScreen.y, vp);
  return {
    ...vp,
    zoom: clampedZoom,
    x: worldAnchor.x - anchorScreen.x / clampedZoom,
    y: worldAnchor.y - anchorScreen.y / clampedZoom,
  };
}

export function fitToElements(
  elements: { x: number; y: number; width: number; height: number }[],
  vpWidth: number,
  vpHeight: number,
  padding = 40
): Viewport {
  if (elements.length === 0) {
    return { x: 0, y: 0, zoom: 1, width: vpWidth, height: vpHeight };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const zoom = Math.min(
    (vpWidth - padding * 2) / contentW,
    (vpHeight - padding * 2) / contentH,
    1
  );
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    x: cx - vpWidth / (2 * zoom),
    y: cy - vpHeight / (2 * zoom),
    zoom,
    width: vpWidth,
    height: vpHeight,
  };
}

export function getViewportBounds(vp: Viewport): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: vp.x,
    minY: vp.y,
    maxX: vp.x + vp.width / vp.zoom,
    maxY: vp.y + vp.height / vp.zoom,
  };
}
