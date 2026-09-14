"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { ConversationMessage } from "@/lib/conversation";
import FutureInput from "@/components/FutureInput";
import ConversationPanel from "@/components/ConversationPanel";

export default function MiniChat({messages,locale,status,onSubmit}:{messages:ConversationMessage[];locale:Locale;status:string;onSubmit:(text:string,locale:Locale)=>void}){
  const [open,setOpen]=useState(false);
  const label=locale==="th"?"คุยกับ Future":locale==="fr"?"Parler à Future":"Chat with Future";
  return <>
    <button className="futureChatLauncher" onClick={()=>setOpen(true)} aria-label={label} title={label}>
      <span className="futureChatSun" aria-hidden="true" />
      <span className="futureChatLauncherLabel">Future</span>
    </button>
    {open&&<div className="v33ChatBackdrop" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <section className="v33ChatModal futureChatPopup">
        <header>
          <div><span className="futureChatSun futureChatSunSmall"/><div><strong>{label}</strong><small>Think it. Say it. Done.</small></div></div>
          <button className="futureChatClose" onClick={()=>setOpen(false)} aria-label="Close">×</button>
        </header>
        <div className="v33ChatMessages"><ConversationPanel messages={messages}/></div>
        <div className="v33ChatInput"><FutureInput onSubmit={onSubmit} status={status} locale={locale}/></div>
      </section>
    </div>}
  </>
}
