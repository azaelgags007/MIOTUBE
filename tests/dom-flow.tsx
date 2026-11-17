import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import assert from 'node:assert/strict';
import App from '../src/App';
const list='PLrUqhP1JLybcnoag3bz8PQkb14cegajrM';
const calls:any[]=[];
const queue=['71aiTz_Xwsw','dQw4w9WgXcQ'];
const items=[{position:1,videoId:queue[0],title:'Primera canción',thumbnail:null,available:true,author:'Autor',duration:'3:00'},{position:3,videoId:queue[1],title:'Canción de prueba',thumbnail:null,available:true,author:'Autor',duration:'4:00'}];
let apiFailure=false;
globalThis.fetch=async()=>apiFailure?Response.json({error:'La lista es privada.'},{status:404}):Response.json({items,nextCursor:null,title:'Prueba',fetchedAt:new Date().toISOString(),notices:[]});
window.YT={Player:class {
  index=0;time=0;state=1;frame:HTMLIFrameElement;options:any;
  constructor(el:HTMLElement,options:any){this.options=options;this.frame=el.tagName==='IFRAME'?el as HTMLIFrameElement:document.createElement('iframe');if(el!==this.frame)el.replaceWith(this.frame);setTimeout(()=>options.events.onReady(),10);}
  getIframe(){return this.frame;}getPlaylist(){return queue;}getPlaylistIndex(){return this.index;}getCurrentTime(){return this.time;}getPlayerState(){return this.state;}
  getVideoData(){return {video_id:queue[this.index],title:this.index===0?'Primera canción':'Canción de prueba'};}
  loadPlaylist(o:any){this.index=Math.min(o.index||0,1);this.time=o.startSeconds||0;calls.push(['load',o]);this.options.events.onStateChange({data:1});}
  loadVideoById(){}playVideoAt(i:number){this.index=i;this.time=0;calls.push(['jump',i]);this.options.events.onStateChange({data:1});}
  playVideo(){this.state=1;this.options.events.onStateChange({data:1});}pauseVideo(){this.state=2;this.options.events.onStateChange({data:2});}
  nextVideo(){this.playVideoAt(1);}previousVideo(){this.playVideoAt(0);}seekTo(t:number){this.time=t;calls.push(['seek',t]);}destroy(){this.frame.remove();}
} as any};
localStorage.setItem('yt_player_playlists',JSON.stringify([{id:'old',label:'Concentración',url:`https://youtube.com/playlist?list=${list}`} ]));
localStorage.setItem('yt_player_active_url',`https://youtube.com/playlist?list=${list}`);
render(<App/>);
// Blank mode has no permanent buttons and makes the player inaccessible to focus.
assert.ok(document.documentElement.classList.contains('blank-active'));
assert.equal(screen.queryAllByRole('button').length,0);
fireEvent.click(screen.getByRole('region',{name:/Pantalla negra/}));
assert.ok(screen.getByRole('button',{name:'Ir a música / YouTube',exact:true}));
await act(()=>new Promise(resolve=>setTimeout(resolve,3600)));
assert.equal(screen.queryAllByRole('button').length,0);
function enter(){fireEvent.click(document.getElementById('pantalla')!);fireEvent.click(screen.getByRole('button',{name:'Ir a música / YouTube',exact:true}));}
enter();assert.equal((window as any).lastScrolled,'musica');
assert.ok(!document.documentElement.classList.contains('blank-active'));
fireEvent.click(screen.getByRole('button',{name:'Apariencia',exact:true}));
fireEvent.click(screen.getByRole('button',{name:'Fondo blanco',exact:true}));assert.equal(localStorage.getItem('miotube_theme'),'white');
fireEvent.keyDown(document,{key:'Escape'});
fireEvent.click(screen.getByRole('button',{name:'Ver contenido de la lista',exact:true}));
await screen.findByRole('button',{name:'Reproducir 3: Canción de prueba',exact:true});
fireEvent.change(screen.getByRole('searchbox',{name:'Buscar por título o número'}),{target:{value:'3'}});
assert.equal(document.querySelectorAll('.track-list li').length,1);assert.equal(document.querySelector('.track-number')?.textContent,'3');
fireEvent.click(screen.getByRole('button',{name:'Añadir a favoritos: Canción de prueba',exact:true}));
fireEvent.click(screen.getByRole('button',{name:'Opciones de Canción de prueba',exact:true}));
fireEvent.click(screen.getByRole('button',{name:'Ver título completo',exact:true}));assert.ok(document.querySelector('.track-list li.expanded'));
fireEvent.keyDown(document,{key:'Escape'});
fireEvent.click(screen.getByRole('button',{name:'Reproducir 3: Canción de prueba',exact:true}));
await waitFor(()=>assert.ok(calls.some(c=>c[0]==='jump'&&c[1]===1)),{timeout:4000});
const frame=document.querySelector('.video-mount iframe');assert.ok(frame);
assert.match(frame.getAttribute('allow')||'',/picture-in-picture/);
assert.equal(new URL(frame.getAttribute('src')!).searchParams.get('playsinline'),'1');
fireEvent.click(screen.getByRole('button',{name:'Pausar',exact:true}));await screen.findByRole('button',{name:'Reproducir',exact:true});
fireEvent.click(screen.getByRole('button',{name:'Reproducir',exact:true}));await screen.findByRole('button',{name:'Pausar',exact:true});
fireEvent.click(screen.getByRole('button',{name:'Más opciones',exact:true}));
fireEvent.click(screen.getByRole('checkbox',{name:'Vista compacta',exact:true}));assert.equal(document.querySelector('.video-mount iframe'),frame);
assert.ok(screen.getByRole('link',{name:'Abrir en YouTube',exact:true}));
fireEvent.keyDown(document,{key:'Escape'});
fireEvent.click(screen.getByRole('button',{name:'Volver a pantalla vacía',exact:true}));
assert.ok(document.documentElement.classList.contains('blank-active'));assert.ok(frame?.isConnected);
assert.equal(screen.queryAllByRole('button').length,0);
await waitFor(()=>assert.equal(JSON.parse(localStorage.getItem(`miotube_bookmark:list:${list}`)||'null')?.position,3),{timeout:3000});
enter();assert.equal(document.querySelector('.video-mount iframe'),frame);
cleanup();render(<App/>);assert.equal(document.querySelector('main')?.getAttribute('data-theme'),'white');
enter();assert.ok(screen.getByRole('button',{name:'Concentración',exact:true}));
fireEvent.click(screen.getByRole('button',{name:/Continuar donde me quedé/}));
await waitFor(()=>assert.ok(calls.filter(c=>c[0]==='jump'&&c[1]===1).length>=2),{timeout:4000});
fireEvent.click(screen.getByRole('button',{name:'Ver contenido de la lista',exact:true}));await screen.findByRole('button',{name:'Quitar de favoritos: Canción de prueba',exact:true});
fireEvent.click(screen.getByRole('button',{name:'Solo favoritos',exact:true}));assert.equal(document.querySelectorAll('.track-list li').length,1);
fireEvent.change(screen.getByRole('spinbutton',{name:'Elemento de la lista'}),{target:{value:'0'}});fireEvent.click(screen.getByRole('button',{name:'Ir al elemento',exact:true}));assert.match(screen.getByRole('alert').textContent||'',/número entero/);
apiFailure=true;fireEvent.click(screen.getByRole('button',{name:'Actualizar',exact:true}));await screen.findByText(/La lista es privada/);assert.ok(screen.getByRole('link',{name:'Abrir lista en YouTube ↗'}));
cleanup();
// Exercise the actual iPhone branch, not just the desktop layout.
apiFailure=false;
Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1',configurable:true});
render(<App/>);enter();
assert.ok(screen.getByRole('button',{name:'Abrir YouTube para PiP',exact:true}));
fireEvent.click(screen.getByRole('button',{name:/Continuar donde me quedé/}));
await waitFor(()=>assert.ok(screen.getByRole('button',{name:'Pausar',exact:true})),{timeout:4000});
const iosFrame=document.querySelector('.video-mount iframe') as HTMLIFrameElement;
assert.ok(iosFrame);assert.equal(new URL(iosFrame.src).searchParams.get('playsinline'),'0');
assert.match(iosFrame.allow,/picture-in-picture/);assert.match(iosFrame.allow,/fullscreen/);assert.equal(iosFrame.allowFullscreen,true);
fireEvent.click(screen.getByRole('button',{name:'Más opciones',exact:true}));
const cdcMode=screen.getByRole('checkbox',{name:'Reproducción como CDC',exact:true}) as HTMLInputElement;
assert.equal(cdcMode.checked,true);
fireEvent.click(cdcMode);
await waitFor(()=>assert.equal(new URL((document.querySelector('.video-mount iframe') as HTMLIFrameElement).src).searchParams.get('playsinline'),'1'));
assert.equal(localStorage.getItem('miotube_ios_native_playback'),'false');
fireEvent.click(screen.getByRole('checkbox',{name:'Reproducción como CDC',exact:true}));
await waitFor(()=>assert.equal(new URL((document.querySelector('.video-mount iframe') as HTMLIFrameElement).src).searchParams.get('playsinline'),'0'));
const retained=document.querySelector('.video-mount iframe');
fireEvent.keyDown(document,{key:'Escape'});
fireEvent.click(screen.getByRole('button',{name:'Volver a pantalla vacía',exact:true}));
assert.equal(retained?.isConnected,true);
assert.equal(retained?.closest('[inert]'),null);
window.requestAnimationFrame=callback=>{window.setTimeout(()=>callback(0),0);return 1;};
fireEvent.keyDown(document.getElementById('pantalla')!,{key:'Tab'});
assert.ok(screen.getByRole('button',{name:'Ir a música / YouTube',exact:true}));
await waitFor(()=>assert.ok(document.activeElement===screen.getByRole('button',{name:'Ir a música / YouTube',exact:true}))); 
fireEvent.keyDown(document.activeElement!,{key:'Tab'});
assert.ok(document.activeElement===screen.getByRole('button',{name:'Ocultar accesos',exact:true}));
enter();assert.equal(document.querySelector('.video-mount iframe'),retained);
cleanup();
console.log('PASS UI: iPhone CDC-compatible native iframe/permissions, explicit web playback option, PiP shortcut, media preserved outside inert trees, blank-screen reveal/hide and keyboard isolation, appearance persistence, unified play/pause, popovers, title expansion, numeric search/original position, favorites, retained iframe and resume, error fallback.');
