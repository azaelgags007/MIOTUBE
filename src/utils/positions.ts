import type {Track} from '../types';
// Preserve repeated video IDs: use their occurrence count, never a simple indexOf.
export function queueIndexForTrack(queue: string[], track: Track, catalog: Track[]): number {
  const occurrence=catalog.filter(t=>t.position<=track.position && t.videoId===track.videoId).length;
  let seen=0;
  return queue.findIndex(id=>id===track.videoId && ++seen===occurrence);
}
export function trackForQueueIndex(queue: string[], index: number, catalog: Track[]): Track | undefined {
  const id=queue[index]; if(!id) return undefined;
  const occurrence=queue.slice(0,index+1).filter(v=>v===id).length;
  return catalog.filter(t=>t.videoId===id)[occurrence-1];
}
