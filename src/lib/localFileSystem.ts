import { get, set, del } from "idb-keyval";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
}

export interface LocalNote {
  id: string; // path-based ID
  title: string;
  path: string;
  parentPath: string;
  content: string;
  children: string[]; // child page paths
  lastModified: number;
  handle: FileSystemFileHandle;
}

const DIR_HANDLE_KEY = "vv_local_dir_handle";
const ASSETS_DIR = "_assets";

// ─── Handle Persistence ─────────────────────────────────────────────────────

export const getStoredDirHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const handle = await get<FileSystemDirectoryHandle>(DIR_HANDLE_KEY);
    if (handle) {
      // Verify permission
      const perm = await (handle as any).queryPermission({ mode: "readwrite" });
      if (perm === "granted") return handle;
      const req = await (handle as any).requestPermission({ mode: "readwrite" });
      if (req === "granted") return handle;
    }
    return null;
  } catch {
    return null;
  }
};

export const pickDirectory = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    await set(DIR_HANDLE_KEY, handle);
    return handle;
  } catch {
    return null;
  }
};

export const clearStoredHandle = async () => {
  await del(DIR_HANDLE_KEY);
};

// ─── File System Access API Check ───────────────────────────────────────────

export const isFileSystemAccessSupported = (): boolean => {
  return "showDirectoryPicker" in window;
};

// ─── Directory Reading ──────────────────────────────────────────────────────

export const readDirectoryTree = async (
  dirHandle: FileSystemDirectoryHandle,
  parentPath = ""
): Promise<FileNode[]> => {
  const nodes: FileNode[] = [];
  
  for await (const entry of (dirHandle as any).values()) {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    
    // Skip hidden files and _assets
    if (entry.name.startsWith(".") || entry.name === ASSETS_DIR) continue;
    
    if (entry.kind === "directory") {
      const children = await readDirectoryTree(entry, path);
      nodes.push({ name: entry.name, path, type: "directory", children, handle: entry });
    } else if (entry.kind === "file" && (entry.name.endsWith(".md") || entry.name.endsWith(".txt"))) {
      nodes.push({ name: entry.name.replace(/\.(md|txt)$/, ""), path, type: "file", handle: entry });
    }
  }
  
  // Sort: directories first, then files, alphabetically
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  
  return nodes;
};

// ─── File CRUD ──────────────────────────────────────────────────────────────

export const readFile = async (fileHandle: FileSystemFileHandle): Promise<string> => {
  const file = await fileHandle.getFile();
  return file.text();
};

export const writeFile = async (fileHandle: FileSystemFileHandle, content: string): Promise<void> => {
  const writable = await (fileHandle as any).createWritable();
  await writable.write(content);
  await writable.close();
};

export const createFile = async (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<FileSystemFileHandle> => {
  const name = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  return dirHandle.getFileHandle(name, { create: true });
};

export const createDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
  dirName: string
): Promise<FileSystemDirectoryHandle> => {
  return dirHandle.getDirectoryHandle(dirName, { create: true });
};

export const deleteEntry = async (
  parentDirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<void> => {
  await (parentDirHandle as any).removeEntry(name, { recursive: true });
};

export const renameFile = async (
  parentDirHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<FileSystemFileHandle> => {
  // Read old file
  const oldHandle = await parentDirHandle.getFileHandle(oldName);
  const content = await readFile(oldHandle);
  
  // Create new file
  const newHandle = await createFile(parentDirHandle, newName);
  await writeFile(newHandle, content);
  
  // Delete old file
  await deleteEntry(parentDirHandle, oldName);
  
  return newHandle;
};

// ─── Navigate to subdirectory by path ───────────────────────────────────────

export const getSubdirectory = async (
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemDirectoryHandle> => {
  if (!path || path === ".") return rootHandle;
  const parts = path.split("/").filter(Boolean);
  let current = rootHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: false });
  }
  return current;
};

export const getOrCreateSubdirectory = async (
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemDirectoryHandle> => {
  if (!path || path === ".") return rootHandle;
  const parts = path.split("/").filter(Boolean);
  let current = rootHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
};

// ─── Assets ─────────────────────────────────────────────────────────────────

export const getAssetsDir = async (
  rootHandle: FileSystemDirectoryHandle
): Promise<FileSystemDirectoryHandle> => {
  return rootHandle.getDirectoryHandle(ASSETS_DIR, { create: true });
};

export const saveImageToAssets = async (
  rootHandle: FileSystemDirectoryHandle,
  blob: Blob,
  fileName: string
): Promise<string> => {
  const assetsDir = await getAssetsDir(rootHandle);
  const fileHandle = await assetsDir.getFileHandle(fileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(blob);
  await writable.close();
  // Return a blob URL for display
  const file = await fileHandle.getFile();
  return URL.createObjectURL(file);
};

// ─── Markdown <-> HTML conversion helpers ───────────────────────────────────

export const htmlToMarkdown = async (html: string): Promise<string> => {
  const { default: TurndownService } = await import("turndown");
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  // Add rules for task lists
  td.addRule("taskList", {
    filter: (node) => node.nodeName === "LI" && node.querySelector('input[type="checkbox"]') !== null,
    replacement: (_content, node) => {
      const checkbox = (node as HTMLElement).querySelector('input[type="checkbox"]');
      const checked = checkbox?.hasAttribute("checked") ? "x" : " ";
      const text = _content.replace(/^\s*\[.\]\s*/, "").trim();
      return `- [${checked}] ${text}\n`;
    },
  });
  return td.turndown(html);
};

export const markdownToHtml = async (md: string): Promise<string> => {
  const { marked } = await import("marked");
  return marked(md, { async: false }) as string;
};

// ─── Version Snapshots (IndexedDB) ──────────────────────────────────────────

interface LocalVersionSnapshot {
  path: string;
  content: string;
  title: string;
  timestamp: number;
}

const VERSION_PREFIX = "vv_version_";

export const saveLocalVersion = async (path: string, content: string, title: string) => {
  const key = `${VERSION_PREFIX}${path}`;
  const existing = (await get<LocalVersionSnapshot[]>(key)) || [];
  existing.unshift({ path, content, title, timestamp: Date.now() });
  // Keep last 20
  await set(key, existing.slice(0, 20));
};

export const getLocalVersions = async (path: string): Promise<LocalVersionSnapshot[]> => {
  const key = `${VERSION_PREFIX}${path}`;
  return (await get<LocalVersionSnapshot[]>(key)) || [];
};
