/**
 * Creates a public asset path with Vite's configured base URL.
 * @param relativePath - Path of the asset relative to the public assets folder.
 * @returns The deployment-safe public path of the requested asset.
 */
export function getAssetPath(relativePath: string): string {
  return `${import.meta.env.BASE_URL}assets/${relativePath}`;
}
