import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
const dom=new JSDOM('<!doctype html><html><head><meta name="theme-color" /></head><body></body></html>',{url:'http://localhost:5173/'});
for(const key of ['window','document','HTMLElement','HTMLIFrameElement','Node','Event','MouseEvent','KeyboardEvent','MutationObserver','localStorage','location'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});globalThis.matchMedia=window.matchMedia;
window.HTMLElement.prototype.scrollIntoView=function(){window.lastScrolled=this.id;};
await mkdir('node_modules/.tmp',{recursive:true});
await build({entryPoints:['tests/dom-flow.tsx'],bundle:true,jsx:'automatic',platform:'node',format:'esm',packages:'external',outfile:'node_modules/.tmp/miotube-dom.mjs'});
try {await import('../node_modules/.tmp/miotube-dom.mjs');} finally {dom.window.close();}
