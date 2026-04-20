export type ElementType =
  | 'rectangle' | 'diamond' | 'ellipse' | 'triangle' | 'star' | 'pentagon'
  | 'hexagon' | 'parallelogram' | 'cylinder' | 'callout' | 'octagon'
  | 'trapezoid' | 'cloud' | 'cross' | 'database' | 'note-shape'
  | 'arrow' | 'line' | 'freedraw' | 'text' | 'image' | 'embed'
  | 'frame' | 'sticky-note' | 'table' | 'mermaid' | 'latex'
  | 'portal' | 'zone';

export type FillStyle = 'none' | 'solid' | 'hachure' | 'cross-hatch' | 'dots' | 'zigzag' | 'zigzag-line';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type Roughness = 0 | 1 | 2 | 3;
export type Roundness = 'none' | 'sharp' | 'round' | 'extra-round';
export type ArrowType = 'normal' | 'elbow' | 'curved' | 'bidirectional';
export type ArrowCap = 'none' | 'arrow' | 'open-arrow' | 'dot' | 'circle' | 'square';

export interface Point { x: number; y: number; }

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  groupId: string | null;
  frameId: string | null;
  zIndex: number;
  link: string | null;
  customData: Record<string, unknown>;
  version: number;
  updatedAt: number;
  createdAt: number;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillColor: string;
  fillStyle: FillStyle;
  roughness: Roughness;
  roundness: Roundness;
  seed: number;
}

export interface TextElement extends CanvasElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  textColor: string;
  textBackground: string;
  markdownMode: boolean;
}

export interface StickyNoteElement extends CanvasElement {
  type: 'sticky-note';
  content: string;
  stickyColor: string;
  pinned: boolean;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface ArrowElement extends CanvasElement {
  type: 'arrow' | 'line';
  points: Point[];
  arrowType: ArrowType;
  startCap: ArrowCap;
  endCap: ArrowCap;
  startBindingId: string | null;
  endBindingId: string | null;
  label: string;
  waypoints: Point[];
}

export interface FreedrawElement extends CanvasElement {
  type: 'freedraw';
  points: Point[];
  pressures: number[];
  smoothing: number;
}

export interface ImageElement extends CanvasElement {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  filter: 'none' | 'grayscale' | 'sepia' | 'blur';
  blurAmount: number;
  cornerRadius: number;
}

export interface FrameElement extends CanvasElement {
  type: 'frame';
  name: string;
  clipContents: boolean;
  inPresentation: boolean;
  speakerNotes: string;
}

export interface EmbedElement extends CanvasElement {
  type: 'embed';
  url: string;
  interactive: boolean;
}

export interface TableElement extends CanvasElement {
  type: 'table';
  rows: number;
  cols: number;
  cells: TableCell[][];
  headerRow: boolean;
}

export interface TableCell {
  content: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: string;
  colSpan: number;
  rowSpan: number;
}

export interface MermaidElement extends CanvasElement {
  type: 'mermaid';
  code: string;
  renderedSvg: string;
}

export interface LatexElement extends CanvasElement {
  type: 'latex';
  formula: string;
  renderedSvg: string;
}

export interface PortalElement extends CanvasElement {
  type: 'portal';
  targetCanvasId: string;
  thumbnail: string;
}

export interface ZoneElement extends CanvasElement {
  type: 'zone';
  name: string;
  themeColor: string;
}

export type AnyElement =
  | CanvasElement | TextElement | StickyNoteElement | ArrowElement
  | FreedrawElement | ImageElement | FrameElement | EmbedElement
  | TableElement | MermaidElement | LatexElement | PortalElement | ZoneElement;

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface CanvasScene {
  id: string;
  name: string;
  elements: AnyElement[];
  backgroundColor: string;
  gridEnabled: boolean;
  gridStep: number;
  gridStyle: 'dots' | 'lines' | 'blueprint' | 'graph' | 'none';
  snapToGrid: boolean;
  snapToObjects: boolean;
  handDrawnMode: boolean;
  viewport: Viewport;
  version: number;
  updatedAt: number;
}

export type Tool =
  | 'select' | 'hand' | 'lock'
  | 'rectangle' | 'diamond' | 'ellipse' | 'triangle' | 'more-shapes'
  | 'arrow' | 'line' | 'freedraw'
  | 'text' | 'sticky-note' | 'table' | 'frame'
  | 'image' | 'embed' | 'latex' | 'mermaid'
  | 'eraser' | 'library'
  | 'star' | 'pentagon' | 'hexagon' | 'parallelogram' | 'trapezoid'
  | 'octagon' | 'cylinder' | 'callout' | 'cloud' | 'cross' | 'database'
  | 'portal' | 'zone';

export interface HistoryEntry {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  before: Partial<CanvasScene>;
  after: Partial<CanvasScene>;
}

export interface LibraryItem {
  id: string;
  name: string;
  category: string;
  elements: AnyElement[];
  thumbnail: string;
  source: 'excalidraw_official' | 'user' | 'admin';
  createdAt: number;
}

export interface CanvasComment {
  id: string;
  canvasId: string;
  x: number;
  y: number;
  elementId: string | null;
  author: string;
  authorAvatar: string;
  content: string;
  replies: CanvasCommentReply[];
  resolved: boolean;
  createdAt: number;
}

export interface CanvasCommentReply {
  id: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface CanvasVariable {
  name: string;
  value: string;
}
