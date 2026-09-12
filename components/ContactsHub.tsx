"use client";

import { useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { importVCard, makeContact, mergeContact, type FutureContact } from "@/lib/contacts";

export default function ContactsHub({ contacts, locale, onChange }: { contacts: FutureContact[]; locale: Locale; onChange: (contacts: FutureContact[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", aliases: "", note: "" });
  const tx = locale === "th" ? {
    eyebrow:"CONTACTS HUB", title:"รายชื่อของ Future", add:"เพิ่มรายชื่อ", import:"นำเข้า .vcf", empty:"ยังไม่มีรายชื่อ เพิ่มเองหรือนำเข้า vCard ได้", search:"ค้นหาชื่อ / ชื่อเล่น", name:"ชื่อ", phone:"เบอร์โทร", email:"อีเมล", aliases:"ชื่อเรียก / ความสัมพันธ์", note:"โน้ต", save:"บันทึก", cancel:"ยกเลิก", local:"เก็บในเครื่องนี้", native:"รายชื่อจาก iPhone/SIM จะเชื่อมตรงได้เมื่อ Future เป็น native app", delete:"ลบ"
  } : locale === "fr" ? {
    eyebrow:"CONTACTS HUB", title:"Contacts Future", add:"Ajouter", import:"Importer .vcf", empty:"Aucun contact. Ajoutez-en un ou importez une vCard.", search:"Rechercher nom / alias", name:"Nom", phone:"Téléphone", email:"E-mail", aliases:"Alias / relation", note:"Note", save:"Enregistrer", cancel:"Annuler", local:"Stocké sur cet appareil", native:"Les contacts iPhone/SIM pourront être reliés directement avec l’app native Future.", delete:"Supprimer"
  } : {
    eyebrow:"CONTACTS HUB", title:"Future contacts", add:"Add contact", import:"Import .vcf", empty:"No contacts yet. Add one or import a vCard.", search:"Search name / alias", name:"Name", phone:"Phone", email:"Email", aliases:"Aliases / relation", note:"Note", save:"Save", cancel:"Cancel", local:"Stored on this device", native:"iPhone/SIM contacts can connect directly when Future becomes a native app.", delete:"Delete"
  };

  const shown = contacts.filter(c => !query.trim() || [c.name, ...c.aliases, ...c.phones, ...c.emails].join(" ").toLowerCase().includes(query.toLowerCase()));
  function submit(e: React.FormEvent) {
    e.preventDefault(); if (!form.name.trim()) return;
    onChange([...contacts, makeContact(form)]); setForm({ name:"", phone:"", email:"", aliases:"", note:"" }); setOpen(false);
  }
  async function onImport(file?: File) {
    if (!file) return;
    const imported = importVCard(await file.text());
    let next = [...contacts];
    for (const incoming of imported) {
      const idx = next.findIndex(c => c.name.toLowerCase() === incoming.name.toLowerCase() || (incoming.phones[0] && c.phones.includes(incoming.phones[0])));
      if (idx >= 0) next[idx] = mergeContact(next[idx], incoming); else next.push(incoming);
    }
    onChange(next); if (fileRef.current) fileRef.current.value = "";
  }

  return <section className="contactsHub">
    <div className="panelHeading"><div><span className="eyebrow">{tx.eyebrow}</span><h3>{tx.title}</h3></div><span className="phaseBadge">Phase 2</span></div>
    <div className="contactToolbar">
      <button className="contactPrimary" onClick={()=>setOpen(!open)}>＋ {tx.add}</button>
      <button className="ghost" onClick={()=>fileRef.current?.click()}>⇧ {tx.import}</button>
      <input ref={fileRef} hidden type="file" accept=".vcf,text/vcard,text/x-vcard" onChange={e=>onImport(e.target.files?.[0])}/>
    </div>
    {open && <form className="contactForm" onSubmit={submit}>
      <input placeholder={tx.name} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
      <input placeholder={tx.phone} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
      <input placeholder={tx.email} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <input placeholder={`${tx.aliases} · แม่, Mom, Maman`} value={form.aliases} onChange={e=>setForm({...form,aliases:e.target.value})}/>
      <input placeholder={tx.note} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
      <div className="contactFormActions"><button type="button" className="ghost" onClick={()=>setOpen(false)}>{tx.cancel}</button><button className="contactPrimary" type="submit">{tx.save}</button></div>
    </form>}
    {contacts.length > 4 && <input className="contactSearch" placeholder={tx.search} value={query} onChange={e=>setQuery(e.target.value)}/>} 
    <div className="contactList">
      {!shown.length && <div className="contactEmpty">{tx.empty}</div>}
      {shown.map(c => <div className="contactRow" key={c.id}>
        <div className="contactAvatar">{c.name.slice(0,1).toUpperCase()}</div>
        <div className="contactInfo"><strong>{c.name}</strong><span>{c.aliases.length ? c.aliases.join(" · ") : c.phones[0] || c.emails[0] || "—"}</span></div>
        <div className="contactQuick">
          {c.phones[0] && <a href={`tel:${c.phones[0]}`} title="Call">☎</a>}
          {c.phones[0] && <a href={`sms:${c.phones[0]}`} title="Message">✉</a>}
          <button title={tx.delete} onClick={()=>onChange(contacts.filter(x=>x.id!==c.id))}>×</button>
        </div>
      </div>)}
    </div>
    <div className="privacyLine">⌾ {tx.local}<br/><span>{tx.native}</span></div>
  </section>;
}
