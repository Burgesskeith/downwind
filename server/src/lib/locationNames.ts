/** Open-Meteo spells this "Mooloolabah"; use the common local spelling. */
export function normalizeLocationName(name: string): string {
  if (/^mooloolabah$/i.test(name.trim())) {
    return "Mooloolaba";
  }
  return name;
}
