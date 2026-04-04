"use client";

import { useEffect, useRef, useState } from "react";

type ChartSize = {
  width: number;
  height: number;
  ready: boolean;
};

export function useChartSize(minHeight: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<ChartSize>({
    width: 0,
    height: minHeight,
    ready: false,
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateSize = (width: number, height: number) => {
      const nextWidth = Math.max(Math.floor(width), 0);
      const nextHeight = Math.max(Math.floor(height), minHeight);

      setSize((current) => {
        if (
          current.width === nextWidth &&
          current.height === nextHeight &&
          current.ready === (nextWidth > 0)
        ) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
          ready: nextWidth > 0,
        };
      });
    };

    const rect = element.getBoundingClientRect();
    updateSize(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [minHeight]);

  return {
    ref,
    ...size,
  };
}
