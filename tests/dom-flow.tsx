import React from 'react';
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
  constructor(el:HTMLElement,options:any){this.options=options;this.frame=document.createElement('iframe');el.replaceWith(this.frame);setTimeout(()=>options.events.onReady(),10);}
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
fireEvent.click(screen.getByRole('button',{name:'Fondo blanco',exact:true}));assert.equal(localStorage.getItem('miotube_theme'),'white');
fireEvent.click(screen.getByRole('button',{name:'Ir a música / YouTube ↓'}));assert.equal((window as any).lastScrolled,'musica');
fireEvent.click(screen.getByRole('button',{name:'Ver contenido de la lista',exact:true}));
await screen.findByRole('button',{name:'Reproducir 3: Canción de prueba',exact:true});
fireEvent.change(screen.getByRole('textbox',{name:'Buscar por título o número'}),{target:{value:'3'}});assert.equal(document.querySelectorAll('.track-list li').length,1);assert.equal(document.querySelector('.track-number')?.textContent,'3');
fireEvent.click(screen.getByRole('button',{name:'Añadir a favoritos: Canción de prueba',exact:true}));
fireEvent.click(screen.getByRole('button',{name:'Reproducir 3: Canción de prueba',exact:true}));
await waitFor(()=>assert.ok(calls.some(c=>c[0]==='jump'&&c[1]===1)),{timeout:4000});
const frame=document.querySelector('.video-mount iframe');assert.ok(frame);
fireEvent.click(screen.getByRole('button',{name:'Controles compactos',exact:true}));assert.equal(document.querySelector('.video-mount iframe'),frame);
fireEvent.click(screen.getByRole('button',{name:'Volver a pantalla vacía ↑'}));assert.equal((window as any).lastScrolled,'pantalla');assert.ok(frame?.isConnected);
await waitFor(()=>assert.equal(JSON.parse(localStorage.getItem(`miotube_bookmark:list:${list}`)||'null')?.position,3),{timeout:3000});
cleanup();render(<App/>);assert.equal(document.querySelector('main')?.getAttribute('data-theme'),'white');assert.ok(screen.getByRole('button',{name:'Concentración',exact:true}));
fireEvent.click(screen.getByRole('button',{name:'Continuar donde me quedé',exact:true}));
await waitFor(()=>assert.ok(calls.filter(c=>c[0]==='jump'&&c[1]===1).length>=2),{timeout:4000});
fireEvent.click(screen.getByRole('button',{name:'Ver contenido de la lista',exact:true}));await screen.findByRole('button',{name:'Quitar de favoritos: Canción de prueba',exact:true});
fireEvent.change(screen.getByRole('spinbutton',{name:'Elemento de la lista'}),{target:{value:'0'}});fireEvent.click(screen.getByRole('button',{name:'Ir al elemento',exact:true}));assert.match(screen.getByRole('alert').textContent||'',/número entero/);
apiFailure=true;fireEvent.click(screen.getByRole('button',{name:'Actualizar',exact:true}));await screen.findByText(/La lista es privada/);assert.ok(screen.getByRole('link',{name:'Abrir lista en YouTube ↗'}));
cleanup();
console.log('PASS UI DOM: theme and legacy storage, numeric search preserving position, jump across gaps, retained iframe, bookmark/resume, favorites, invalid input and API failure fallback.');
