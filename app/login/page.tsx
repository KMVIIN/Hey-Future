"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const supabase = createClient();
    if (!supabase) { setMessage("Supabase is not configured yet."); setBusy(false); return; }
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/auth/callback` } });
      setMessage(error ? error.message : "Account created. Check your email if confirmation is enabled, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message); else location.href = "/";
    }
    setBusy(false);
  }

  return <main className="authPage"><section className="authCard"><div className="gateOrb"/><h1>Future</h1><p>Your AI Secretary</p>
    <div className="authTabs"><button className={mode==="signin"?"active":""} onClick={()=>setMode("signin")}>Sign in</button><button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Create account</button></div>
    <form onSubmit={submit}>{mode==="signup"&&<label>Name<input value={name} onChange={e=>setName(e.target.value)} required/></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primaryBtn" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account":"Sign in"}</button></form>
    {message&&<div className="authMessage">{message}</div>}<div className="authLinks"><Link href="/pricing">See plans</Link><Link href="/">Back to Future</Link></div>
  </section><footer className="legalFooter authLegalFooter"><span>© 2026 KÄN inc. · Future AI Assistance is operated by KÄN inc.</span><Link href="/legal">Mentions légales</Link><Link href="/cgv">CGV</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Terms</Link><Link href="/cancel-subscription">Cancel subscription</Link><Link href="/contact">Contact</Link><Link href="/alerts-safety">Alerts & safety</Link></footer></main>;
}
