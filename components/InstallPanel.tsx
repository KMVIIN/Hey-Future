"use client";

import { useEffect, useState } from "react";

type State = {
  isIOS: boolean;
  isSafari: boolean;
  isStandalone: boolean;
  isSecure: boolean;
};

export default function InstallPanel() {
  const [state, setState] = useState<State>({ isIOS: false, isSafari: false, isStandalone: false, isSecure: false });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setState({ isIOS, isSafari, isStandalone, isSecure: window.isSecureContext });
  }, []);

  if (!state.isIOS || state.isStandalone) return null;

  return (
    <section className="installPanel">
      <div>
        <span className="eyebrow">IPHONE / SAFARI</span>
        <strong>Install Future like an app</strong>
        <p>
          {state.isSecure
            ? "Open this page in Safari, tap Share, choose Add to Home Screen, keep Open as Web App on, then tap Add."
            : "Future is running on local HTTP. Voice and web-app features are more reliable after you deploy this project to a free HTTPS URL."}
        </p>
      </div>
      <button className="ghost" onClick={() => setOpen((value) => !value)}>{open ? "Hide" : "How"}</button>
      {open && (
        <div className="installSteps">
          <span>1. Open the HTTPS Future link in Safari.</span>
          <span>2. Tap Share.</span>
          <span>3. Tap Add to Home Screen.</span>
          <span>4. Turn on Open as Web App, then tap Add.</span>
          <span>5. Launch Future from the new Home Screen icon.</span>
        </div>
      )}
    </section>
  );
}
