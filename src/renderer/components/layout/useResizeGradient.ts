import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { type PanelId, useAppLayoutPanels } from './AppLayoutProvider';

/**
 * Creates the gradient style for the resize indicator
 * - Hover: 50% primary color
 * - Dragging: 100% primary color
 */
function getResizeGradientStyle(
  mouseY: number | null,
  isDragging: boolean,
): CSSProperties {
  const intensity = isDragging ? 1 : 0.5;

  return {
    transition: 'opacity 150ms ease-out',
    opacity: mouseY !== null ? 1 : 0,
    background: `radial-gradient(
      circle 66vh at 50% ${mouseY ?? 0}px,
      color-mix(in oklch, var(--primary) ${intensity * 100}%, transparent) 0%,
      color-mix(in oklch, var(--primary) ${intensity * 50}%, transparent) 30%,
      transparent 70%
    )`,
  };
}

/**
 * useResizeGradient - Hook for resize handle gradient that follows cursor
 *
 * Uses the provider's `resizing` state as the single source of truth for drag state.
 *
 * @param panelId - The panel this resize handle controls
 */
export function useResizeGradient(panelId: PanelId) {
  const { resizing } = useAppLayoutPanels();
  const isDragging = resizing === panelId;

  const [mouseY, setMouseY] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setMouseY(e.clientY - rect.top);
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!isDragging) {
      setMouseY(null);
    }
  }, [isDragging]);

  // Track mouse position during drag (global listener for when cursor leaves element)
  useEffect(() => {
    if (!isDragging) {
      setMouseY(null);
      return;
    }

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setMouseY(e.clientY - rect.top);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  const gradientStyle = useMemo(
    () => getResizeGradientStyle(mouseY, isDragging),
    [mouseY, isDragging],
  );

  return {
    ref,
    handlers: { onMouseMove, onMouseLeave },
    gradientStyle,
  };
}
