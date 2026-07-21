/**
 * Lightweight className combiner. Falsy values are dropped.
 * Kept dependency-free so the ui/ primitives don't require clsx/tailwind-merge.
 */
export function cn(...values) {
  return values
    .flat()
    .filter(Boolean)
    .join(" ");
}
