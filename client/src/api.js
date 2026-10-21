const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/i, '')
  : '';

export function apiUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || !API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(path, options) {
  const isApiRoute = typeof path === 'string' && path.startsWith('/api/');

  const response = await globalThis.fetch(apiUrl(path), options);
  const expectsJson = isApiRoute && new URL(path, window.location.origin).searchParams.get('format') !== 'csv';

  if (expectsJson && !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`The backend returned a non-JSON response (HTTP ${response.status}). Check the Vercel /api route or VITE_API_URL.`);
  }

  return response;
}