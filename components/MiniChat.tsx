"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { ConversationMessage } from "@/lib/conversation";
import FutureInput from "@/components/FutureInput";
import ConversationPanel from "@/components/ConversationPanel";
export default function MiniChat({messages,locale,status,onSubmit}:{messages:ConversationMessage[];locale:Locale;status:string;onSubmit:(text:string,locale:Locale)=>void}){
 const [open,setOpen]=useState(false);
 return <><button className="v33MiniChat" onClick={()=>setOpen(true)}><span className="v33MiniOrb"/><div><strong>Ask Future</strong><small>{locale==="th"?"มีอะไรให้ช่วยวันนี้?":locale==="fr"?"Comment puis-je aider ?":"How can I help?"}</small></div><b>↗</b></button>{open&&<div className="v33ChatBackdrop" role="dialog" aria-modal="true"><section className="v33ChatModal"><header><div><span className="v33MiniOrb"/><div><strong>Chat with Future</strong><small>Think it. Say it. Done.</small></div></div><button onClick={()=>setOpen(false)}>×</button></header><div className="v33ChatMessages"><ConversationPanel messages={messages}/></div><div className="v33ChatInput"><FutureInput onSubmit={onSubmit} status={status} locale={locale}/></div></section></div>}</>
}
