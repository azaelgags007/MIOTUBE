import { useEffect, useState } from 'react';
import PlayerPanel from './components/PlayerPanel';
import PlaylistConfig from './components/PlaylistConfig';
import {loadActiveUrl,loadPlaylists,loadZoom,saveActiveUrl,savePlaylists,saveZoom,loadTheme,saveTheme} from './utils/storage';
export default function App() {
  const [playlists,setPlaylists] = useState(loadPlaylists);
  const [activeUrl,setActiveUrl] = useState(loadActiveUrl);
  const [zoom,setZoom] = useState(loadZoom);
  const [theme,setTheme] = useState(loadTheme);
  useEffect(()=>savePlaylists(playlists),[playlists]);
  useEffect(()=>saveActiveUrl(activeUrl),[activeUrl]);
  useEffect(()=>saveZoom(zoom),[zoom]);
  useEffect(()=>{
    saveTheme(theme);
    document.documentElement.classList.toggle('dark',theme==='black');
    document.documentElement.style.backgroundColor=theme==='black'?'#000':'#fff';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='black'?'#000000':'#ffffff');
  },[theme]);
  const go = (id: string) => {document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  return <main className="app-shell" data-theme={theme}>
    <section id="pantalla" className="blank-screen" aria-label={`Pantalla ${theme==='black'?'negra':'blanca'}`}>
      <nav className="cover-actions" aria-label="Accesos">
        <button aria-label="Fondo blanco" aria-pressed={theme==='white'} onClick={()=>setTheme('white')}>Blanco</button>
        <button aria-label="Fondo negro" aria-pressed={theme==='black'} onClick={()=>setTheme('black')}>Negro</button>
        <button className="accent" onClick={()=>go('musica')}>Ir a música / YouTube ↓</button>
      </nav>
    </section>
    <div className="workspace">
      <PlayerPanel key={activeUrl} playlists={playlists} activeUrl={activeUrl} onSelectUrl={setActiveUrl} zoom={zoom} onZoomChange={setZoom} onGoToConfig={()=>go('listas')} onReturn={()=>go('pantalla')} />
      <details className="settings" id="listas"><summary>Administrar mis listas</summary>
        <PlaylistConfig playlists={playlists} activeUrl={activeUrl} onChange={setPlaylists} onSelectUrl={setActiveUrl}/>
      </details>
    </div>
  </main>;
}
