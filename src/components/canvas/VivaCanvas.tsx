import React, { useEffect, useCallback, useRef } from 'react';
import { Provider, useAtom, useAtomValue, useSetAtom } from 'jotai';
import './canvas.css';

// State
import {
  canvasIdAtom, canvasNameAtom, elementsAtom, viewportAtom, themeAtom,
  isSavedAtom, libraryOpenAtom, exportModalOpenAtom, addToPageModalOpenAtom,
  commandPaletteOpenAtom, presentationModeAtom, focusModeAtom, showMinimapAtom,
  activeToolAtom, selectedIdsAtom, gridEnabledAtom, snapToGridAtom,
} from './state/canvasStore';

// DB
import { createCanvas, loadScene, saveScene, saveCanvasThumbnail } from './db/canvasDB';

// Engine
import { historyManager } from './engine/history';
import { rtree } from './engine/rtree';
import { useKeyboardShortcuts } from './engine/useKeyboardShortcuts';

// Components
import { CanvasRenderer } from './components/CanvasRenderer';
import { TopToolbar } from './components/TopToolbar';
import { RightSidebar } from './components/RightSidebar';
import { BottomBar } from './components/BottomBar';
import { TextEditor } from './components/TextEditor';
import { ContextMenu } from './components/ContextMenu';
import { ExportModal } from './components/ExportModal';
import { AddToPageModal } from './components/AddToPageModal';
import { LibraryPanel } from './components/LibraryPanel';
import { CommandPaletteCanvas } from './components/CommandPaletteCanvas';
import { MermaidEditor } from './components/MermaidEditor';
import { PresentationMode } from './components/PresentationMode';
import { Minimap } from './components/Minimap';
import type { CanvasScene } from './elements/types';

export interface VivaCanvasProps {
  canvasId?: string;
  canvasName?: string;
  theme?: 'light' | 'dark';
  pages?: { id: string; title: string }[];
  onCanvasReady?: (canvasId: string) => void;
  onAddToPage?: (imageBlob: Blob, canvasId: string, caption: string) => void;
  onClose?: () => void;
}

// Inner component (has access to Jotai atoms)
const VivaCanvasInner: React.FC<VivaCanvasProps> = ({
  canvasId: propCanvasId,
  canvasName: propName,
  theme: propTheme = 'dark',
  pages = [],
  onCanvasReady,
  onAddToPage,
  onClose,
}) => {
  const [canvasId, setCanvasId] = useAtom(canvasIdAtom);
  const [canvasName, setCanvasName] = useAtom(canvasNameAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const isSaved = useAtomValue(isSavedAtom);
  const setIsSaved = useSetAtom(isSavedAtom);
  const libraryOpen = useAtomValue(libraryOpenAtom);
  const setLibrary = useSetAtom(libraryOpenAtom);
  const focusMode = useAtomValue(focusModeAtom);
  const [exportOpen] = useAtom(exportModalOpenAtom);
  const [addToPageOpen] = useAtom(addToPageModalOpenAtom);
  const [cmdOpen] = useAtom(commandPaletteOpenAtom);
  const [presentMode] = useAtom(presentationModeAtom);
  const setPresent = useSetAtom(presentationModeAtom);
  const setFocus = useSetAtom(focusModeAtom);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useKeyboardShortcuts();

  // Init canvas
  useEffect(() => {
    const init = async () => {
      let id = propCanvasId;
      if (!id) {
        id = await createCanvas(propName || 'Untitled Canvas');
      }
      setCanvasId(id);
      setCanvasName(propName || 'Untitled Canvas');

      const scene = await loadScene(id);
      if (scene) {
        setElements(scene.elements);
        rtree.rebuild(scene.elements);
        historyManager.push(scene.elements, 'Loaded');
      } else {
        historyManager.push([], 'New canvas');
      }
      onCanvasReady?.(id);
    };
    init();
  }, [propCanvasId]);

  useEffect(() => { setTheme(propTheme); }, [propTheme]);

  // Auto-save
  useEffect(() => {
    if (isSaved || !canvasId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const scene: CanvasScene = {
        id: canvasId,
        name: canvasName,
        elements,
        backgroundColor: '#1a1a2e',
        gridEnabled: true,
        gridStep: 20,
        gridStyle: 'dots',
        snapToGrid: true,
        snapToObjects: true,
        handDrawnMode: false,
        viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
        version: Date.now(),
        updatedAt: Date.now(),
      };
      await saveScene(canvasId, scene);
      setIsSaved(true);
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [isSaved, canvasId, elements]);

  return (
    <div className={`vc-root${theme === 'light' ? ' vc-light' : ''}${focusMode ? ' vc-focus-mode' : ''}`}>
      {/* Tab bar */}
      <div className="vc-tabbar">
        <span className="vc-tab-name">✏ {canvasName}</span>
        <div className="vc-tabbar-actions">
          <button className="vc-tabbar-btn" onClick={() => setLibrary(o => !o)} title="Library (0)">📚 Library</button>
          <ExportButton />
          <button className="vc-tabbar-btn" onClick={() => setPresent(true)} title="Present (Alt+P)">▶ Present</button>
          <AddToPageButton />
          {onClose && <button className="vc-tabbar-btn" onClick={onClose} title="Close canvas">✕ Close</button>}
        </div>
      </div>

      {/* Main layout */}
      <div className="vc-layout">
        {/* Canvas area */}
        <div className="vc-canvas-area">
          <div className="vc-canvas-wrap">
            <CanvasRenderer />
            <TextEditor />
            <ContextMenu />
            <EmptyStateHint />
            <Minimap />
            <FocusTimer />
          </div>
          <BottomBar />
        </div>

        {/* Sidebar */}
        <RightSidebar />
      </div>

      {/* Floating toolbar */}
      <TopToolbar />

      {/* Library panel */}
      {libraryOpen && <LibraryPanel />}

      {/* Modals */}
      {exportOpen && <ExportModal />}
      {addToPageOpen && <AddToPageModal onAddToPage={onAddToPage} pages={pages} />}
      {cmdOpen && <CommandPaletteCanvas />}
      <MermaidEditor />
      <PresentationMode />

      {/* Focus mode hint */}
      {focusMode && (
        <div className="vc-focus-exit-hint">Focus Mode · Press Esc to exit</div>
      )}
    </div>
  );
};

// Export actions with atoms
const ExportButton: React.FC = () => {
  const [, setOpen] = useAtom(exportModalOpenAtom);
  return (
    <button className="vc-tabbar-btn" onClick={() => setOpen(true)} title="Export">⬇ Export</button>
  );
};

const AddToPageButton: React.FC = () => {
  const [, setOpen] = useAtom(addToPageModalOpenAtom);
  return (
    <button className="vc-tabbar-btn vc-tabbar-btn--primary" onClick={() => setOpen(true)} title="Add to Page (Ctrl+Shift+P)">📄 Add to Page</button>
  );
};

const EmptyStateHint: React.FC = () => {
  const elements = useAtomValue(elementsAtom);
  const setTool = useSetAtom(activeToolAtom);
  if (elements.length > 0) return null;
  return (
    <div className="vc-canvas-empty">
      <div className="vc-canvas-empty-logo">✏</div>
      <div className="vc-canvas-empty-title">VivaVault Canvas</div>
      <div className="vc-canvas-empty-hint">
        Start with{' '}
        <button onClick={() => setTool('rectangle')}>Rectangle</button>{' '}
        <button onClick={() => setTool('arrow')}>Arrow</button>{' '}
        <button onClick={() => setTool('text')}>Text</button>
      </div>
    </div>
  );
};

const FocusTimer: React.FC = () => {
  const [active, setActive] = useAtom(focusModeAtom);
  const [timerActive, setTimerActive] = React.useState(false);
  const [seconds, setSeconds] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval>>();

  React.useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { setRunning(false); clearInterval(intervalRef.current); if (Notification.permission === 'granted') new Notification('Pomodoro done! Take a break.'); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  if (!timerActive) {
    return (
      <button className="vc-tabbar-btn" style={{ position: 'absolute', bottom: 48, right: 270, fontSize: 11 }}
        onClick={() => { setTimerActive(true); setSeconds(25 * 60); setRunning(false); }}>
        ⏱ Focus Timer
      </button>
    );
  }

  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');

  return (
    <div className="vc-focus-timer">
      <span className="vc-timer-display">{m}:{s}</span>
      <button className="vc-timer-btn" onClick={() => setRunning(r => !r)}>{running ? '⏸' : '▶'}</button>
      <button className="vc-timer-btn" onClick={() => { setSeconds(25 * 60); setRunning(false); }}>↺</button>
      <button className="vc-timer-btn" onClick={() => setTimerActive(false)}>✕</button>
    </div>
  );
};

// Root export with Jotai provider
export const VivaCanvas: React.FC<VivaCanvasProps> = (props) => {
  return (
    <Provider>
      <VivaCanvasInner {...props} />
    </Provider>
  );
};

export default VivaCanvas;
