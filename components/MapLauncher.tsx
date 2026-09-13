"use client";
import type { Locale } from "@/lib/i18n";
export default function MapLauncher({locale,onOpen}:{locale:Locale;onOpen:()=>void}){
 return <button className="v44MiniMap" onClick={onOpen}><span>⌖</span><div><strong>Map & Places</strong><small>{locale==="th"?"ค้นหาสถานที่และเส้นทาง":locale==="fr"?"Lieux et itinéraires":"Places and directions"}</small></div><b>↗</b></button>
}
