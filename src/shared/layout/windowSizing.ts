export function computeEnsuredWindowWidth({
  currentWidth,
  minWidth,
  maxWidth,
}: {
  currentWidth: number;
  minWidth: number;
  maxWidth: number;
}): { target: number; appliedWidth: number } {
  const target = Math.min(minWidth, maxWidth);
  const appliedWidth = Math.max(currentWidth, target);
  return { target, appliedWidth };
}
