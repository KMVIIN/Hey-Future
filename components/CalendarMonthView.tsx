"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { FutureItem, FutureItemType } from "@/lib/types";

function keyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function itemDate(item: FutureItem) {
  const raw = item.startsAt ?? item.dueAt ?? item.remindAt;
  return raw ? new Date(raw) : null;
}
function localInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}T${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
}

export default function CalendarMonthView({items, locale, selectedDate, onSelectDate, onAdd, onUpdate, onDelete}:{
  items: FutureItem[];
  locale: Locale;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onAdd: (item: Omit<FutureItem,"id"|"createdAt">) => void;
  onUpdate: (id:string, patch:Partial<FutureItem>)=>void;
  onDelete: (id:string)=>void;
}) {
  const [cursor, setCursor] = useState(()=>new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const [mode, setMode] = useState<"month"|"year">("month");
  const [editing, setEditing] = useState<FutureItem|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title,setTitle]=useState("");
  const [type,setType]=useState<FutureItemType>("event");
  const [when,setWhen]=useState("");

  const lang = locale === "th" ? "th-TH" : locale === "fr" ? "fr-FR" : "en-US";
  const monthLabel = cursor.toLocaleDateString(lang,{month:"long",year:"numeric"});
  const weekdays = locale === "th" ? ["อา","จ","อ","พ","พฤ","ศ","ส"] : locale === "fr" ? ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const txt = locale === "th" ? {today:"วันนี้",month:"เดือน",year:"12 เดือน",add:"+ เพิ่มรายการ",save:"บันทึก",cancel:"ยกเลิก",edit:"แก้ไข",del:"ลบ",title:"ปฏิทิน"} : locale === "fr" ? {today:"Aujourd’hui",month:"Mois",year:"12 mois",add:"+ Ajouter",save:"Enregistrer",cancel:"Annuler",edit:"Modifier",del:"Supprimer",title:"Calendrier"} : {today:"Today",month:"Month",year:"12 months",add:"+ Add item",save:"Save",cancel:"Cancel",edit:"Edit",del:"Delete",title:"Calendar"};

  const monthItems = useMemo(()=>{
    const map = new Map<string,FutureItem[]>();
    items.forEach(item=>{ const d=itemDate(item); if(!d) return; const k=keyOf(d); map.set(k,[...(map.get(k)??[]),item]); });
    return map;
  },[items]);

  const cells = useMemo(()=>{
    const first = new Date(cursor.getFullYear(),cursor.getMonth(),1);
    const start = new Date(first); start.setDate(first.getDate()-first.getDay());
    return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
  },[cursor]);

  function openAdd(date=selectedDate){
    const d=new Date(date); d.setHours(9,0,0,0); setEditing(null); setTitle(""); setType("event"); setWhen(localInput(d)); setShowForm(true);
  }
  function openEdit(item:FutureItem){ const d=itemDate(item)??selectedDate; setEditing(item); setTitle(item.title); setType(item.type); setWhen(localInput(d)); setShowForm(true); }
  function save(){ if(!title.trim()||!when)return; const iso=new Date(when).toISOString(); const times={startsAt:type==="event"?iso:undefined,dueAt:type==="task"?iso:undefined,remindAt:type==="reminder"?iso:undefined}; if(editing) onUpdate(editing.id,{title:title.trim(),type,...times,rawText:title.trim()}); else onAdd({title:title.trim(),type,...times,rawText:title.trim()}); setShowForm(false); setEditing(null); }

  return <section className="v32Card v32Calendar" id="calendar">
    <div className="v32PanelHead"><div className="v32Title"><span className="v32Icon">▦</span><strong>{txt.title}</strong></div><div className="v32CalendarModes"><button className={mode==="month"?"active":""} onClick={()=>setMode("month")}>{txt.month}</button><button className={mode==="year"?"active":""} onClick={()=>setMode("year")}>{txt.year}</button></div></div>
    {mode === "month" ? <>
      <div className="v32CalendarToolbar"><button onClick={()=>{const d=new Date();setCursor(new Date(d.getFullYear(),d.getMonth(),1));onSelectDate(d)}}>{txt.today}</button><div className="v32MonthNav"><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))}>‹</button><strong>{monthLabel}</strong><button onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))}>›</button></div><button className="v32PrimarySm" onClick={()=>openAdd()}>+ Add</button></div>
      <div className="v32Weekdays">{weekdays.map(d=><span key={d}>{d}</span>)}</div>
      <div className="v32MonthGrid">{cells.map(day=>{const k=keyOf(day); const dayItems=monthItems.get(k)??[]; const outside=day.getMonth()!==cursor.getMonth(); const selected=k===keyOf(selectedDate); const today=k===keyOf(new Date()); return <button key={k} className={`v32Day ${outside?"outside":""} ${selected?"selected":""} ${today?"today":""}`} onClick={()=>onSelectDate(day)} onDoubleClick={()=>openAdd(day)}><span className="v32DayNum">{day.getDate()}</span><div className="v32DayItems">{dayItems.slice(0,2).map(item=><span key={item.id} className={`v32Event ${item.type}`} title={item.title} onClick={(e)=>{e.stopPropagation();openEdit(item)}}>{item.title}</span>)}{dayItems.length>2&&<small>+{dayItems.length-2}</small>}</div></button>})}</div>
      <div className="v32Legend"><span>● Meeting</span><span>✈ Travel</span><span>● Task</span><span>● Reminder</span><button onClick={()=>openAdd()}>{txt.add}</button></div>
    </> : <div className="v32YearGrid">{Array.from({length:12},(_,m)=>{const d=new Date(cursor.getFullYear(),m,1);return <button key={m} onClick={()=>{setCursor(d);setMode("month")}}><strong>{d.toLocaleDateString(lang,{month:"long"})}</strong><span>{items.filter(i=>{const x=itemDate(i);return x&&x.getFullYear()===d.getFullYear()&&x.getMonth()===m}).length} items</span></button>})}</div>}
    {showForm&&<div className="v32ModalBackdrop" onMouseDown={()=>setShowForm(false)}><div className="v32Modal" onMouseDown={e=>e.stopPropagation()}><h3>{editing?txt.edit:txt.add}</h3><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} autoFocus/></label><label>Date & time<input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/></label><label>Type<select value={type} onChange={e=>setType(e.target.value as FutureItemType)}><option value="event">Event</option><option value="task">Task</option><option value="reminder">Reminder</option></select></label><div className="v32ModalActions">{editing&&<button className="dangerText" onClick={()=>{onDelete(editing.id);setShowForm(false)}}>{txt.del}</button>}<span/><button onClick={()=>setShowForm(false)}>{txt.cancel}</button><button className="v32PrimarySm" onClick={save}>{txt.save}</button></div></div></div>}
  </section>
}
