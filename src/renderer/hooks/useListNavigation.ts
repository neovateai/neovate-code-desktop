import { useCallback, useEffect, useState } from 'react';

export function useListNavigation<T>(items: T[]) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  const navigateNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const navigatePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const reset = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  const getSelected = useCallback(() => {
    return items[selectedIndex] ?? null;
  }, [items, selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    navigateNext,
    navigatePrevious,
    reset,
    getSelected,
  };
}
