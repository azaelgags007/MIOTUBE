import {useEffect,useRef,useState} from 'react';
import type {Bookmark,Playlist,Track} from '../types';
import {parseYouTubeUrl,watchUrl} from '../utils/youtube';
import {loadBookmark,writeJson,ZOOM_MAX,ZOOM_MIN} from '../utils/storage';
import {loadYouTube,type YTPlayer} from '../utils/player';
import {queueIndexForTrack,trackForQueueIndex} from '../utils/positions';
import PlaylistLibrary from './PlaylistLibrary';
import Icon from './Icon';
import Popover from './Popover';
interface Props {
  playlists:Playlist[];activeUrl:string;onSelectUrl:(url:string)=>void;
  zoom:number;onZoomChange:(zoom:number)=>void;onGoToConfig:()=>void;onReturn:()=>void;
  theme:'white'|'black';onThemeChange:(theme:'white'|'black')=>void;
}
interface Target {position:number;videoId:string|null;seconds:number;}
export default function PlayerPanel({playlists,activeUrl,onSelectUrl,zoom,onZoomChange,onGoToConfig,onReturn,theme,onThemeChange}:Props) {
  const source=parseYouTubeUrl(activeUrl);
  const [started,setStarted]=useState(false),[ready,setReady]=useState(false),[compact,setCompact]=useState(false);
  const [isPlaying,setIsPlaying]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[title,setTitle]=useState('');
  const [number,setNumber]=useState('1'),[position,setPosition]=useState(1),[videoId,setVideoId]=useState<string|null>(source.videoId);
  const [bookmark]=useState(()=>loadBookmark(source.key));
  const [needsResume,setNeedsResume]=useState(false),[retry,setRetry]=useState(0);
  const [catalogStatus,setCatalogStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [catalog,setCatalog]=useState<Track[]>([]),[pipSupported,setPipSupported]=useState(false);
  const player=useRef<YTPlayer|null>(null), mount=useRef<HTMLDivElement>(null);
  const host=useRef<HTMLDivElement>(null),slot=useRef<HTMLDivElement>(null);
  const pending=useRef<Target|null>(null),tracks=useRef<Track[]>([]),last=useRef<Bookmark|null>(bookmark);
  const pip=useRef<Window|null>(null),playing=useRef(false),readyRef=useRef(false);
  tracks.current=catalog;
  useEffect(()=>{setPipSupported('documentPictureInPicture' in window);},[]);
  function capture() {
    const p=player.current;if(!p || !readyRef.current) return;
    try {
      const data=p.getVideoData(),queue=p.getPlaylist()||[],idx=p.getPlaylistIndex();
      if(!data.video_id || p.getPlayerState()===-1 || p.getPlayerState()===5 || pending.current) return;
      const track=trackForQueueIndex(queue,idx,tracks.current);
      const pos=track?.position ?? Math.max(1,idx+1);
      const b:Bookmark={position:pos,videoId:data.video_id,seconds:Math.max(0,p.getCurrentTime()||0),updatedAt:Date.now()};
      last.current=b;writeJson(`miotube_bookmark:${source.key}`,b);
      setPosition(pos);setVideoId(data.video_id);setTitle(data.title||'');
    } catch { /* Player may be initializing or being destroyed. */ }
  }
  function applyPending() {
    const target=pending.current,p=player.current;if(!target||!p||!readyRef.current) return;
    try {
      if(source.listId) {
        const queue=p.getPlaylist()||[]; if(!queue.length) return;
        const track=tracks.current.find(t=>t.position===target.position && (!target.videoId||t.videoId===target.videoId));
        const index=track?queueIndexForTrack(queue,track,tracks.current):target.videoId?(queue[target.position-1]===target.videoId?target.position-1:queue.indexOf(target.videoId)):target.position-1;
        if(index<0 || index>=queue.length) { pending.current=null;setError('Ese elemento no está disponible en el reproductor. Consulta el contenido o ábrelo en YouTube.');return; }
        pending.current=null;p.playVideoAt(index);
        // loadPlaylist already received startSeconds for a new player; for an existing one,
        // wait for the requested video before seeking to its bookmark.
        if(target.seconds>0) seekPending.current={videoId:queue[index],seconds:target.seconds};
      } else {
        pending.current=null;
        p.loadVideoById({videoId:source.videoId!,startSeconds:target.seconds});
      }
      setPosition(target.position);setNumber(String(target.position));setError('');
    } catch {setError('No se pudo seleccionar el elemento. Reintenta cuando cargue YouTube.');}
  }
  const seekPending=useRef<{videoId:string;seconds:number}|null>(null);
  useEffect(()=>{
    if(!started||!source.embedUrl) return;
    let cancelled=false,owned:YTPlayer|null=null;
    void loadYouTube().then(YT=>{
      if(cancelled||!mount.current) return;
      const child=document.createElement('div');mount.current.replaceChildren(child);
      const initial=pending.current ?? {position:1,videoId:source.videoId,seconds:0};
      owned=new YT.Player(child,{
        width:'100%',height:'100%',
        playerVars:{playsinline:1,controls:1,origin:location.origin,rel:0},
        events:{
          onReady:()=>{
            if(cancelled||!owned) return;
            readyRef.current=true;setReady(true);
            const frame=owned.getIframe();frame.title='Reproductor de YouTube';frame.allowFullscreen=true;frame.style.cssText='width:100%;height:100%;min-height:200px;display:block;border:0';
            if(source.listId) owned.loadPlaylist({list:source.listId,listType:'playlist',index:initial.position-1,startSeconds:initial.seconds});
            else {pending.current=null;owned.loadVideoById({videoId:source.videoId!,startSeconds:initial.seconds});}
          },
          onStateChange:(event:{data:number})=>{
            if(cancelled) return;
            playing.current=event.data===1;setIsPlaying(event.data===1||event.data===3);
            if(event.data===1){setNeedsResume(false);setError('');}
            if(event.data===1||event.data===2) capture();
          },
          onError:(event:{data:number})=>{
            if(cancelled) return;
            const messages:Record<number,string>={2:'No se pudo abrir este elemento.',5:'El navegador no pudo reproducir este video.',100:'El video fue eliminado o es privado.',101:'El propietario no permite reproducir este video aquí.',150:'El propietario no permite reproducir este video aquí.',153:'YouTube no pudo verificar el origen del reproductor. Abre la aplicación desde su dirección web.'};
            setError(messages[event.data]||'YouTube no pudo reproducir este elemento.');
          },
          onAutoplayBlocked:()=>{if(!cancelled)setMessage('Pulsa Reproducir o el botón del video para iniciar.');}
        }
      });player.current=owned;
    }).catch(e=>{if(!cancelled)setError(e.message);});
    const timer=window.setInterval(()=>{
      applyPending();
      const seek=seekPending.current,p=player.current;
      if(seek&&p&&readyRef.current) {
        try {if(p.getVideoData().video_id===seek.videoId&&p.getPlayerState()===1){p.seekTo(seek.seconds,true);seekPending.current=null;}}catch{/* wait */}
      }
      capture();
    },1000);
    const visibility=()=>{if(document.hidden){capture();if(playing.current)setNeedsResume(true);}};
    const pagehide=()=>capture();
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);
    return ()=>{
      capture();cancelled=true;clearInterval(timer);
      document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);
      pip.current?.close();owned?.destroy();player.current=null;readyRef.current=false;
    };
    // Source changes remount PlayerPanel; navigating the blank screen never recreates the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[started,retry]);
  function select(target:Target) {
    pending.current=target;setError('');setMessage('');
    if(!started) setStarted(true);else applyPending();
  }
  function jump() {
    const n=Number(number);
    if(!Number.isSafeInteger(n)||n<1||n>100000){setError('Escribe un número entero mayor que cero (máximo 100000).');return;}
    const track=catalog.find(t=>t.position===n);
    if(source.listId&&catalogStatus==='loading'&&!track){setMessage('Se están consultando las posiciones originales. Espera un momento y pulsa de nuevo.');return;}
    if(source.listId&&catalogStatus==='ready'&&!track){setError('Esa posición no aparece entre los elementos visibles de la lista. Consulta su contenido.');return;}
    if(track&&!track.available){setError('Ese elemento no está disponible. Puedes abrirlo en YouTube.');return;}
    select({position:n,videoId:track?.videoId??null,seconds:0});
  }
  function resume() {
    if(readyRef.current){player.current?.playVideo();setNeedsResume(false);setMessage('Si sigue pausado, pulsa el botón del video o Recargar reproductor.');}
    else restart();
  }
  function restart() {
    capture();pending.current=last.current??{position:1,videoId:source.videoId,seconds:0};
    setReady(false);setError('');if(started)setRetry(v=>v+1);else setStarted(true);
  }
  async function openPip() {
    try {
      const api=(window as unknown as Window & {documentPictureInPicture:{requestWindow:(size:{width:number;height:number})=>Promise<Window>}}).documentPictureInPicture;
      const w=await api.requestWindow({width:480,height:300});pip.current=w;
      if(!host.current)return;w.document.documentElement.style.height='100%';w.document.body.style.cssText='margin:0;background:#000;height:100vh';w.document.body.append(host.current);
      w.addEventListener('pagehide',()=>{if(host.current&&slot.current)slot.current.append(host.current);pip.current=null;},{once:true});
    } catch {setMessage('No se pudo abrir la ventana flotante. Puedes abrir el video en YouTube.');}
  }
  const mobileApp=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const external=watchUrl(source.listId,videoId,position,last.current?.seconds||0);
  function togglePlayback(){
    setMessage('');
    if(!started){jump();return;}
    if(isPlaying){player.current?.pauseVideo();capture();}else player.current?.playVideo();
  }
  function editLists(){const details=document.getElementById('listas') as HTMLDetailsElement|null;if(details)details.open=true;onGoToConfig();}
  return <section id="musica" className={`player-card ${compact?'is-compact':''}`} aria-label="Música / YouTube">
    <header className="player-heading">
      <h1 className="wordmark"><span className="brand-dot"/>MIOTUBE</h1>
      <div className="header-actions">
        <button className="icon-button" aria-label="Volver a pantalla vacía" title="Pantalla vacía" onClick={onReturn}><Icon name="blank"/></button>
        <Popover label="Apariencia" icon={theme==='black'?'moon':'sun'}>
          <p className="menu-label">Fondo de pantalla</p>
          <div className="theme-choices">
            <button className="theme-choice" aria-label="Fondo blanco" aria-pressed={theme==='white'} onClick={()=>onThemeChange('white')}><span className="swatch white"/>Blanco{theme==='white'&&<Icon name="check" size={15}/>}</button>
            <button className="theme-choice" aria-label="Fondo negro" aria-pressed={theme==='black'} onClick={()=>onThemeChange('black')}><span className="swatch black"/>Negro{theme==='black'&&<Icon name="check" size={15}/>}</button>
          </div>
        </Popover>
        <Popover label="Más opciones">
          {started&&<>
            <label className="menu-slider" htmlFor="zoom"><span>Tamaño del video <span>{zoom}%</span></span><input id="zoom" type="range" min={ZOOM_MIN} max={ZOOM_MAX} value={zoom} onChange={e=>onZoomChange(Number(e.target.value))}/></label>
            <label className="menu-check"><span>Vista compacta</span><input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)}/></label>
          </>}
          {source.embedUrl&&<a className="menu-item" href={external} target="_blank" rel="noreferrer"><Icon name="external" size={17}/>Abrir en YouTube</a>}
          {source.embedUrl&&mobileApp&&<a className="menu-item" href={external.replace('https://www.youtube.com/','youtube://www.youtube.com/')}><Icon name="external" size={17}/>Abrir en la app de YouTube</a>}
          {started&&pipSupported&&<button className="menu-item" disabled={!ready} onClick={()=>void openPip()}><Icon name="expand" size={17}/>Ventana flotante</button>}
          {started&&<button className="menu-item" onClick={restart}><Icon name="refresh" size={17}/>Recargar reproductor</button>}
          <details className="menu-info"><summary>Información de reproducción</summary><p>El reproductor permanece al final cuando vuelves a la pantalla vacía. La continuidad fuera de la app o con el teléfono bloqueado depende de YouTube y del navegador.</p></details>
        </Popover>
      </div>
    </header>
    <nav className="playlist-tabs" aria-label="Mis listas">{playlists.map(pl=><button key={pl.id} className={pl.url===activeUrl?'selected':''} aria-pressed={pl.url===activeUrl} onClick={()=>onSelectUrl(pl.url)}>{pl.label}</button>)}<button className="add-list" aria-label="Administrar mis listas" title="Administrar mis listas" onClick={editLists}><Icon name="plus" size={19}/></button></nav>
    {!source.embedUrl?<div className="empty-state"><Icon name="play" size={30}/><h2>Tu música, a tu ritmo</h2><p>{activeUrl?'El enlace no es compatible. Agrega una lista o un video de YouTube.':'Añade tu primera lista para empezar.'}</p><button className="accent" onClick={editLists}>Añadir una lista</button></div>:<>
      <div className="now-playing">
        <span className="eyebrow">{started?`${isPlaying?'Reproduciendo':'En pausa'} · ${position}`:'LISTO PARA ESCUCHAR'}</span>
        <h2>{title||playlists.find(pl=>pl.url===activeUrl)?.label||'Tu lista de YouTube'}</h2>
      </div>
      {started&&<div className="video-slot" ref={slot} style={{height:compact?220:`max(220px, ${zoom}svh)`}}><div ref={host} className="video-host" style={{width:'100%',height:'100%'}}><div ref={mount} className="video-mount" style={{width:'100%',height:'100%'}}/></div></div>}
      <div className="transport" aria-label="Controles de reproducción">
        <button className="transport-side" disabled={!ready||!source.listId} aria-label="Video anterior" onClick={()=>{setMessage('');player.current?.previousVideo();}}><Icon name="previous" size={25}/></button>
        <button className="transport-main" disabled={started&&!ready} aria-label={isPlaying?'Pausar':'Reproducir'} onClick={togglePlayback}><Icon name={isPlaying?'pause':'play'} size={28} filled={!isPlaying}/></button>
        <button className="transport-side" disabled={!ready||!source.listId} aria-label="Video siguiente" onClick={()=>{setMessage('');player.current?.nextVideo();}}><Icon name="next" size={25}/></button>
      </div>
      {source.listId&&<div className="number-form"><label htmlFor="numero">Ir al n.º</label><input id="numero" aria-label="Elemento de la lista" type="number" inputMode="numeric" min="1" max="100000" step="1" value={number} onChange={e=>setNumber(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')jump();}}/><button className="number-go icon-button" aria-label="Ir al elemento" onClick={jump}><Icon name="next" size={18}/></button></div>}
      {!started&&bookmark&&<button className="continue-button" onClick={()=>select(bookmark)}><Icon name="play" size={17}/><span>Continuar donde me quedé<small>Elemento {bookmark.position} · {Math.floor(bookmark.seconds/60)}:{String(Math.floor(bookmark.seconds%60)).padStart(2,'0')}</small></span><Icon name="external" size={16}/></button>}
      {source.listId&&catalogStatus==='error'&&<p className="notice">No se pudieron confirmar las posiciones originales. El salto numérico usará el orden disponible en YouTube.</p>}
      {needsResume&&<p role="status" className="notice">La reproducción puede haberse pausado. <button onClick={resume}>Reanudar</button></p>}
      {error&&<p role="alert" className="notice">{error} <button onClick={restart}>Reintentar</button></p>}
      {message&&<p role="status" className="muted feedback">{message}</p>}
      {started&&!ready&&!error&&<p role="status" className="muted feedback">Conectando con YouTube…</p>}
      {source.listId&&<PlaylistLibrary listId={source.listId} currentPosition={position} onTracks={setCatalog} onStatus={setCatalogStatus} onSelect={track=>select({position:track.position,videoId:track.videoId,seconds:0})}/>}
    </>}
  </section>;
}
