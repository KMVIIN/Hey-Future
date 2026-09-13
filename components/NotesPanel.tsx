"use client";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Note={id:string;title:string;body:string;updatedAt:string;tone:number};
const KEY="future.notes.v1";

export default function NotesPanel({locale}:{locale:Locale}){
 const [notes,setNotes]=useState<Note[]>([]);
 const [query,setQuery]=useState("");
 const [editing,setEditing]=useState<Note|null>(null);
 const [title,setTitle]=useState("");
 const [body,setBody]=useState("");
 const [quick,setQuick]=useState("");
 useEffect(()=>{try{const r=localStorage.getItem(KEY);if(r)setNotes(JSON.parse(r))}catch{}},[]);
 useEffect(()=>{if(notes.length||localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(notes))},[notes]);
 const filtered=useMemo(()=>notes.filter(n=>(n.title+" "+n.body).toLowerCase().includes(query.toLowerCase())),[notes,query]);
 function open(n?:Note){setEditing(n??null);setTitle(n?.title??"");setBody(n?.body??"")}
 function save(){if(!title.trim()&&!body.trim())return; const now=new Date().toISOString(); if(editing)setNotes(ns=>ns.map(n=>n.id===editing.id?{...n,title:title.trim()||"Note",body,updatedAt:now}:n));else setNotes(ns=>[{id:crypto.randomUUID(),title:title.trim()||"Note",body,updatedAt:now,tone:ns.length%4},...ns]);setEditing(null);setTitle("");setBody("")}
 function quickSave(){const value=quick.trim();if(!value)return;const now=new Date().toISOString();setNotes(ns=>[{id:crypto.randomUUID(),title:value.slice(0,60),body:value,updatedAt:now,tone:ns.length%4},...ns]);setQuick("")}
 const addLabel=locale==="th"?"+ โน้ตใหม่":locale==="fr"?"+ Nouvelle note":"+ New note";
 const quickPlaceholder=locale==="th"?"พิมพ์โน้ตตรงนี้ แล้วกด Add…":locale==="fr"?"Écrivez une note ici puis cliquez sur Ajouter…":"Type a note here, then click Add…";
 return <section className="v32Card v32Notes"><div className="v32PanelHead"><div className="v32Title"><span className="v32Icon">▤</span><strong>Notes</strong></div><button className="v32PrimarySm" onClick={()=>open()}>{addLabel}</button></div>
 <div className="v41QuickNote"><textarea value={quick} onChange={e=>setQuick(e.target.value)} placeholder={quickPlaceholder} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")quickSave()}}/><button className="v32PrimarySm" onClick={quickSave}>{locale==="th"?"เพิ่ม":"Add"}</button></div>
 <input className="v32NoteSearch" placeholder={locale==="th"?"ค้นหาโน้ต...":"Search notes..."} value={query} onChange={e=>setQuery(e.target.value)}/>{(editing!==null||title||body)&&<div className="v32NoteEditor"><input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/><textarea placeholder="Write anything..." value={body} onChange={e=>setBody(e.target.value)}/><div><button onClick={()=>{setEditing(null);setTitle("");setBody("")}}>Cancel</button><button className="v32PrimarySm" onClick={save}>Save</button></div></div>}<div className="v32NotesList">{filtered.length===0?<div className="v32EmptyNote">{locale==="th"?"ยังไม่มีโน้ต — พิมพ์ในช่องด้านบนได้เลย":"No notes yet — type in the box above."}</div>:filtered.map(note=><article key={note.id} className={`tone${note.tone}`} onClick={()=>open(note)}><div><strong>{note.title}</strong><button onClick={e=>{e.stopPropagation();setNotes(ns=>ns.filter(n=>n.id!==note.id))}}>×</button></div><p>{note.body||"—"}</p><small>{new Date(note.updatedAt).toLocaleDateString()}</small></article>)}</div></section>
}
