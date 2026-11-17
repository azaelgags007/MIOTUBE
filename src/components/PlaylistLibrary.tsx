import {useEffect,useRef,useState} from 'react';
import type {CatalogPage,Track} from '../types';
import {readJson,writeJson} from '../utils/storage';
import {watchUrl} from '../utils/youtube';
import Icon from './Icon';
import Popover from './Popover';
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
  const [expanded,setExpanded]=useState<number[]>([]);
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
    <div className="library-heading">
      <button className="library-toggle" aria-label={open?'Ocultar contenido de la lista':'Ver contenido de la lista'} aria-expanded={open} onClick={()=>{setOpen(!open);if(!open&&!loaded)void load();}}><span>Contenido <span className="count">{items.length}</span></span><Icon name={open?'up':'down'} size={17}/></button>
      <Popover label="Información de la lista" icon="info">
        <p className="menu-label">Acerca del contenido</p><p className="info-copy">Los números conservan la posición original de YouTube, incluso al buscar. Los videos no disponibles no renumeran la lista.</p>
        <p className="info-copy">{loaded?`${items.length} elementos cargados${next?' · faltan páginas':''}.`:'Consultando contenido.'}</p>
        {stamp&&<p className="info-copy">Actualizado: {stamp}. Si editaste la lista, pulsa Actualizar.</p>}
      </Popover>
    </div>
    {open&&<div className="library-body">
      <div className="search-tools">
        <div className="search-box"><Icon name="search" size={18}/><input type="search" aria-label="Buscar por título o número" placeholder="Buscar título o n.º" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <button className={`icon-button favorite-filter ${onlyFavorites?'active':''}`} aria-label="Solo favoritos" aria-pressed={onlyFavorites} title="Solo favoritos" onClick={()=>setOnlyFavorites(v=>!v)}><Icon name="star" filled={onlyFavorites}/></button>
        <button className="icon-button" aria-label="Actualizar" title="Actualizar lista" onClick={()=>void load()} disabled={busy}><Icon name="refresh"/></button>
      </div>
      {notice&&<p role="status" className="notice">{notice}</p>}
      {error&&<div role="alert" className="notice">{error} <button onClick={()=>void load(loaded?next:null)}>Reintentar</button> <a href={watchUrl(listId,null)} target="_blank" rel="noreferrer">Abrir lista en YouTube ↗</a></div>}
      <ol className="track-list">
        {filtered.map(track=><li key={track.position} value={track.position} className={`${track.position===currentPosition?'current':''} ${expanded.includes(track.position)?'expanded':''}`}>
          <span className="track-number">{track.position}</span>
          {track.thumbnail?<img loading="lazy" src={track.thumbnail} alt="" width="96" height="54"/>:<span className="track-placeholder"><Icon name="play" size={17}/></span>}
          <button className="track-title" disabled={!track.available} onClick={()=>onSelect(track)} aria-label={`Reproducir ${track.position}: ${track.title}`}>
            <strong>{track.title}</strong><span className="track-meta">{track.available?`${track.author}${track.author&&track.duration?' · ':''}${track.duration}`:'No disponible'}</span>
          </button>
          <button className="star icon-button" aria-label={`${favorites.includes(track.position)?'Quitar de':'Añadir a'} favoritos: ${track.title}`} aria-pressed={favorites.includes(track.position)} onClick={()=>toggleFavorite(track.position)}><Icon name="star" size={18} filled={favorites.includes(track.position)}/></button>
          <Popover className="track-menu" label={`Opciones de ${track.title}`}>
            <button className="menu-item" onClick={()=>setExpanded(v=>v.includes(track.position)?v.filter(n=>n!==track.position):[...v,track.position])}>{expanded.includes(track.position)?'Acortar título':'Ver título completo'}</button>
            {track.videoId&&<a className="menu-item" href={watchUrl(listId,track.videoId,track.position)} target="_blank" rel="noreferrer"><Icon name="external" size={17}/>Abrir en YouTube</a>}
          </Popover>
        </li>)}
      </ol>
      {loaded&&!filtered.length&&!busy&&<p className="muted empty-results" role="status">{items.length?'No hay coincidencias en los elementos cargados.':'Esta lista no contiene elementos visibles.'}</p>}
      {busy&&<p role="status" className="muted loading-line"><span className="loading-dot"/>Cargando contenido…</p>}
      {next&&<button className="load-more" disabled={busy} onClick={()=>void load(next)}>Cargar siguientes elementos</button>}
    </div>}
  </div>;
}
