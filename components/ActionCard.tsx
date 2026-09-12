"use client";

import type { WebAction } from "@/lib/actions";

const icons: Record<WebAction["kind"], string> = {
  open_url: "↗", search_web: "⌕", phone: "☎", email: "✉", maps: "⌖", calendar: "▦", shopping: "◇", media: "▶", travel: "✈", translate: "文", news: "N", weather: "☁",
};

export default function ActionCard({ action, onDone }: { action: WebAction; onDone: () => void }) {
  const button = action.kind === "phone" ? "Call" : action.kind === "email" ? "Compose" : action.kind === "maps" ? "Open Maps" : action.kind === "calendar" ? "Open Calendar" : action.kind === "search_web" ? "Search" : action.kind === "shopping" ? "Shop" : action.kind === "media" ? "Open YouTube" : action.kind === "travel" ? "Compare" : action.kind === "translate" ? "Translate" : action.kind === "news" ? "News" : action.kind === "weather" ? "Weather" : "Open";
  return (
    <div className="actionCard">
      <div className="actionIcon">{icons[action.kind]}</div>
      <div className="actionBody">
        <div className="actionEyebrow">IMMEDIATE ACTION · READY</div>
        <strong>{action.title}</strong>
        <span>{action.detail}</span>
        {action.kind === "shopping" && action.comparison && (
          <div className="giftComparison">
            {action.comparison.map((item) => (
              <button key={item.name} className="giftOption" onClick={() => window.open(item.url, "_blank", "noopener,noreferrer") }>
                <div><strong>{item.name}</strong><b>{item.price}</b></div>
                <p>{item.why}</p>
              </button>
            ))}
          </div>
        )}
        {action.kind === "shopping" && action.links && <div className="shoppingLinks">{action.links.map((link) => <button key={link.url} onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}>{link.label}</button>)}</div>}
      </div>
      <div className="actionButtons">
        <button className="actionButton" onClick={() => { window.open(action.url, "_blank", "noopener,noreferrer"); }}>{button}</button>
        <button className="ghost" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
