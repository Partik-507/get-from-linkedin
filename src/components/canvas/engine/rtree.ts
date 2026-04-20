import RBush from 'rbush';
import type { AnyElement } from '../elements/types';

interface BBoxItem {
  minX: number; minY: number; maxX: number; maxY: number; id: string;
}

class CanvasRTree {
  private tree = new RBush<BBoxItem>();
  private items = new Map<string, BBoxItem>();

  insert(el: AnyElement) {
    const bbox = this.elementBBox(el);
    this.remove(el.id);
    this.tree.insert(bbox);
    this.items.set(el.id, bbox);
  }

  remove(id: string) {
    const item = this.items.get(id);
    if (item) {
      this.tree.remove(item, (a, b) => a.id === b.id);
      this.items.delete(id);
    }
  }

  update(el: AnyElement) {
    this.insert(el);
  }

  query(minX: number, minY: number, maxX: number, maxY: number): string[] {
    return this.tree.search({ minX, minY, maxX, maxY }).map(i => i.id);
  }

  clear() {
    this.tree.clear();
    this.items.clear();
  }

  rebuild(elements: AnyElement[]) {
    this.clear();
    const bboxes: BBoxItem[] = elements.map(el => this.elementBBox(el));
    this.tree.load(bboxes);
    for (let i = 0; i < elements.length; i++) {
      this.items.set(elements[i].id, bboxes[i]);
    }
  }

  private elementBBox(el: AnyElement): BBoxItem {
    const pad = 8;
    return {
      minX: el.x - pad,
      minY: el.y - pad,
      maxX: el.x + el.width + pad,
      maxY: el.y + el.height + pad,
      id: el.id,
    };
  }
}

export const rtree = new CanvasRTree();
