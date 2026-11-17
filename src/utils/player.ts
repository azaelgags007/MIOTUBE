export interface YTPlayer {
  playVideo(): void; pauseVideo(): void; previousVideo(): void; nextVideo(): void;
  playVideoAt(index: number): void;
  loadPlaylist(options: {list: string; listType: string; index?: number; startSeconds?: number}): void;
  loadVideoById(options: {videoId: string; startSeconds?: number}): void;
  getPlaylist(): string[]; getPlaylistIndex(): number; getCurrentTime(): number;
  getVideoData(): {video_id?: string; title?: string}; getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void; destroy(): void; getIframe(): HTMLIFrameElement;
}
interface YTNamespace { Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer; }
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void; } }
let loading: Promise<YTNamespace> | null = null;
export function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => { loading = null; reject(new Error('No se pudo cargar YouTube. Revisa tu conexión y reintenta.')); }, 18000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); previous?.(); if (window.YT) resolve(window.YT); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { clearTimeout(timer); loading = null; script.remove(); reject(new Error('No se pudo conectar con YouTube.')); };
    document.head.append(script);
  });
  return loading;
}
