import { environment } from '../../environments/environment';

/**
 * Build a full API URL by combining the configured base with the provided path.
 * Automatically normalizes slashes and prevents duplicate `api` segments.
 */
export function buildApiUrl(path: string = ''): string {
  const base = (environment.apiBaseUrl || '').replace(/\/+$/, '');
  let trimmedPath = `${path ?? ''}`.trim().replace(/^\/+/, '');

  if (!trimmedPath) {
    return base;
  }

  const baseHasApiSegment = /\/api(?:\/|$)/i.test(base);
  const pathHasApiSegment = /^api(?:\/|$)/i.test(trimmedPath);

  if (baseHasApiSegment && pathHasApiSegment) {
    trimmedPath = trimmedPath.replace(/^api\/?/i, '');
  }

  const finalPath = baseHasApiSegment || pathHasApiSegment ? trimmedPath : `api/${trimmedPath}`;
  return finalPath ? `${base}/${finalPath}` : base;
}
