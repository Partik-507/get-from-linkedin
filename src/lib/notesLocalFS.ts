// ─── Local File System CRUD Engine ────────────────────────────────────────────
// Mirror of notesFirestore.ts but reads/writes directly to the user's local folder
// using the File System Access API.
//
// Folder structure on disk:
//   <chosen-folder>/
//     vv-metadata.json        ← master ledger: { notes: [...], folders: [...] }
//     contents/
//       <noteId>.html         ← TipTap HTML content per note

import type { NoteMetadata, FolderItem } from "./notesFirestore";

// ────────────── Helpers ──────────────────────────────────────────────────────

async function getOrCreateSubDir(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  return parent.getDirectoryHandle(name, { create: true });
}

async function readJsonFile<T>(dir: FileSystemDirectoryHandle, filename: string, fallback: T): Promise<T> {
  try {
    const fh = await dir.getFileHandle(filename, { create: false });
    const file = await fh.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(dir: FileSystemDirectoryHandle, filename: string, data: unknown): Promise<void> {
  const fh = await dir.getFileHandle(filename, { create: true });
  // @ts-ignore — createWritable is available in Chromium
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readTextFile(dir: FileSystemDirectoryHandle, filename: string): Promise<string> {
  try {
    const fh = await dir.getFileHandle(filename, { create: false });
    const file = await fh.getFile();
    return await file.text();
  } catch {
    return "";
  }
}

async function writeTextFile(dir: FileSystemDirectoryHandle, filename: string, content: string): Promise<void> {
  const fh = await dir.getFileHandle(filename, { create: true });
  // @ts-ignore
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
}

async function deleteFile(dir: FileSystemDirectoryHandle, filename: string): Promise<void> {
  try {
    await dir.removeEntry(filename);
  } catch { /* file may not exist */ }
}

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ────────────── Metadata Ledger ──────────────────────────────────────────────

interface VaultLedger {
  notes: NoteMetadata[];
  folders: FolderItem[];
}

const LEDGER_FILE = "vv-metadata.json";
const CONTENTS_DIR = "contents";

async function readLedger(root: FileSystemDirectoryHandle): Promise<VaultLedger> {
  return readJsonFile<VaultLedger>(root, LEDGER_FILE, { notes: [], folders: [] });
}

async function writeLedger(root: FileSystemDirectoryHandle, ledger: VaultLedger): Promise<void> {
  await writeJsonFile(root, LEDGER_FILE, ledger);
}

// ────────────── NOTES CRUD ───────────────────────────────────────────────────

export async function localFetchNoteMetadata(root: FileSystemDirectoryHandle): Promise<NoteMetadata[]> {
  const ledger = await readLedger(root);
  return ledger.notes;
}

export async function localFetchNoteContent(root: FileSystemDirectoryHandle, noteId: string): Promise<string> {
  const contentsDir = await getOrCreateSubDir(root, CONTENTS_DIR);
  return readTextFile(contentsDir, `${noteId}.html`);
}

export async function localCreateNote(
  root: FileSystemDirectoryHandle,
  data: Partial<NoteMetadata>,
  content = ""
): Promise<NoteMetadata> {
  const ledger = await readLedger(root);
  const now = nowIso();
  const plainText = content.replace(/<[^>]+>/g, "");

  const note: NoteMetadata = {
    id: generateId(),
    title: data.title || "Untitled",
    folderId: data.folderId || "root",
    parentNoteId: data.parentNoteId,
    tags: data.tags || [],
    type: data.type || "document",
    wordCount: plainText.split(/\s+/).filter(Boolean).length,
    characterCount: plainText.length,
    isPinned: false,
    isPublic: false,
    status: "draft",
    icon: data.icon || "",
    coverImage: data.coverImage || "",
    linkedNoteIds: [],
    properties: data.properties || {},
    version: 0,
    isArchived: false,
    courseId: data.courseId || "",
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };

  ledger.notes.push(note);
  await writeLedger(root, ledger);

  // Write content file
  if (content) {
    const contentsDir = await getOrCreateSubDir(root, CONTENTS_DIR);
    await writeTextFile(contentsDir, `${note.id}.html`, content);
  }

  return note;
}

export async function localUpdateNoteMetadata(
  root: FileSystemDirectoryHandle,
  noteId: string,
  data: Partial<NoteMetadata>
): Promise<void> {
  const ledger = await readLedger(root);
  const idx = ledger.notes.findIndex(n => n.id === noteId);
  if (idx === -1) return;
  ledger.notes[idx] = { ...ledger.notes[idx], ...data, updatedAt: nowIso() };
  await writeLedger(root, ledger);
}

export async function localSaveNoteContent(
  root: FileSystemDirectoryHandle,
  noteId: string,
  content: string
): Promise<void> {
  const contentsDir = await getOrCreateSubDir(root, CONTENTS_DIR);
  await writeTextFile(contentsDir, `${noteId}.html`, content);

  // Update word/char count
  const plainText = content.replace(/<[^>]+>/g, "");
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const characterCount = plainText.length;
  await localUpdateNoteMetadata(root, noteId, { wordCount, characterCount });
}

export async function localDeleteNote(
  root: FileSystemDirectoryHandle,
  noteId: string,
  permanent = false
): Promise<void> {
  const ledger = await readLedger(root);
  if (permanent) {
    ledger.notes = ledger.notes.filter(n => n.id !== noteId);
    const contentsDir = await getOrCreateSubDir(root, CONTENTS_DIR);
    await deleteFile(contentsDir, `${noteId}.html`);
  } else {
    const idx = ledger.notes.findIndex(n => n.id === noteId);
    if (idx !== -1) {
      ledger.notes[idx].deletedAt = nowIso();
    }
  }
  await writeLedger(root, ledger);
}

export async function localRestoreNote(
  root: FileSystemDirectoryHandle,
  noteId: string
): Promise<void> {
  const ledger = await readLedger(root);
  const idx = ledger.notes.findIndex(n => n.id === noteId);
  if (idx !== -1) {
    ledger.notes[idx].deletedAt = null;
    ledger.notes[idx].updatedAt = nowIso();
  }
  await writeLedger(root, ledger);
}

// ────────────── FOLDERS CRUD ─────────────────────────────────────────────────

export async function localFetchFolders(root: FileSystemDirectoryHandle): Promise<FolderItem[]> {
  const ledger = await readLedger(root);
  return ledger.folders;
}

export async function localCreateFolder(
  root: FileSystemDirectoryHandle,
  name: string,
  parentId = "root",
  order = 0
): Promise<FolderItem> {
  const ledger = await readLedger(root);
  const folder: FolderItem = {
    id: generateId(),
    name,
    parentId,
    order,
  };
  ledger.folders.push(folder);
  await writeLedger(root, ledger);
  return folder;
}

export async function localUpdateFolder(
  root: FileSystemDirectoryHandle,
  folderId: string,
  data: Partial<FolderItem>
): Promise<void> {
  const ledger = await readLedger(root);
  const idx = ledger.folders.findIndex(f => f.id === folderId);
  if (idx === -1) return;
  ledger.folders[idx] = { ...ledger.folders[idx], ...data };
  await writeLedger(root, ledger);
}

export async function localDeleteFolder(
  root: FileSystemDirectoryHandle,
  folderId: string
): Promise<void> {
  const ledger = await readLedger(root);
  ledger.folders = ledger.folders.filter(f => f.id !== folderId);
  // Also move notes in this folder to root
  ledger.notes = ledger.notes.map(n =>
    n.folderId === folderId ? { ...n, folderId: "root", updatedAt: nowIso() } : n
  );
  await writeLedger(root, ledger);
}
