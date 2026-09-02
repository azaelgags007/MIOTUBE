import type { Playlist } from '../types';

const K_PLAYLISTS = 'yt_player_playlists';
const K_ACTIVE_URL = 'yt_player_active_url';
const K_ZOOM = 'yt_player_zoom';

export const DEFAULT_ZOOM = 30;
export const ZOOM_MIN = 8;
export const ZOOM_MAX = 65;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* almacenamiento lleno o bloqueado: se ignora */
  }
}

export function loadPlaylists(): Playlist[] {
  const raw = safeGet(K_PLAYLISTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Playlist =>
        !!p && typeof p.id === 'string' && typeof p.label === 'string' && typeof p.url === 'string'
    );
  } catch {
    return [];
  }
}

export function savePlaylists(playlists: Playlist[]) {
  safeSet(K_PLAYLISTS, JSON.stringify(playlists));
}

export function loadActiveUrl(): string {
  return safeGet(K_ACTIVE_URL) ?? '';
}

export function saveActiveUrl(url: string) {
  safeSet(K_ACTIVE_URL, url);
}

export function loadZoom(): number {
  const raw = safeGet(K_ZOOM);
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_ZOOM;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n)));
}

export function saveZoom(zoom: number) {
  safeSet(K_ZOOM, String(zoom));
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
