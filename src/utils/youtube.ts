export function parseYouTubeUrl(url: string): { listId: string | null; embedUrl: string | null } {
  try {
    const p = new URL(url.trim());
    const list = p.searchParams.get('list');
    const v = p.searchParams.get('v');

    if (p.hostname.includes('youtu.be')) {
      const vid = p.pathname.replace('/', '').trim();
      const base = `https://www.youtube.com/embed/${vid}?autoplay=1&enablejsapi=1`;
      return { listId: list, embedUrl: vid ? (list ? `${base}&list=${list}` : base) : null };
    }
    if (list) {
      return {
        listId: list,
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1&enablejsapi=1`
      };
    }
    if (v) {
      return { listId: null, embedUrl: `https://www.youtube.com/embed/${v}?autoplay=1&enablejsapi=1` };
    }
    if (p.pathname.includes('/embed/')) return { listId: list, embedUrl: url };
    return { listId: null, embedUrl: null };
  } catch {
    return { listId: null, embedUrl: null };
  }
}
