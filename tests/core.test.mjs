import test from 'node:test';
import assert from 'node:assert/strict';
import {readInitialData,extractPage,getPlaylistPage} from '../server/playlist.mjs';
import {parseYouTubeUrl,watchUrl} from '../src/utils/youtube.ts';
import {queueIndexForTrack,trackForQueueIndex} from '../src/utils/positions.ts';
const id='71aiTz_Xwsw', other='dQw4w9WgXcQ';
const renderer=(position,videoId=id,title='Título')=>({playlistVideoRenderer:{index:{simpleText:String(position)},videoId,title:{runs:[{text:title}]},isPlayable:true}});
test('accepts supported YouTube links and rejects deceptive hosts and protocols',()=>{
  for(const url of [`https://youtu.be/${id}`,`https://www.youtube.com/watch?v=${id}`,`https://www.youtube.com/shorts/${id}`,`https://www.youtube.com/embed/${id}`])assert.equal(parseYouTubeUrl(url).videoId,id);
  for(const url of [`https://evil-youtu.be/${id}`,`https://evil.com/?v=${id}`,`javascript:alert(1)`,`https://youtube.com.evil.com/?v=${id}`])assert.equal(parseYouTubeUrl(url).embedUrl,null);
  assert.equal(parseYouTubeUrl('https://youtube.com/playlist?list=PLrUqhP1JLybcnoag3bz8PQkb14cegajrM').listId,'PLrUqhP1JLybcnoag3bz8PQkb14cegajrM');
});
test('extracts initial JSON with nested braces, escaped quotes, and script suffix',()=>{
  const obj={title:'foo } " bar', nested:{value:[1,2]}};
  assert.deepEqual(readInitialData(`<script>var ytInitialData = ${JSON.stringify(obj)};</script>`),obj);
  assert.throws(()=>readInitialData('<html>private</html>'));
});
test('preserves original positions, gaps and duplicates, ignores unrelated continuation',()=>{
  const data={contents:{playlistVideoListRenderer:{contents:[renderer(1),renderer(3,id),renderer(4,other),{continuationItemRenderer:{continuationEndpoint:{continuationCommand:{token:'correct'}}}}]}},sidebar:{continuationItemRenderer:{continuationEndpoint:{continuationCommand:{token:'wrong'}}}}};
  const result=extractPage(data);assert.deepEqual(result.items.map(t=>t.position),[1,3,4]);assert.equal(result.next,'correct');
});
test('parses continuation pages and unavailable placeholders without reindexing',()=>{
  const data={onResponseReceivedActions:[{appendContinuationItemsAction:{continuationItems:[renderer(101,other),{playlistVideoRenderer:{index:{simpleText:'103'},title:{simpleText:'Private video'},isPlayable:false}}]}}]};
  const result=extractPage(data);assert.deepEqual(result.items.map(t=>t.position),[101,103]);assert.equal(result.items[1].available,false);assert.equal(result.items[1].videoId,null);
});
test('maps playable indices to original positions including repeated songs',()=>{
  const catalog=[{position:1,videoId:id},{position:3,videoId:id},{position:4,videoId:other}];
  const queue=[id,id,other];assert.equal(queueIndexForTrack(queue,catalog[1],catalog),1);assert.equal(trackForQueueIndex(queue,2,catalog).position,4);
});
test('validates list and cursor before fetching a fixed upstream',async()=>{
  await assert.rejects(getPlaylistPage('https://evil.com'),{status:400});
  await assert.rejects(getPlaylistPage('PLrUqhP1JLybcnoag3bz8PQkb14cegajrM','bad'),{status:400});
});
test('external links retain selected original index and time',()=>{
  const u=new URL(watchUrl('PL1234567890',id,37,125.8));assert.equal(u.searchParams.get('index'),'37');assert.equal(u.searchParams.get('t'),'125');assert.equal(u.searchParams.get('v'),id);
});
test('server pagination uses public context and keeps absolute indices',async()=>{
  const original=globalThis.fetch;let call=0;
  globalThis.fetch=async(url,options)=>{
    call++;
    assert.equal(new URL(url).hostname,'www.youtube.com');
    if(call===1)return new Response(`var ytInitialData = ${JSON.stringify({contents:{playlistVideoListRenderer:{contents:[renderer(1),{continuationItemRenderer:{continuationEndpoint:{continuationCommand:{token:'next'}}}}]}}})}; "INNERTUBE_CLIENT_VERSION":"2.20261116.01.00"`);
    assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).continuation,'next');
    return Response.json({onResponseReceivedActions:[{appendContinuationItemsAction:{continuationItems:[renderer(101,other)]}}]});
  };
  try {const first=await getPlaylistPage('PL1234567890');const second=await getPlaylistPage('PL1234567890',first.nextCursor);assert.equal(second.items[0].position,101);assert.equal(second.nextCursor,null);}finally{globalThis.fetch=original;}
});
