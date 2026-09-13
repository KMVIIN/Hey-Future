"use client";
import type { ReactNode } from "react";
export default function WorkspaceModal({title,subtitle,onClose,children}:{title:string;subtitle?:string;onClose:()=>void;children:ReactNode}){
  return <div className="v33WorkspaceBackdrop" role="dialog" aria-modal="true" aria-label={title}>
    <section className="v33WorkspaceModal">
      <header><div><span>FUTURE WORKSPACE</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button onClick={onClose} aria-label="Close">×</button></header>
      <div className="v33WorkspaceBody">{children}</div>
    </section>
  </div>
}
