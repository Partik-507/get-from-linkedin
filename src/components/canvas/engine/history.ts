import type { AnyElement } from '../elements/types';

const MAX_HISTORY = 500;

export interface HistoryEntry {
  elements: AnyElement[];
  description: string;
  timestamp: number;
}

export class HistoryManager {
  private stack: HistoryEntry[] = [];
  private index = -1;
  private onChangeCallback: (() => void) | null = null;

  onChange(cb: () => void) { this.onChangeCallback = cb; }

  push(elements: AnyElement[], description: string) {
    // Truncate any redo entries
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push({ elements: this.cloneElements(elements), description, timestamp: Date.now() });
    if (this.stack.length > MAX_HISTORY) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;
    this.onChangeCallback?.();
  }

  undo(currentElements: AnyElement[]): AnyElement[] | null {
    if (this.index <= 0) return null;
    if (this.index === this.stack.length - 1) {
      // Save current state as "redo" point if not already there
      this.stack.push({ elements: this.cloneElements(currentElements), description: 'current', timestamp: Date.now() });
    }
    this.index--;
    const entry = this.stack[this.index];
    this.onChangeCallback?.();
    return this.cloneElements(entry.elements);
  }

  redo(): AnyElement[] | null {
    if (this.index >= this.stack.length - 1) return null;
    this.index++;
    const entry = this.stack[this.index];
    this.onChangeCallback?.();
    return this.cloneElements(entry.elements);
  }

  canUndo() { return this.index > 0; }
  canRedo() { return this.index < this.stack.length - 1; }

  getStack() { return this.stack.slice(0, this.index + 1); }
  getCurrentIndex() { return this.index; }

  private cloneElements(elements: AnyElement[]): AnyElement[] {
    return elements.map(el => ({ ...el }));
  }

  clear() {
    this.stack = [];
    this.index = -1;
  }
}

export const historyManager = new HistoryManager();
