/**
 * useScrollDirection — Tracks scroll direction inside a container or window.
 *
 * Returns "up" | "down" | "idle" based on scroll deltas above a threshold.
 * Use to auto-hide/show navigation bars natively (Flipkart/Twitter pattern).
 */

import { useEffect, useState, useRef } from "react";

type Direction = "up" | "down" | "idle";

export const useScrollDirection = (
  threshold = 8,
  target?: HTMLElement | null,
) => {
  const [direction, setDirection] = useState<Direction>("idle");
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const el: HTMLElement | Window = target || window;
    const getY = () =>
      target ? (target as HTMLElement).scrollTop : window.scrollY;

    lastY.current = getY();

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = getY();
        const delta = y - lastY.current;
        setAtTop(y < 4);
        if (Math.abs(delta) > threshold) {
          setDirection(delta > 0 ? "down" : "up");
          lastY.current = y;
        }
        ticking.current = false;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll as EventListener);
  }, [threshold, target]);

  return { direction, atTop, hidden: direction === "down" && !atTop };
};
