import { getPlaylistPage, PlaylistError } from '../server/playlist.mjs';
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({error:'Método no permitido.'}); }
  const url = new URL(req.url, 'http://localhost');
  try {
    const page = await getPlaylistPage(url.searchParams.get('list'), url.searchParams.get('cursor'));
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(page);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(e instanceof PlaylistError ? e.status : 502).json({error: e instanceof PlaylistError ? e.message : 'No se pudo conectar con YouTube. Puedes reintentar o abrir la lista allí.'});
  }
}
