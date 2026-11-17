import type {CSSProperties} from 'react';
export type IconName='play'|'pause'|'previous'|'next'|'more'|'sun'|'moon'|'blank'|'down'|'up'|'close'|'plus'|'search'|'refresh'|'star'|'external'|'info'|'check'|'expand';
const paths:Record<IconName,React.ReactNode>={
  play:<path d="m9 5 11 7-11 7Z"/>,pause:<><path d="M8 5v14M16 5v14"/></>,
  previous:<><path d="M5 5v14M19 5 8 12l11 7Z"/></>,next:<><path d="M19 5v14M5 5l11 7-11 7Z"/></>,
  more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  moon:<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>,
  blank:<rect x="4" y="4" width="16" height="16" rx="4"/>,
  down:<path d="m6 9 6 6 6-6"/>,up:<path d="m6 15 6-6 6 6"/>,close:<path d="m6 6 12 12M18 6 6 18"/>,
  plus:<path d="M12 5v14M5 12h14"/>,search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 11.5-2L20 8M4 16l2.5 3A7 7 0 0 0 18 17"/></>,
  star:<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9Z"/>,
  external:<><path d="M14 4h6v6m0-6L10 14"/><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/></>,
  check:<path d="m5 12 4 4L19 6"/>,expand:<><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></>
};
export default function Icon({name,size=20,filled=false,style}:{name:IconName;size?:number;filled?:boolean;style?:CSSProperties}){
 return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}>{paths[name]}</svg>;
}
