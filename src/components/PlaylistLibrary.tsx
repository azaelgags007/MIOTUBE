import {useEffect,useRef,useState} from 'react';
import type {CatalogPage,Track} from '../types';
import {readJson,writeJson} from '../utils/storage';
import {watchUrl} from '../utils/youtube';
interface Props {listId:string; currentPosition:number; onSelect:(track:Track)=>void; onTracks:(items:Track[])=>void; onStatus:(status:'loading'|'ready'|'error')=>void;}
export default function PlaylistLibrary({listId,currentPosition,onSelect,onTracks,onStatus}:Props) {
  const [open,setOpen]=useState(false), [query,setQuery]=useState('');
  const [items,setItems]=useState<Track[]>([]), [next,setNext]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [stamp,setStamp]=useState(''), [notice,setNotice]=useState('');
  const [favorites,setFavorites]=useState<number[]>(()=>{
    const f=readJson<unknown>(`miotube_favorites:${listId}`,[]); return Array.isArray(f)?f.filter(Number.isSafeInteger):[];
  });
  const [onlyFavorites,setOnlyFavorites]=useState(false);
  const abort=useRef<AbortController|null>(null);
  useEffect(()=>{void load();return ()=>abort.current?.abort();},[]);
  async function load(cursor:string|null=null) {
    if(busy) return;
    abort.current?.abort(); const controller=new AbortController(); abort.current=controller;
    setBusy(true);setError('');onStatus('loading');
    try {
      let token=cursor;
      let merged=cursor?items:[];
      for(let pageNumber=0;pageNumber<50;pageNumber++) {
        const params=new URLSearchParams({list:listId});if(token) params.set('cursor',token);
        const response=await fetch(`/api/playlist?${params}`,{signal:controller.signal});
        const page=await response.json() as CatalogPage & {error?:string};
        if(!response.ok || !Array.isArray(page.items)) throw new Error(page.error || 'No se pudo cargar la lista.');
        merged=[...new Map([...merged,...page.items].map(t=>[t.position,t])).values()].sort((a,b)=>a.position-b.position);
        setItems(merged);onTracks(merged);setNext(page.nextCursor);setLoaded(true);
        setStamp(new Date(page.fetchedAt).toLocaleString());setNotice(page.notices?.join(' ')||'');
        if(!page.nextCursor) break;
        if(page.nextCursor===token) throw new Error('YouTube repitió la página. El contenido mostrado es parcial; vuelve a intentarlo.');
        token=page.nextCursor;
      }
      if(!controller.signal.aborted) onStatus('ready');
    } catch(e) {if(!controller.signal.aborted){setError(e instanceof Error?e.message:'No se pudo cargar la lista.');onStatus('error');}}
    finally {if(!controller.signal.aborted) setBusy(false);}
  }
  function toggleFavorite(position:number) {
    const value=favorites.includes(position)?favorites.filter(n=>n!==position):[...favorites,position];
    setFavorites(value);writeJson(`miotube_favorites:${listId}`,value);
  }
  const filtered=items.filter(t=>(!onlyFavorites||favorites.includes(t.position))&&(!query.trim()||(/^\d+$/.test(query.trim())?String(t.position)===String(Number(query.trim())):t.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))));
  return <div className="library">
    <button className="wide" aria-expanded={open} onClick={()=>{setOpen(!open);if(!open&&!loaded) void load();}}>{open?'Ocultar contenido de la lista':'Ver contenido de la lista'}</button>
    {open&&<div className="library-body">
      <div className="row"><input aria-label="Buscar por título o número" placeholder="Buscar por título o número original" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>void load()} disabled={busy}>Actualizar</button></div>
      <label className="check"><input type="checkbox" checked={onlyFavorites} onChange={e=>setOnlyFavorites(e.target.checked)}/> Solo favoritos</label>
      <p className="muted">Se conserva la posición original, incluso al buscar. {items.length} elementos cargados{next?' · hay más por cargar':loaded?' · lista cargada':''}.</p>
      {stamp&&<p className="muted small">Consultado: {stamp}. Si editaste la lista en YouTube, pulsa Actualizar.</p>}
      {notice&&<p role="status" className="notice">{notice}</p>}
      {error&&<div role="alert" className="notice">{error} <button onClick={()=>void load(loaded?next:null)}>Reintentar</button> <a href={watchUrl(listId,null)} target="_blank" rel="noreferrer">Abrir lista en YouTube ↗</a></div>}
      <ol className="track-list">
        {filtered.map(track=><li key={track.position} value={track.position} className={track.position===currentPosition?'current':''}>
          <span className="track-number">{track.position}</span>
          {track.thumbnail&&<img loading="lazy" src={track.thumbnail} alt="" width="96" height="54"/>}
          <button className="track-title" disabled={!track.available} onClick={()=>onSelect(track)} aria-label={`Reproducir ${track.position}: ${track.title}`}>
            <strong>{track.title}</strong><span className="muted small">{track.available?`${track.author} ${track.duration}`:'No disponible en el reproductor'}</span>
          </button>
          <button className="star" aria-label={`${favorites.includes(track.position)?'Quitar de':'Añadir a'} favoritos: ${track.title}`} aria-pressed={favorites.includes(track.position)} onClick={()=>toggleFavorite(track.position)}>{favorites.includes(track.position)?'★':'☆'}</button>
          {track.videoId&&<a className="external" href={watchUrl(listId,track.videoId,track.position)} target="_blank" rel="noreferrer" aria-label={`Abrir ${track.title} en YouTube`}>↗</a>}
        </li>)}
      </ol>
      {loaded&&!filtered.length&&!busy&&<p role="status">{items.length?'No hay coincidencias en los elementos cargados.':'Esta lista no contiene elementos visibles.'}</p>}
      {busy&&<p role="status">Cargando contenido…</p>}
      {next&&<button className="wide" disabled={busy} onClick={()=>void load(next)}>Cargar siguientes elementos</button>}
    </div>}
  </div>;
}
