/**
 * usePullToRefresh — iOS/Android-style pull-to-refresh on a scroll container.
 *
 * Returns:
 *  - bind: spread on the scroll container
 *  - pull: current pull distance (0..maxPull) — render a spinner via inline style
 *  - refreshing: true while user's `onRefresh` promise is in flight
 *
 * Pulls only when the container's scrollTop is 0. Uses rubber-band easing.
 */
import { useCallback, useRef, useState } from "react";

interface Options {
  onRefresh: () => Promise<void> | void;
  threshold?: number;       // px to trigger refresh (default 80)
  maxPull?: number;         // visual cap (default 110)
  resistance?: number;      // 0.4 = 40% of finger travel
  enabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPull = 110,
  resistance = 0.45,
  enabled = true,
}: Options) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!enabled || refreshing) return;
    const el = e.currentTarget;
    if (el.scrollTop > 0) { startY.current = null; armed.current = false; return; }
    startY.current = e.touches[0].clientY;
    armed.current = true;
  }, [enabled, refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!armed.current || startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    // Rubber-band easing
    const eased = Math.min(maxPull, dy * resistance);
    setPull(eased);
  }, [maxPull, resistance]);

  const onTouchEnd = useCallback(async () => {
    if (!armed.current) return;
    armed.current = false;
    startY.current = null;
    if (pull >= threshold) {
      setRefreshing(true);
      setPull(threshold);
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, threshold, onRefresh]);

  return {
    pull,
    refreshing,
    progress: Math.min(1, pull / threshold),
    bind: { onTouchStart, onTouchMove, onTouchEnd },
  };
};
