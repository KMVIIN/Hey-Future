"use client";
import type { FutureItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
export default function HistoryPanel({items,locale,onRestore,onDelete}:{items:FutureItem[];locale:Locale;onRestore:(id:string)=>void;onDelete:(id:string)=>void}){
 const done=items.filter(i=>i.completedAt).sort((a,b)=>new Date(b.completedAt!).getTime()-new Date(a.completedAt!).getTime());
 const title=locale==="th"?"ประวัติงานที่เสร็จแล้ว":locale==="fr"?"Historique des tâches terminées":"Completed history";
 return <section className="v33PanelPage"><div className="v33PageIntro"><div><span>HISTORY</span><h3>{title}</h3><p>{locale==="th"?"ตรวจสอบว่างานไหนเสร็จเมื่อไหร่ และนำกลับมาทำต่อได้":locale==="fr"?"Voyez quand chaque tâche a été terminée et restaurez-la si nécessaire.":"See exactly when work was completed and restore it when needed."}</p></div><strong>{done.length}</strong></div>
 <div className="v33HistoryList">{done.length===0?<div className="v33EmptyState">No completed work yet.</div>:done.map(i=><article key={i.id}><div className="v33HistoryIcon">✓</div><div><strong>{i.title}</strong><span>{new Date(i.completedAt!).toLocaleString(locale==="th"?"th-TH":locale==="fr"?"fr-FR":"en-US")}</span><small>{i.type} · created {new Date(i.createdAt).toLocaleDateString()}</small></div><div className="v33RowActions"><button onClick={()=>onRestore(i.id)}>Restore</button><button className="dangerText" onClick={()=>onDelete(i.id)}>Delete</button></div></article>)}</div></section>
}
