import React, { useState, useEffect, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { commandPaletteOpenAtom, activeToolAtom, exportModalOpenAtom, addToPageModalOpenAtom, gridEnabledAtom, showMinimapAtom, showRulersAtom } from '../state/canvasStore';
import type { Tool } from '../elements/types';

interface Command { id: string; label: string; shortcut?: string; action: () => void; }

export const CommandPaletteCanvas: React.FC = () => {
  const [open, setOpen] = useAtom(commandPaletteOpenAtom);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const setTool = useSetAtom(activeToolAtom);
  const setExportOpen = useSetAtom(exportModalOpenAtom);
  const setAddToPage = useSetAtom(addToPageModalOpenAtom);
  const setGrid = useSetAtom(gridEnabledAtom);
  const setMinimap = useSetAtom(showMinimapAtom);
  const setRulers = useSetAtom(showRulersAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: 'select', label: 'Select Tool', shortcut: 'V', action: () => setTool('select') },
    { id: 'hand', label: 'Hand Tool', shortcut: 'H', action: () => setTool('hand') },
    { id: 'rectangle', label: 'Rectangle', shortcut: 'R', action: () => setTool('rectangle') },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'O', action: () => setTool('ellipse') },
    { id: 'diamond', label: 'Diamond', shortcut: 'D', action: () => setTool('diamond') },
    { id: 'arrow', label: 'Arrow', shortcut: 'A', action: () => setTool('arrow') },
    { id: 'text', label: 'Text', shortcut: 'T', action: () => setTool('text') },
    { id: 'freedraw', label: 'Pen / Freedraw', shortcut: 'P', action: () => setTool('freedraw') },
    { id: 'sticky', label: 'Sticky Note', shortcut: 'S', action: () => setTool('sticky-note') },
    { id: 'frame', label: 'Frame', shortcut: 'F', action: () => setTool('frame') },
    { id: 'eraser', label: 'Eraser', shortcut: 'E', action: () => setTool('eraser') },
    { id: 'export', label: 'Export Canvas', action: () => setExportOpen(true) },
    { id: 'addtopage', label: 'Add to Page', shortcut: 'Ctrl+Shift+P', action: () => setAddToPage(true) },
    { id: 'grid', label: 'Toggle Grid', shortcut: "Ctrl+'", action: () => setGrid(g => !g) },
    { id: 'minimap', label: 'Toggle Minimap', shortcut: 'Ctrl+Shift+M', action: () => setMinimap(m => !m) },
    { id: 'rulers', label: 'Toggle Rulers', shortcut: 'Ctrl+Shift+R', action: () => setRulers(r => !r) },
  ];

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  if (!open) return null;

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const execute = (cmd: Command) => {
    cmd.action();
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setSelected(s => Math.min(s + 1, filtered.length - 1));
    else if (e.key === 'ArrowUp') setSelected(s => Math.max(s - 1, 0));
    else if (e.key === 'Enter' && filtered[selected]) execute(filtered[selected]);
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="vc-modal-backdrop" onClick={() => setOpen(false)}>
      <div className="vc-command-palette" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="vc-command-input"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands…"
        />
        <div className="vc-command-results">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              className={`vc-command-item${i === selected ? ' vc-command-item--selected' : ''}`}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelected(i)}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && <kbd className="vc-tooltip-key">{cmd.shortcut}</kbd>}
            </button>
          ))}
          {filtered.length === 0 && <div className="vc-empty-state">No matching commands</div>}
        </div>
      </div>
    </div>
  );
};
