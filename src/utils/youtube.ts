export interface YouTubeSource { listId: string | null; videoId: string | null; embedUrl: string | null; key: string; }
export function parseYouTubeUrl(raw: string): YouTubeSource {
  const invalid = { listId:null, videoId:null, embedUrl:null, key:'' };
  try {
    const url = new URL(raw.trim());
    if (!['https:', 'http:'].includes(url.protocol) || !['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtube-nocookie.com','youtube-nocookie.com'].includes(url.hostname)) return invalid;
    const list = url.searchParams.get('list');
    if (list && !/^[A-Za-z0-9_-]{10,100}$/.test(list)) return invalid;
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1] ?? null;
    const videoId = id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    if (!list && !videoId) return invalid;
    return { listId:list, videoId, key:list ? `list:${list}` : `video:${videoId}`, embedUrl:`https://www.youtube.com/embed/${list ? 'videoseries' : videoId}?enablejsapi=1${list ? `&list=${list}` : ''}` };
  } catch { return invalid; }
}
export function watchUrl(listId: string | null, videoId: string | null, position = 1, seconds = 0) {
  const url = new URL(videoId ? 'https://www.youtube.com/watch' : 'https://www.youtube.com/playlist');
  if (videoId) url.searchParams.set('v', videoId);
  if (listId) { url.searchParams.set('list',listId); url.searchParams.set('index',String(position)); }
  if (seconds > 0 && videoId) url.searchParams.set('t',String(Math.floor(seconds)));
  return url.href;
}
