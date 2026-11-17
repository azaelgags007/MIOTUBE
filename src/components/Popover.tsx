import {useEffect,useRef,useState,type ReactNode} from 'react';
import Icon from './Icon';
import type {IconName} from './Icon';
export default function Popover({label,icon='more',children,className=''}:{label:string;icon?:IconName;children:ReactNode;className?:string}) {
  const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);const button=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const outside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);button.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  return <div className={`popover ${className}`} ref={ref} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
    <button ref={button} className="icon-button" aria-label={label} title={label} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Icon name={icon}/></button>
    {open&&<div className="popover-panel" role="group" aria-label={label}>{children}</div>}
  </div>;
}
