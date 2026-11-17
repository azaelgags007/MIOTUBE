import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react(),{
  name:'miotube-local-api',
  configureServer(server) {
    server.middlewares.use('/api/playlist',async(req,res)=>{
      // The same server handler runs locally and as a Vercel function.
      // @ts-ignore Node-only module outside the browser source.
      const {default:handler}=await import('./api/playlist.mjs');
      const adapter={setHeader:(name:string,value:string)=>res.setHeader(name,value),status(code:number){res.statusCode=code;return this;},json(value:unknown){res.end(JSON.stringify(value));}};
      const request=req as unknown as {method:string;url:string};
      await handler({method:request.method,url:'/api/playlist'+(request.url||'')},adapter);
    });
  }
}]});
