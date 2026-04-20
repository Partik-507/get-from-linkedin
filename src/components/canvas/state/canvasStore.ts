import { atom, type PrimitiveAtom } from 'jotai';
import type { AnyElement, Tool, Viewport, CanvasScene, LibraryItem, CanvasComment, CanvasVariable, Point } from '../elements/types';

/**
 * `patom<T>(initial)` — wrapper around Jotai's `atom()` that forces the
 * `PrimitiveAtom<T>` overload. Required because this project runs with
 * `strictNullChecks: false`, which causes `atom<T | null>(null)` to match
 * Jotai's read-only `Read<Value>` overload (since `null` is assignable to
 * any function type under non-strict). The `as PrimitiveAtom<T>` cast
 * locks in the writable signature so `useAtom` setters are callable.
 */
const patom = <T,>(initial: T): PrimitiveAtom<T> => atom(initial) as PrimitiveAtom<T>;

// ─── Core Scene ─────────────────────────────────────────────────────────────
export const canvasIdAtom = patom<string>('');
export const canvasNameAtom = patom<string>('Untitled Canvas');
export const elementsAtom = patom<AnyElement[]>([]);
export const viewportAtom = patom<Viewport>({ x: 0, y: 0, zoom: 1, width: 800, height: 600 });
export const backgroundColorAtom = patom<string>('#1a1a2e');
export const gridEnabledAtom = patom<boolean>(true);
export const gridStepAtom = patom<number>(20);
export const gridStyleAtom = patom<'dots' | 'lines' | 'blueprint' | 'graph' | 'none'>('none');
export const snapToGridAtom = patom<boolean>(false);
export const snapToObjectsAtom = patom<boolean>(true);
export const handDrawnModeAtom = patom<boolean>(false);

// ─── Tool ────────────────────────────────────────────────────────────────────
export const activeToolAtom = patom<Tool>('select');
export const isLockedAtom = patom<boolean>(false);

// ─── Selection ───────────────────────────────────────────────────────────────
export const selectedIdsAtom = patom<Set<string>>(new Set<string>());
export const hoveredIdAtom = patom<string | null>(null);

// ─── Drawing State ───────────────────────────────────────────────────────────
export const isDrawingAtom = patom<boolean>(false);
export const drawingPreviewAtom = patom<AnyElement | null>(null);
export const editingTextIdAtom = patom<string | null>(null);

// ─── UI State ────────────────────────────────────────────────────────────────
export const sidebarOpenAtom = patom<boolean>(true);
export const libraryOpenAtom = patom<boolean>(false);
export const focusModeAtom = patom<boolean>(false);
export const presentationModeAtom = patom<boolean>(false);
export const presentationFrameIndexAtom = patom<number>(0);
export const showRulersAtom = patom<boolean>(false);
export const showMinimapAtom = patom<boolean>(false);
export const showCommentsAtom = patom<boolean>(true);
export const showHistoryPanelAtom = patom<boolean>(false);
export const commandPaletteOpenAtom = patom<boolean>(false);

// ─── History ─────────────────────────────────────────────────────────────────
export interface HistoryState {
  elements: AnyElement[];
  description: string;
  timestamp: number;
}
export const historyStackAtom = patom<HistoryState[]>([]);
export const historyIndexAtom = patom<number>(-1);
export const isSavedAtom = patom<boolean>(true);

// ─── Library ─────────────────────────────────────────────────────────────────
export const libraryItemsAtom = patom<LibraryItem[]>([]);

// ─── Comments ────────────────────────────────────────────────────────────────
export const commentsAtom = patom<CanvasComment[]>([]);

// ─── Variables ───────────────────────────────────────────────────────────────
export const variablesAtom = patom<CanvasVariable[]>([]);

// ─── Settings ────────────────────────────────────────────────────────────────
export const themeAtom = patom<'light' | 'dark'>('dark');
export const defaultStrokeColorAtom = patom<string>('#e2e8f0');
export const defaultFillColorAtom = patom<string>('transparent');
export const defaultStrokeWidthAtom = patom<number>(2);
export const defaultFontAtom = patom<string>('system-ui');
export const defaultFontSizeAtom = patom<number>(16);

// ─── Style Defaults (for new elements) ───────────────────────────────────────
export const currentStrokeColorAtom = patom<string>('#e2e8f0');
export const currentFillColorAtom = patom<string>('transparent');
export const currentStrokeWidthAtom = patom<number>(2);
export const currentStrokeStyleAtom = patom<'solid' | 'dashed' | 'dotted'>('solid');
export const currentFillStyleAtom = patom<'none' | 'solid' | 'hachure' | 'cross-hatch' | 'dots' | 'zigzag' | 'zigzag-line'>('none');
export const currentRoughnessAtom = patom<0 | 1 | 2 | 3>(0);
export const currentRoundnessAtom = patom<'none' | 'sharp' | 'round' | 'extra-round'>('sharp');
export const currentOpacityAtom = patom<number>(100);
export const currentFontSizeAtom = patom<number>(16);
export const currentFontFamilyAtom = patom<string>('system-ui');
export const currentTextColorAtom = patom<string>('#e2e8f0');
export const stickyColorAtom = patom<string>('#fef08a');

// ─── Export Modal ─────────────────────────────────────────────────────────────
export const exportModalOpenAtom = patom<boolean>(false);
export const addToPageModalOpenAtom = patom<boolean>(false);

// ─── Search ──────────────────────────────────────────────────────────────────
export const canvasSearchOpenAtom = patom<boolean>(false);

// ─── Focus Timer ─────────────────────────────────────────────────────────────
export const focusTimerActiveAtom = patom<boolean>(false);
export const focusTimerSecondsAtom = patom<number>(25 * 60);
export const focusTimerRunningAtom = patom<boolean>(false);

// ─── Context Menu ────────────────────────────────────────────────────────────
export const contextMenuAtom = patom<{ x: number; y: number; elementId: string | null } | null>(null);

// ─── Mermaid Editor ──────────────────────────────────────────────────────────
export const mermaidEditorOpenAtom = patom<boolean>(false);
export const mermaidEditingIdAtom = patom<string | null>(null);

// ─── LaTeX Editor ────────────────────────────────────────────────────────────
export const latexEditorOpenAtom = patom<boolean>(false);
export const latexEditingIdAtom = patom<string | null>(null);

// ─── Table Creation ──────────────────────────────────────────────────────────
export const tableDialogOpenAtom = patom<boolean>(false);
export const tableDialogPositionAtom = patom<Point>({ x: 0, y: 0 });

// ─── AI Panel ────────────────────────────────────────────────────────────────
export const aiPanelOpenAtom = patom<boolean>(false);

// ─── Snap Guides ─────────────────────────────────────────────────────────────
export const snapGuidesAtom = patom<{ x?: number; y?: number }[]>([]);

// ─── Canvas Variables Panel ──────────────────────────────────────────────────
export const variablesPanelOpenAtom = patom<boolean>(false);
