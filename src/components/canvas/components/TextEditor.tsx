import React, { useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { editingTextIdAtom, elementsAtom, viewportAtom } from '../state/canvasStore';
import type { TextElement, StickyNoteElement } from '../elements/types';
import { historyManager } from '../engine/history';
import { rtree } from '../engine/rtree';

export const TextEditor: React.FC = () => {
  const [editingId, setEditingId] = useAtom(editingTextIdAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const viewport = useAtomValue(viewportAtom);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const el = elements.find(e => e.id === editingId) as TextElement | StickyNoteElement | undefined;

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  if (!el || !editingId) return null;

  const screenX = (el.x - viewport.x) * viewport.zoom;
  const screenY = (el.y - viewport.y) * viewport.zoom;
  const w = el.width * viewport.zoom;
  const h = Math.max(el.height * viewport.zoom, 40);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    const newEls = elements.map(elem =>
      elem.id === editingId ? { ...elem, content, version: elem.version + 1, updatedAt: Date.now() } : elem
    );
    setElements(newEls);
    rtree.rebuild(newEls);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      finishEditing();
    }
    e.stopPropagation();
  };

  const finishEditing = () => {
    if (el) historyManager.push(elements, 'Edit text');
    setEditingId(null);
  };

  const fontSize = (el as TextElement).fontSize ?? 14;
  const fontFamily = (el as TextElement).fontFamily ?? 'system-ui';
  const textColor = (el as TextElement).textColor ?? '#e2e8f0';
  const bgColor = el.type === 'sticky-note' ? ((el as StickyNoteElement).stickyColor ?? '#fef08a') : 'transparent';

  return (
    <textarea
      ref={textareaRef}
      className="vc-text-editor"
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: w,
        minHeight: h,
        fontSize: fontSize * viewport.zoom,
        fontFamily,
        color: el.type === 'sticky-note' ? '#1a1a1a' : textColor,
        backgroundColor: bgColor,
        opacity: el.opacity / 100,
        transform: el.angle !== 0 ? `rotate(${el.angle}rad)` : undefined,
        transformOrigin: 'top left',
        border: '2px solid #7C3AED',
        borderRadius: 4,
        padding: '4px 8px',
        resize: 'none',
        outline: 'none',
        overflow: 'hidden',
        zIndex: 1000,
        boxSizing: 'border-box',
        lineHeight: (el as TextElement).lineHeight ?? 1.4,
      }}
      value={(el as any).content ?? ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={finishEditing}
      placeholder={el.type === 'sticky-note' ? 'Sticky note…' : 'Type something…'}
    />
  );
};
