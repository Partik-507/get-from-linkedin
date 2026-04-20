import React, { useState, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { libraryOpenAtom, libraryItemsAtom, elementsAtom, viewportAtom } from '../state/canvasStore';
import type { LibraryItem, AnyElement } from '../elements/types';
import { loadLibraryItems, saveLibraryItems, deleteLibraryItem } from '../db/canvasDB';
import { historyManager } from '../engine/history';
import { rtree } from '../engine/rtree';
import { newId } from '../utils/geometry';

export const LibraryPanel: React.FC = () => {
  const [open, setOpen] = useAtom(libraryOpenAtom);
  const [libraryItems, setLibraryItems] = useAtom(libraryItemsAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const viewport = useAtomValue(viewportAtom);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');
  const [onlineLibraries, setOnlineLibraries] = useState<any[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);

  useEffect(() => {
    loadLibraryItems().then(setLibraryItems);
  }, []);

  const fetchOnlineLibraries = async () => {
    setOnlineLoading(true);
    try {
      const cached = sessionStorage.getItem('excalidraw_libs');
      if (cached) { setOnlineLibraries(JSON.parse(cached)); setOnlineLoading(false); return; }
      const res = await fetch('https://libraries.excalidraw.com/libraries.json');
      const data = await res.json();
      sessionStorage.setItem('excalidraw_libs', JSON.stringify(data));
      setOnlineLibraries(data);
    } catch {
      setOnlineLibraries([]);
    }
    setOnlineLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'online' && onlineLibraries.length === 0) fetchOnlineLibraries();
  }, [activeTab]);

  const placeItem = (item: LibraryItem) => {
    const cx = viewport.x + viewport.width / (2 * viewport.zoom);
    const cy = viewport.y + viewport.height / (2 * viewport.zoom);
    const placed: AnyElement[] = item.elements.map(el => ({
      ...el,
      id: newId(),
      x: el.x + cx,
      y: el.y + cy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    const newEls = [...elements, ...placed];
    setElements(newEls);
    historyManager.push(newEls, 'Place library item');
    rtree.rebuild(newEls);
  };

  const importLib = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const items: LibraryItem[] = (data.libraryItems || data.items || []).map((item: any) => ({
        id: item.id || newId(),
        name: item.name || 'Imported item',
        category: 'Imported',
        elements: item.elements || [],
        thumbnail: '',
        source: 'user' as const,
        createdAt: Date.now(),
      }));
      const updated = [...libraryItems, ...items];
      await saveLibraryItems(items);
      setLibraryItems(updated);
    } catch {
      alert('Invalid library file');
    }
  };

  const deleteItem = async (id: string) => {
    await deleteLibraryItem(id);
    setLibraryItems(prev => prev.filter(i => i.id !== id));
  };

  if (!open) return null;

  const filtered = libraryItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, LibraryItem[]>);

  return (
    <div className="vc-library-panel">
      <div className="vc-library-header">
        <span className="vc-library-title">📚 Library</span>
        <label className="vc-btn vc-btn-secondary" style={{ cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}>
          Import
          <input type="file" accept=".excalidrawlib,.json" onChange={importLib} style={{ display: 'none' }} />
        </label>
        <button className="vc-modal-close" onClick={() => setOpen(false)}>✕</button>
      </div>

      <div className="vc-library-tabs">
        <button className={`vc-tab${activeTab === 'local' ? ' vc-tab--active' : ''}`} onClick={() => setActiveTab('local')}>My Library</button>
        <button className={`vc-tab${activeTab === 'online' ? ' vc-tab--active' : ''}`} onClick={() => setActiveTab('online')}>Browse Online</button>
      </div>

      <input type="text" className="vc-input" placeholder="Search library…" value={search} onChange={e => setSearch(e.target.value)} />

      {activeTab === 'local' && (
        <div className="vc-library-body">
          {Object.keys(grouped).length === 0 && (
            <div className="vc-empty-state">
              <p>No items yet.</p>
              <p>Import a <code>.excalidrawlib</code> file to get started.</p>
            </div>
          )}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="vc-library-category">
              <div className="vc-library-category-header">{cat} ({items.length})</div>
              <div className="vc-library-grid">
                {items.map(item => (
                  <div key={item.id} className="vc-library-item" onClick={() => placeItem(item)} title={item.name}>
                    <div className="vc-library-item-preview">
                      {item.thumbnail ? <img src={item.thumbnail} alt={item.name} /> : <span style={{ fontSize: 24 }}>📦</span>}
                    </div>
                    <div className="vc-library-item-label">{item.name}</div>
                    <button className="vc-library-item-delete" onClick={e => { e.stopPropagation(); deleteItem(item.id); }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'online' && (
        <div className="vc-library-body">
          {onlineLoading ? (
            <div className="vc-empty-state">Loading online libraries…</div>
          ) : (
            <div className="vc-library-grid">
              {onlineLibraries.slice(0, 20).map((lib: any, i) => (
                <div key={i} className="vc-library-item" title={lib.name}>
                  {lib.preview && <img src={lib.preview[0]} alt={lib.name} className="vc-library-item-preview" />}
                  <div className="vc-library-item-label">{lib.name}</div>
                  <button className="vc-chip" onClick={async () => {
                    try {
                      const res = await fetch(lib.downloadLink);
                      const data = await res.json();
                      const items: LibraryItem[] = (data.libraryItems || []).map((item: any) => ({
                        id: item.id || newId(), name: lib.name, category: lib.categories?.[0] || 'Online',
                        elements: item.elements || [], thumbnail: '', source: 'excalidraw_official' as const, createdAt: Date.now(),
                      }));
                      await saveLibraryItems(items);
                      setLibraryItems(prev => [...prev, ...items]);
                    } catch { alert('Failed to download library'); }
                  }}>Download</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
