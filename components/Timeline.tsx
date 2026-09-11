"use client";
import type {FutureItem} from "@/lib/types"; import type {Locale} from "@/lib/i18n"; import {copy,localeTag} from "@/lib/i18n";
function dateOf(i:FutureItem){return new Date(i.startsAt??i.dueAt??i.remindAt??i.createdAt)}
export default function Timeline({items,onDelete,onComplete,locale}:{items:FutureItem[];onDelete:(id:string)=>void;onComplete:(id:string)=>void;locale:Locale}){
 const t=copy[locale],tag=localeTag[locale];
 const sorted=[...items].sort((a,b)=>Number(!!a.completedAt)-Number(!!b.completedAt) || dateOf(a).getTime()-dateOf(b).getTime());
 if(!sorted.length)return <div className="empty">{t.empty}</div>;
 const doneLabel=locale==='th'?'เสร็จแล้ว':locale==='fr'?'Terminé':'Done';
 return <div>{sorted.map(item=>{const d=dateOf(item);return <div className={`card ${item.completedAt?'completed':''}`} key={item.id}><div className="time">{new Intl.DateTimeFormat(tag,{hour:"2-digit",minute:"2-digit"}).format(d)}</div><div style={{flex:1}}><div className="cardTitle">{item.title}</div><div className="cardMeta">{new Intl.DateTimeFormat(tag,{weekday:"short",month:"short",day:"numeric"}).format(d)}{item.reminderMinutesBefore?` · ${t.reminder} ${item.reminderMinutesBefore} min`:""}{item.completedAt?` · ${doneLabel}`:""}</div><div className="actions">{!item.completedAt&&<button className="ghost completeButton" onClick={()=>onComplete(item.id)}>✓ {doneLabel}</button>}<button className="ghost danger" onClick={()=>onDelete(item.id)}>{t.del}</button></div></div><div className="typeBadge">{item.type}</div></div>})}</div>
}
