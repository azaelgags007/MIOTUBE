export interface Playlist {
  id: string; // crypto.randomUUID()
  label: string; // nombre corto del boton, max ~12 caracteres
  url: string; // URL de YouTube
}

export type PanelState = 'hidden' | 'bar' | 'expanded';
