import Dexie, { type Table } from 'dexie';
import type { AnyElement, CanvasScene, LibraryItem, CanvasComment, CanvasVariable } from '../elements/types';
import LZString from 'lz-string';

export interface CanvasRecord {
  id: string;
  name: string;
  pageId: string | null;
  createdAt: number;
  updatedAt: number;
  thumbnail: string;
  compressed: boolean;
}

export interface CanvasSceneRecord {
  canvasId: string;
  sceneData: string;
  version: number;
  checksum: string;
}

export interface CanvasHistoryRecord {
  canvasId: string;
  historyStack: string;
  maxEntries: number;
}

export interface CanvasSettingsRecord {
  userId: string;
  defaultTheme: string;
  gridEnabled: boolean;
  gridStep: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  defaultFont: string;
  defaultStrokeColor: string;
  defaultFillColor: string;
  handDrawnMode: boolean;
}

export interface CanvasVersionRecord {
  id: string;
  canvasId: string;
  label: string;
  sceneData: string;
  thumbnail: string;
  createdAt: number;
}

class VivaCanvasDB extends Dexie {
  canvases!: Table<CanvasRecord>;
  scenes!: Table<CanvasSceneRecord>;
  history!: Table<CanvasHistoryRecord>;
  library!: Table<LibraryItem>;
  settings!: Table<CanvasSettingsRecord>;
  comments!: Table<CanvasComment>;
  variables!: Table<{ canvasId: string; variables: CanvasVariable[] }>;
  versions!: Table<CanvasVersionRecord>;
  thumbnails!: Table<{ id: string; data: string }>;

  constructor() {
    super('VivaCanvasDB');
    this.version(1).stores({
      canvases: 'id, pageId, updatedAt',
      scenes: 'canvasId, version',
      history: 'canvasId',
      library: 'id, category, source',
      settings: 'userId',
      comments: 'id, canvasId, elementId',
      variables: 'canvasId',
      versions: 'id, canvasId, createdAt',
      thumbnails: 'id',
    });
  }
}

export const db = new VivaCanvasDB();

export async function saveScene(canvasId: string, scene: CanvasScene): Promise<void> {
  const json = JSON.stringify(scene);
  const compressed = LZString.compress(json);
  await db.scenes.put({
    canvasId,
    sceneData: compressed,
    version: scene.version,
    checksum: simpleChecksum(json),
  });
  await db.canvases.where('id').equals(canvasId).modify({ updatedAt: Date.now() });
}

export async function loadScene(canvasId: string): Promise<CanvasScene | null> {
  const record = await db.scenes.get(canvasId);
  if (!record) return null;
  try {
    const json = LZString.decompress(record.sceneData);
    if (!json) return null;
    return JSON.parse(json) as CanvasScene;
  } catch {
    return null;
  }
}

export async function createCanvas(name: string, pageId?: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.canvases.put({
    id,
    name,
    pageId: pageId ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: '',
    compressed: true,
  });
  return id;
}

export async function listCanvases(): Promise<CanvasRecord[]> {
  return db.canvases.orderBy('updatedAt').reverse().toArray();
}

export async function deleteCanvas(id: string): Promise<void> {
  await Promise.all([
    db.canvases.delete(id),
    db.scenes.delete(id),
    db.history.delete(id),
  ]);
}

export async function saveLibraryItems(items: LibraryItem[]): Promise<void> {
  await db.library.bulkPut(items);
}

export async function loadLibraryItems(): Promise<LibraryItem[]> {
  return db.library.toArray();
}

export async function deleteLibraryItem(id: string): Promise<void> {
  await db.library.delete(id);
}

export async function saveSettings(settings: CanvasSettingsRecord): Promise<void> {
  await db.settings.put(settings);
}

export async function loadSettings(userId: string): Promise<CanvasSettingsRecord | null> {
  return (await db.settings.get(userId)) ?? null;
}

export async function saveCanvasThumbnail(canvasId: string, thumbnail: string): Promise<void> {
  await db.canvases.where('id').equals(canvasId).modify({ thumbnail });
}

export async function saveVersion(canvasId: string, label: string, scene: CanvasScene, thumbnail: string): Promise<void> {
  await db.versions.put({
    id: crypto.randomUUID(),
    canvasId,
    label,
    sceneData: LZString.compress(JSON.stringify(scene)),
    thumbnail,
    createdAt: Date.now(),
  });
}

export async function loadVersions(canvasId: string): Promise<CanvasVersionRecord[]> {
  return db.versions.where('canvasId').equals(canvasId).reverse().sortBy('createdAt');
}

function simpleChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}
