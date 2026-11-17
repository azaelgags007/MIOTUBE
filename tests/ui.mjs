import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const list='PLrUqhP1JLybcnoag3bz8PQkb14cegajrM';
await page.addInitScript(({list})=>{
  if(!localStorage.getItem('test_initialized')){
    localStorage.setItem('test_initialized','yes');
    localStorage.setItem('yt_player_playlists',JSON.stringify([{id:'old',label:'Concentración',url:`https://youtube.com/playlist?list=${list}`} ]));
    localStorage.setItem('yt_player_active_url',`https://youtube.com/playlist?list=${list}`);
  }
}, {list});
const items=[{position:1,videoId:'71aiTz_Xwsw',title:'Primera canción',thumbnail:null,available:true,author:'Autor',duration:'3:00'}, {position:3,videoId:'dQw4w9WgXcQ',title:'Canción de prueba',thumbnail:null,available:true,author:'Autor',duration:'4:00'}, {position:4,videoId:null,title:'Video privado',thumbnail:null,available:false,author:'',duration:''}];
await page.route('**/api/playlist?**',route=>route.fulfill({json:{items,nextCursor:null,title:'Prueba',fetchedAt:new Date().toISOString(),notices:[]}}));
await page.route('https://www.youtube.com/iframe_api',route=>route.fulfill({contentType:'application/javascript',body:`
window.calls=[];window.YT={Player:class {
 constructor(el,options){this.options=options;this.index=0;this.time=0;this.state=1;this.frame=document.createElement('iframe');this.frame.src='about:blank';el.replaceWith(this.frame);setTimeout(()=>options.events.onReady(),20);}
 getIframe(){return this.frame;} getPlaylist(){return ['71aiTz_Xwsw','dQw4w9WgXcQ'];} getPlaylistIndex(){return this.index;}getCurrentTime(){return this.time;}getPlayerState(){return this.state;}
 getVideoData(){return {video_id:this.getPlaylist()[this.index],title:this.index===0?'Primera canción':'Canción de prueba'};}
 loadPlaylist(o){this.index=Math.min(o.index||0,1);this.time=o.startSeconds||0;calls.push(['load',o]);this.options.events.onStateChange({data:1});}
 playVideoAt(i){this.index=i;this.time=0;calls.push(['jump',i]);this.options.events.onStateChange({data:1});}
 playVideo(){this.state=1;this.options.events.onStateChange({data:1});}pauseVideo(){this.state=2;this.options.events.onStateChange({data:2});}
 nextVideo(){this.playVideoAt(1);}previousVideo(){this.playVideoAt(0);}seekTo(t){this.time=t;calls.push(['seek',t]);}destroy(){this.frame.remove();}
}};window.onYouTubeIframeAPIReady();` }));
try {
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
  await page.getByRole('button',{name:'Fondo blanco',exact:true}).click();
  assert.equal(await page.locator('main').getAttribute('data-theme'),'white');
  await page.reload();assert.equal(await page.locator('main').getAttribute('data-theme'),'white');
  await page.getByRole('button',{name:'Ir a música / YouTube ↓'}).click();
  await page.getByRole('button',{name:'Ver contenido de la lista',exact:true}).click();
  await page.getByRole('button',{name:'Reproducir 3: Canción de prueba',exact:true}).waitFor();
  await page.getByRole('textbox',{name:'Buscar por título o número'}).fill('3');
  assert.equal(await page.locator('.track-list li').count(),1);
  assert.equal(await page.locator('.track-number').innerText(),'3');
  await page.getByRole('button',{name:'Reproducir 3: Canción de prueba',exact:true}).click();
  await page.waitForFunction(()=>window.calls?.some(c=>c[0]==='jump'&&c[1]===1));
  const frame=await page.locator('.video-mount iframe').elementHandle();
  await page.getByRole('button',{name:'Controles compactos',exact:true}).click();
  const size=await page.locator('.video-mount iframe').boundingBox();assert.ok(size.height>=200&&size.width>=200);
  await page.getByRole('button',{name:'Volver a pantalla vacía ↑',exact:true}).click();
  assert.equal(await frame.evaluate(el=>el.isConnected),true);
  await page.waitForFunction(()=>!!localStorage.getItem('miotube_bookmark:list:PLrUqhP1JLybcnoag3bz8PQkb14cegajrM'));
  const b=await page.evaluate(()=>JSON.parse(localStorage.getItem('miotube_bookmark:list:PLrUqhP1JLybcnoag3bz8PQkb14cegajrM')));
  assert.equal(b.position,3);assert.equal(b.videoId,'dQw4w9WgXcQ');
  await page.getByRole('button',{name:'Ir a música / YouTube ↓'}).click();
  await page.getByRole('button',{name:'Añadir a favoritos: Canción de prueba',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'Continuar donde me quedé',exact:true}).click();
  await page.waitForFunction(()=>window.calls?.some(c=>c[0]==='jump'&&c[1]===1));
  assert.ok(await page.getByRole('button',{name:'Concentración',exact:true}).count());
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/miotube-mobile.png',fullPage:true});
  // Desktop layout with the same stored playlist.
  await page.setViewportSize({width:1280,height:900});await page.reload();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('PASS: mobile/desktop, theme persistence, legacy playlists, title/number search, original position 3 → playable index 1, player retained on return/compact, bookmark/resume and favorites.');
} finally {await browser.close();}
