import { normalizeLocale } from "@/lib/i18n";

/** Pick the best matching entry from `candidates` for `preferred`, or null. */
export function matchLocaleInList(
  preferred: string,
  candidates: readonly string[]
): string | null {
  if (!candidates.length) {
    return null;
  }
  const norm = normalizeLocale(preferred);
  const exact = candidates.find((l) => normalizeLocale(l) === norm);
  if (exact) {
    return exact;
  }
  const langOnly = norm.split("-")[0]!;
  const partial = candidates.find(
    (l) => normalizeLocale(l).split("-")[0] === langOnly
  );
  return partial ?? null;
}
