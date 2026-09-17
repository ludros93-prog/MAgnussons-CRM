'use client';
import type { ReactNode } from 'react';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
export function BusinessField({label,children}:{label:string;children:ReactNode}){return <label className="biz-field"><span>{label}</span>{children}</label>}
export function Pick({value,onChange,items,label}:{value:string;onChange:(v:string)=>void;items:{id:string;label:string}[];label:string}){return <Select value={value||'_none'} onValueChange={v=>onChange(v==='_none'?'':v)}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{items.map(i=><SelectItem key={i.id} value={i.id||'_none'}>{i.label}</SelectItem>)}</SelectContent></Select>}
export const money=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:2}).format(n);
export const displayDate=(d:string)=>d?new Date(d.slice(0,10)+'T12:00:00').toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'}):'Ej angivet';
export type SaveAction=(type:string,data:unknown,close?:boolean)=>Promise<boolean>;
