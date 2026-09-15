"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { FUTURE_ACCOUNTING_EVENT, type FutureAccountingEntryInput } from "@/lib/accounting-events";

type Entry={id:string;date:string;type:"income"|"expense";category:string;description:string;amount:number};
const KEY="future.accounting.v1";
const today=()=>new Date().toISOString().slice(0,10);

export default function AccountingPanel({locale}:{locale:Locale}){
 const [entries,setEntries]=useState<Entry[]>([]); const [date,setDate]=useState(today()); const [type,setType]=useState<Entry["type"]>("expense"); const [category,setCategory]=useState(""); const [description,setDescription]=useState(""); const [amount,setAmount]=useState("");
 useEffect(()=>{try{const raw=localStorage.getItem(KEY);if(raw)setEntries(JSON.parse(raw))}catch{}},[]);
 useEffect(()=>{
   const receive=(event:Event)=>{
     const input=(event as CustomEvent<FutureAccountingEntryInput>).detail;
     if(!input||!Number.isFinite(input.amount)||input.amount<=0||!input.description?.trim())return;
     setEntries(current=>{
       const next=[{id:crypto.randomUUID(),date:input.date||today(),type:input.type,category:input.category?.trim()||"Other",description:input.description.trim(),amount:input.amount},...current];
       localStorage.setItem(KEY,JSON.stringify(next)); return next;
     });
   };
   window.addEventListener(FUTURE_ACCOUNTING_EVENT,receive);
   return()=>window.removeEventListener(FUTURE_ACCOUNTING_EVENT,receive);
 },[]);
 function persist(next:Entry[]){setEntries(next);localStorage.setItem(KEY,JSON.stringify(next))}
 function add(e:FormEvent){e.preventDefault();const n=Number(String(amount).replace(",","."));if(!description.trim()||!Number.isFinite(n)||n<=0)return;persist([{id:crypto.randomUUID(),date,type,category:category.trim()||"Other",description:description.trim(),amount:n},...entries]);setDescription("");setAmount("")}
 const totals=useMemo(()=>{const income=entries.filter(x=>x.type==="income").reduce((a,b)=>a+b.amount,0);const expense=entries.filter(x=>x.type==="expense").reduce((a,b)=>a+b.amount,0);return {income,expense,balance:income-expense}},[entries]);
 function exportCsv(){const esc=(v:string|number)=>`"${String(v).replace(/"/g,'""')}"`;const rows=[["Date","Type","Category","Description","Amount"],...entries.map(x=>[x.date,x.type,x.category,x.description,x.amount])];const blob=new Blob(["\ufeff"+rows.map(r=>r.map(esc).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=`future-accounting-${today()}.csv`;a.click();URL.revokeObjectURL(u)}
 const t=locale==="th"?{title:"บัญชีรายรับ–รายจ่าย",sub:"บันทึกรายรับ รายจ่าย ดูยอดคงเหลือ และส่งออก CSV",income:"รายรับ",expense:"รายจ่าย",balance:"คงเหลือ",date:"วันที่",cat:"หมวดหมู่",desc:"รายละเอียด",amt:"จำนวนเงิน",add:"เพิ่มรายการ",export:"ส่งออก CSV",empty:"ยังไม่มีรายการบัญชี"}:locale==="fr"?{title:"Comptabilité simple",sub:"Suivez recettes, dépenses, solde et exportez en CSV",income:"Recettes",expense:"Dépenses",balance:"Solde",date:"Date",cat:"Catégorie",desc:"Description",amt:"Montant",add:"Ajouter",export:"Exporter CSV",empty:"Aucune écriture"}:{title:"Simple accounting",sub:"Track income, expenses, balance and export CSV",income:"Income",expense:"Expenses",balance:"Balance",date:"Date",cat:"Category",desc:"Description",amt:"Amount",add:"Add entry",export:"Export CSV",empty:"No accounting entries yet"};
 return <section className="dashboardCard v44Accounting"><div className="panelHeading"><div><span className="eyebrow">ACCOUNTING</span><h3>{t.title}</h3></div><button className="softButton" onClick={exportCsv} disabled={!entries.length}>{t.export}</button></div><p className="panelIntro">{t.sub}</p><div className="v44AccountingTotals"><div><span>{t.income}</span><strong>€{totals.income.toFixed(2)}</strong></div><div><span>{t.expense}</span><strong>€{totals.expense.toFixed(2)}</strong></div><div><span>{t.balance}</span><strong>€{totals.balance.toFixed(2)}</strong></div></div><form className="v44AccountingForm" onSubmit={add}><input type="date" value={date} onChange={e=>setDate(e.target.value)} aria-label={t.date}/><select value={type} onChange={e=>setType(e.target.value as Entry["type"])}><option value="expense">{t.expense}</option><option value="income">{t.income}</option></select><input value={category} onChange={e=>setCategory(e.target.value)} placeholder={t.cat}/><input className="wide" value={description} onChange={e=>setDescription(e.target.value)} placeholder={t.desc}/><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" aria-label={t.amt}/><button>{t.add}</button></form><div className="v44AccountingList">{entries.length?entries.slice(0,8).map(x=><article key={x.id}><span>{x.date}</span><div><strong>{x.description}</strong><small>{x.category}</small></div><b className={x.type}>{x.type==="income"?"+":"−"}€{x.amount.toFixed(2)}</b><button onClick={()=>persist(entries.filter(e=>e.id!==x.id))}>×</button></article>):<div className="emptyMini">{t.empty}</div>}</div></section>
}
