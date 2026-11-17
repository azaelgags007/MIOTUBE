export interface Playlist {
  id: string; // crypto.randomUUID()
  label: string; // nombre corto del boton, max ~12 caracteres
  url: string; // URL de YouTube
}

export type PanelState = 'hidden' | 'bar' | 'expanded';

export interface Track {
  position: number;
  videoId: string | null;
  title: string;
  thumbnail: string | null;
  available: boolean;
  duration: string;
  author: string;
}
export interface Bookmark { position: number; videoId: string | null; seconds: number; updatedAt: number; }
export interface CatalogPage {items: Track[]; nextCursor: string | null; title: string; fetchedAt: string; notices: string[]; }
