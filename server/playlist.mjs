// Public metadata only. No credentials, private playlists, or media proxying.
export class PlaylistError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
const LIST = /^[A-Za-z0-9_-]{10,100}$/;
const VIDEO = /^[A-Za-z0-9_-]{11}$/;
const string = v => v?.simpleText ?? v?.runs?.map(r => r.text).join('') ?? '';
export function readInitialData(html) {
  for (const prefix of ['var ytInitialData =', 'window["ytInitialData"] =', 'ytInitialData =']) {
    const offset = html.indexOf(prefix);
    if (offset < 0) continue;
    const start = html.indexOf('{', offset + prefix.length);
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < html.length; i++) {
      const c = html[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new PlaylistError('YouTube no entregó el contenido de esta lista. Puede ser privada o estar restringida.');
}
export function extractPage(data) {
  const items = []; let next = null; let title = ''; let hasList = false; const notices = []; const roots = [];
  function findRoots(v) {
    if (!v || typeof v !== 'object') return;
    if (v.playlistVideoListRenderer) {roots.push(v.playlistVideoListRenderer);hasList=true;}
    if (v.appendContinuationItemsAction?.continuationItems) roots.push(v.appendContinuationItemsAction.continuationItems);
    if (v.playlistMetadataRenderer?.title) title=v.playlistMetadataRenderer.title;
    if (v.alertRenderer) notices.push(string(v.alertRenderer.text));
    for (const child of Object.values(v)) {if(Array.isArray(child))child.forEach(findRoots);else if(child&&typeof child==='object')findRoots(child);}
  }
  findRoots(data);
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.playlistVideoListRenderer) hasList = true;
    if (value.playlistMetadataRenderer?.title) title = value.playlistMetadataRenderer.title;
    if (value.alertRenderer) notices.push(string(value.alertRenderer.text));
    const r = value.playlistVideoRenderer;
    if (r) {
      // Use the original rendered index. Never reindex after filtering unavailable items.
      const position = Number(string(r.index).replace(/[^0-9]/g, ''));
      const videoId = VIDEO.test(r.videoId ?? '') ? r.videoId : null;
      if (Number.isSafeInteger(position) && position > 0) items.push({
        position, videoId, title: string(r.title) || 'Video no disponible',
        thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null,
        available: !!videoId && r.isPlayable !== false,
        duration: string(r.lengthText), author: string(r.shortBylineText)
      });
      return;
    }
    const c = value.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (c) next = c;
    for (const v of Object.values(value)) {
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v);
    }
  }
  roots.forEach(visit);
  // Position, not videoId: a playlist may contain the same video more than once.
  return { items: [...new Map(items.map(i => [i.position, i])).values()].sort((a,b) => a.position-b.position), next, title, hasList, notices };
}
async function youtube(url, options = {}) {
  const response = await fetch(url, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(12000),
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'es,en;q=0.8', ...options.headers }
  });
  if (!response.ok) throw new PlaylistError('YouTube no permite consultar la lista en este momento. Inténtalo de nuevo.', response.status === 429 ? 429 : 502);
  const text = await response.text();
  if (text.length > 12_000_000) throw new PlaylistError('La respuesta de YouTube es demasiado grande.');
  return text;
}
export async function getPlaylistPage(listId, cursor) {
  if (!LIST.test(listId ?? '')) throw new PlaylistError('Identificador de lista inválido.', 400);
  let data, version;
  if (cursor) {
    let payload;
    try {
      if (cursor.length > 32000) throw new Error();
      payload = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      if (payload.listId !== listId || typeof payload.token !== 'string' || payload.token.length > 20000 || !/^[0-9.]{5,60}$/.test(payload.version)) throw new Error();
    } catch { throw new PlaylistError('La página de la lista no es válida. Actualiza el contenido.', 400); }
    version = payload.version;
    data = JSON.parse(await youtube('https://www.youtube.com/youtubei/v1/browse', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: version, hl: 'es', gl: 'US' } }, continuation: payload.token })
    }));
  } else {
    const html = await youtube(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}&hl=es`);
    data = readInitialData(html);
    version = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([0-9.]+)"/)?.[1];
  }
  const page = extractPage(data);
  if (!page.items.length && !page.hasList) throw new PlaylistError(page.notices[0] || 'No se pudo consultar esta lista. Comprueba que sea pública o no listada.', 404);
  if (page.next && !version) throw new PlaylistError('YouTube cambió el formato de paginación. Abre la lista en YouTube.');
  return {
    items: page.items, title: page.title, notices: page.notices,
    nextCursor: page.next ? Buffer.from(JSON.stringify({listId, token: page.next, version})).toString('base64url') : null,
    source: 'youtube-public', fetchedAt: new Date().toISOString()
  };
}
