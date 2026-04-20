import React from "react";
import { VivaCanvas } from "@/components/canvas/VivaCanvas";
import type { NoteMetadata } from "@/lib/notesFirestore";

interface CanvasNodeData { noteId: string; x: number; y: number; width: number; height: number; }
interface Props {
  notes: NoteMetadata[];
  canvasNodes: CanvasNodeData[];
  onUpdateNodes: (n: CanvasNodeData[]) => void;
  onSelectNote: (id: string) => void;
  contents: Record<string, string>;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  pages?: { id: string; title: string }[];
  onAddToPage?: (imageBlob: Blob, canvasId: string, caption: string) => void;
  onClose?: () => void;
}

/**
 * CanvasView — VivaVault Canvas integration.
 * Renders the full VivaCanvas module inside the Notes OS content area.
 * Zero coupling: the module communicates only through the props API.
 */
export const CanvasView: React.FC<Props> = ({
  notes,
  readOnly = false,
  theme = 'dark',
  pages,
  onAddToPage,
  onClose,
}) => {
  const notePages = pages ?? notes.map(n => ({ id: n.id, title: n.title || 'Untitled' }));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <VivaCanvas
        theme={theme}
        pages={notePages}
        onAddToPage={onAddToPage}
        onClose={onClose}
        onCanvasReady={(id) => console.log('[VivaCanvas] Ready:', id)}
      />
    </div>
  );
};
