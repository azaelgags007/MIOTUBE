import {useEffect,useRef,useState} from 'react';
import PlayerPanel from './components/PlayerPanel';
import PlaylistConfig from './components/PlaylistConfig';
import Icon from './components/Icon';
import {loadActiveUrl,loadPlaylists,loadZoom,saveActiveUrl,savePlaylists,saveZoom,loadTheme,saveTheme,readJson,writeJson} from './utils/storage';
export default function App() {
  const [playlists,setPlaylists]=useState(loadPlaylists);
  const [activeUrl,setActiveUrl]=useState(loadActiveUrl);
  const [zoom,setZoom]=useState(loadZoom);
  const [theme,setTheme]=useState(loadTheme);
  const [blank,setBlank]=useState(true),[access,setAccess]=useState(false);
  const [hint,setHint]=useState(()=>!readJson('miotube_blank_hint_seen',false));
  const hideTimer=useRef<number>();
  const workspace=useRef<HTMLDivElement>(null);
  useEffect(()=>savePlaylists(playlists),[playlists]);
  useEffect(()=>saveActiveUrl(activeUrl),[activeUrl]);
  useEffect(()=>saveZoom(zoom),[zoom]);
  useEffect(()=>{
    saveTheme(theme);
    document.documentElement.classList.toggle('dark',theme==='black');
    document.documentElement.style.backgroundColor=theme==='black'?'#000':'#fff';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='black'?'#000000':'#ffffff');
  },[theme]);
  useEffect(()=>{
    document.documentElement.classList.toggle('blank-active',blank);
    if(workspace.current)workspace.current.inert=blank;
    return ()=>document.documentElement.classList.remove('blank-active');
  },[blank]);
  useEffect(()=>{
    if(!hint)return;
    writeJson('miotube_blank_hint_seen',true);
    const timer=window.setTimeout(()=>setHint(false),3500);
    return ()=>clearTimeout(timer);
  },[hint]);
  useEffect(()=>()=>clearTimeout(hideTimer.current),[]);
  function reveal(keyboard=false) {
    setAccess(true);setHint(false);clearTimeout(hideTimer.current);
    if(!keyboard)hideTimer.current=window.setTimeout(()=>setAccess(false),3500);
  }
  const scroll=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  function enterPlayer(){clearTimeout(hideTimer.current);setBlank(false);setAccess(false);setHint(false);window.requestAnimationFrame(()=>scroll('musica'));}
  function enterBlank(){setAccess(false);setHint(false);setBlank(true);window.scrollTo({top:0,behavior:'instant' as ScrollBehavior});window.requestAnimationFrame(()=>document.getElementById('pantalla')?.focus({preventScroll:true}));}
  return <main className="app-shell" data-theme={theme}>
    <section id="pantalla" className={`blank-screen ${blank?'is-active':''}`} aria-label={`Pantalla ${theme==='black'?'negra':'blanca'}. Toca para mostrar accesos.`} tabIndex={blank?0:-1}
      onClick={()=>{if(blank)reveal();}}
      onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();reveal(true);}if(e.key==='Escape'){setAccess(false);setHint(false);}}}>
      {blank&&hint&&<p className="blank-hint" role="status">Toca la pantalla para mostrar los accesos</p>}
      {blank&&access&&<nav className="cover-actions" aria-label="Accesos" onClick={e=>e.stopPropagation()} onKeyDown={()=>clearTimeout(hideTimer.current)}>
        <button className="cover-entry" onClick={enterPlayer}><Icon name="play" size={17}/> Ir a música / YouTube</button>
        <button className="icon-button" aria-label="Ocultar accesos" onClick={()=>setAccess(false)}><Icon name="close" size={18}/></button>
      </nav>}
    </section>
    <div className="workspace" ref={workspace} aria-hidden={blank}>
      <PlayerPanel key={activeUrl} playlists={playlists} activeUrl={activeUrl} onSelectUrl={setActiveUrl} zoom={zoom} onZoomChange={setZoom} onGoToConfig={()=>scroll('listas')} onReturn={enterBlank} theme={theme} onThemeChange={setTheme}/>
      <details className="settings" id="listas"><summary>Administrar mis listas</summary>
        <PlaylistConfig playlists={playlists} activeUrl={activeUrl} onChange={setPlaylists} onSelectUrl={setActiveUrl}/>
      </details>
    </div>
  </main>;
}
