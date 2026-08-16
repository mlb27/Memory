/** Returns a public asset path with Vite's configured base URL. */
export function getAssetPath(relativePath: string): string {
  return `${import.meta.env.BASE_URL}assets/${relativePath}`;
}
