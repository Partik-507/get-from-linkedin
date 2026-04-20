import { atom } from 'jotai';
import type { AnyElement, Tool, Viewport, CanvasScene, LibraryItem, CanvasComment, CanvasVariable, Point } from '../elements/types';

// ─── Core Scene ─────────────────────────────────────────────────────────────
export const canvasIdAtom = atom<string>('');
export const canvasNameAtom = atom<string>('Untitled Canvas');
export const elementsAtom = atom<AnyElement[]>([]);
export const viewportAtom = atom<Viewport>({ x: 0, y: 0, zoom: 1, width: 800, height: 600 });
export const backgroundColorAtom = atom<string>('#1a1a2e');
export const gridEnabledAtom = atom<boolean>(true);
export const gridStepAtom = atom<number>(20);
export const gridStyleAtom = atom<'dots' | 'lines' | 'blueprint' | 'graph' | 'none'>('dots');
export const snapToGridAtom = atom<boolean>(true);
export const snapToObjectsAtom = atom<boolean>(true);
export const handDrawnModeAtom = atom<boolean>(false);

// ─── Tool ────────────────────────────────────────────────────────────────────
export const activeToolAtom = atom<Tool>('select');
export const isLockedAtom = atom<boolean>(false);

// ─── Selection ───────────────────────────────────────────────────────────────
export const selectedIdsAtom = atom<Set<string>>(new Set());
export const hoveredIdAtom = atom<string | null>(null);

// ─── Drawing State ───────────────────────────────────────────────────────────
export const isDrawingAtom = atom<boolean>(false);
export const drawingPreviewAtom = atom<AnyElement | null>(null);
export const editingTextIdAtom = atom<string | null>(null);

// ─── UI State ────────────────────────────────────────────────────────────────
export const sidebarOpenAtom = atom<boolean>(true);
export const libraryOpenAtom = atom<boolean>(false);
export const focusModeAtom = atom<boolean>(false);
export const presentationModeAtom = atom<boolean>(false);
export const presentationFrameIndexAtom = atom<number>(0);
export const showRulersAtom = atom<boolean>(false);
export const showMinimapAtom = atom<boolean>(false);
export const showCommentsAtom = atom<boolean>(true);
export const showHistoryPanelAtom = atom<boolean>(false);
export const commandPaletteOpenAtom = atom<boolean>(false);

// ─── History ─────────────────────────────────────────────────────────────────
export interface HistoryState {
  elements: AnyElement[];
  description: string;
  timestamp: number;
}
export const historyStackAtom = atom<HistoryState[]>([]);
export const historyIndexAtom = atom<number>(-1);
export const isSavedAtom = atom<boolean>(true);

// ─── Library ─────────────────────────────────────────────────────────────────
export const libraryItemsAtom = atom<LibraryItem[]>([]);

// ─── Comments ────────────────────────────────────────────────────────────────
export const commentsAtom = atom<CanvasComment[]>([]);

// ─── Variables ───────────────────────────────────────────────────────────────
export const variablesAtom = atom<CanvasVariable[]>([]);

// ─── Settings ────────────────────────────────────────────────────────────────
export const themeAtom = atom<'light' | 'dark'>('dark');
export const defaultStrokeColorAtom = atom<string>('#e2e8f0');
export const defaultFillColorAtom = atom<string>('transparent');
export const defaultStrokeWidthAtom = atom<number>(2);
export const defaultFontAtom = atom<string>('system-ui');
export const defaultFontSizeAtom = atom<number>(16);

// ─── Style Defaults (for new elements) ───────────────────────────────────────
export const currentStrokeColorAtom = atom<string>('#e2e8f0');
export const currentFillColorAtom = atom<string>('transparent');
export const currentStrokeWidthAtom = atom<number>(2);
export const currentStrokeStyleAtom = atom<'solid' | 'dashed' | 'dotted'>('solid');
export const currentFillStyleAtom = atom<'none' | 'solid' | 'hachure' | 'cross-hatch' | 'dots' | 'zigzag' | 'zigzag-line'>('none');
export const currentRoughnessAtom = atom<0 | 1 | 2 | 3>(0);
export const currentRoundnessAtom = atom<'none' | 'sharp' | 'round' | 'extra-round'>('sharp');
export const currentOpacityAtom = atom<number>(100);
export const currentFontSizeAtom = atom<number>(16);
export const currentFontFamilyAtom = atom<string>('system-ui');
export const currentTextColorAtom = atom<string>('#e2e8f0');
export const stickyColorAtom = atom<string>('#fef08a');

// ─── Export Modal ─────────────────────────────────────────────────────────────
export const exportModalOpenAtom = atom<boolean>(false);
export const addToPageModalOpenAtom = atom<boolean>(false);

// ─── Search ──────────────────────────────────────────────────────────────────
export const canvasSearchOpenAtom = atom<boolean>(false);

// ─── Focus Timer ─────────────────────────────────────────────────────────────
export const focusTimerActiveAtom = atom<boolean>(false);
export const focusTimerSecondsAtom = atom<number>(25 * 60);
export const focusTimerRunningAtom = atom<boolean>(false);

// ─── Context Menu ────────────────────────────────────────────────────────────
export const contextMenuAtom = atom<{ x: number; y: number; elementId: string | null } | null>(null);

// ─── Mermaid Editor ──────────────────────────────────────────────────────────
export const mermaidEditorOpenAtom = atom<boolean>(false);
export const mermaidEditingIdAtom = atom<string | null>(null);

// ─── LaTeX Editor ────────────────────────────────────────────────────────────
export const latexEditorOpenAtom = atom<boolean>(false);
export const latexEditingIdAtom = atom<string | null>(null);

// ─── Table Creation ──────────────────────────────────────────────────────────
export const tableDialogOpenAtom = atom<boolean>(false);
export const tableDialogPositionAtom = atom<Point>({ x: 0, y: 0 });

// ─── AI Panel ────────────────────────────────────────────────────────────────
export const aiPanelOpenAtom = atom<boolean>(false);

// ─── Snap Guides ─────────────────────────────────────────────────────────────
export const snapGuidesAtom = atom<{ x?: number; y?: number }[]>([]);

// ─── Canvas Variables Panel ──────────────────────────────────────────────────
export const variablesPanelOpenAtom = atom<boolean>(false);
