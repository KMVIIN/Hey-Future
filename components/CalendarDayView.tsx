"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { FutureItem, FutureItemType } from "@/lib/types";

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function itemDate(item: FutureItem) {
  const raw = item.startsAt ?? item.dueAt ?? item.remindAt;
  return raw ? new Date(raw) : null;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy;
}

function toLocalInput(iso?: string, fallback?: Date) {
  const date = iso ? new Date(iso) : fallback ?? new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export default function CalendarDayView({
  items,
  locale,
  onAdd,
  onUpdate,
  onDelete,
  onComplete,
}: {
  items: FutureItem[];
  locale: Locale;
  onAdd: (item: Omit<FutureItem, "id" | "createdAt">) => void;
  onUpdate: (id: string, patch: Partial<FutureItem>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const [selected, setSelected] = useState(() => new Date());
  const [editing, setEditing] = useState<FutureItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<FutureItemType>("event");
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return toLocalInput(undefined, d);
  });

  const text = locale === "th"
    ? { eyebrow: "CALENDAR", title: "แผนรายวัน", today: "วันนี้", add: "+ เพิ่มรายการ", empty: "วันนี้ยังไม่มีรายการ คุณสามารถเพิ่มนัด งาน หรือเตือนความจำได้", edit: "แก้ไข", del: "ลบ", done: "เสร็จ", save: "บันทึก", cancel: "ยกเลิก", name: "ชื่อรายการ", date: "วันและเวลา", event: "นัดหมาย", task: "งาน", reminder: "เตือนความจำ", free: "ว่าง", item: "รายการ", prev: "สัปดาห์ก่อน", next: "สัปดาห์ถัดไป" }
    : locale === "fr"
    ? { eyebrow: "CALENDRIER", title: "Agenda du jour", today: "Aujourd’hui", add: "+ Ajouter", empty: "Aucun élément ce jour. Ajoutez un rendez-vous, une tâche ou un rappel.", edit: "Modifier", del: "Supprimer", done: "Terminé", save: "Enregistrer", cancel: "Annuler", name: "Titre", date: "Date et heure", event: "Rendez-vous", task: "Tâche", reminder: "Rappel", free: "Libre", item: "élément(s)", prev: "Semaine précédente", next: "Semaine suivante" }
    : { eyebrow: "CALENDAR", title: "Day planner", today: "Today", add: "+ Add item", empty: "Nothing planned yet. Add an event, task, or reminder.", edit: "Edit", del: "Delete", done: "Done", save: "Save", cancel: "Cancel", name: "Title", date: "Date & time", event: "Event", task: "Task", reminder: "Reminder", free: "Free", item: "item(s)", prev: "Previous week", next: "Next week" };

  const week = useMemo(() => {
    const start = startOfWeek(selected);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selected]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.completedAt) continue;
      const d = itemDate(item);
      if (!d || Number.isNaN(d.getTime())) continue;
      const key = dateKey(d);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const selectedItems = useMemo(() => items
    .filter((item) => {
      const d = itemDate(item);
      return d && dateKey(d) === dateKey(selected);
    })
    .sort((a, b) => (itemDate(a)?.getTime() ?? 0) - (itemDate(b)?.getTime() ?? 0)), [items, selected]);

  function openNew() {
    const d = new Date(selected);
    d.setHours(9, 0, 0, 0);
    setEditing(null);
    setTitle("");
    setType("event");
    setWhen(toLocalInput(undefined, d));
    setShowForm(true);
  }

  function openEdit(item: FutureItem) {
    setEditing(item);
    setTitle(item.title);
    setType(item.type);
    setWhen(toLocalInput(item.startsAt ?? item.dueAt ?? item.remindAt));
    setShowForm(true);
  }

  function save() {
    if (!title.trim() || !when) return;
    const iso = new Date(when).toISOString();
    const times: Pick<FutureItem, "startsAt" | "dueAt" | "remindAt"> = {
      startsAt: type === "event" ? iso : undefined,
      dueAt: type === "task" ? iso : undefined,
      remindAt: type === "reminder" ? iso : undefined,
    };
    if (editing) {
      onUpdate(editing.id, { title: title.trim(), type, ...times, rawText: title.trim() });
    } else {
      onAdd({ title: title.trim(), type, ...times, rawText: title.trim() });
    }
    setShowForm(false);
    setEditing(null);
  }

  const selectedLabel = selected.toLocaleDateString(locale === "th" ? "th-TH" : locale === "fr" ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <section className="calendarDayView" id="calendar">
      <div className="panelHeading calendarHeading">
        <div><span className="eyebrow">{text.eyebrow}</span><h3>{text.title}</h3></div>
        <div className="calendarHeadActions"><button className="softButton compact" onClick={() => setSelected(new Date())}>{text.today}</button><button className="primary compact" onClick={openNew}>{text.add}</button></div>
      </div>

      <div className="calendarWeekNav">
        <button aria-label={text.prev} onClick={() => setSelected((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}>‹</button>
        <div className="calendarWeekStrip">
          {week.map((day) => {
            const key = dateKey(day);
            const count = counts.get(key) ?? 0;
            const active = key === dateKey(selected);
            const today = key === dateKey(new Date());
            return <button key={key} className={`${active ? "active" : ""} ${today ? "today" : ""}`} onClick={() => setSelected(day)}>
              <span>{day.toLocaleDateString(locale === "th" ? "th-TH" : locale === "fr" ? "fr-FR" : "en-US", { weekday: "short" })}</span>
              <strong>{day.getDate()}</strong>
              <small>{count ? `${count} ${text.item}` : text.free}</small>
            </button>;
          })}
        </div>
        <button aria-label={text.next} onClick={() => setSelected((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}>›</button>
      </div>

      <div className="calendarSelectedTitle"><strong>{selectedLabel}</strong><span>{selectedItems.length ? `${selectedItems.length} ${text.item}` : text.free}</span></div>

      {showForm && <div className="calendarEditor">
        <label>{text.name}<input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
        <label>{text.date}<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
        <label>Type<select value={type} onChange={(e) => setType(e.target.value as FutureItemType)}><option value="event">{text.event}</option><option value="task">{text.task}</option><option value="reminder">{text.reminder}</option></select></label>
        <div className="calendarEditorActions"><button className="ghost" onClick={() => setShowForm(false)}>{text.cancel}</button><button className="primary" onClick={save}>{text.save}</button></div>
      </div>}

      <div className="calendarItemList">
        {selectedItems.length === 0 ? <div className="calendarEmpty"><span>▦</span><p>{text.empty}</p><button className="softButton" onClick={openNew}>{text.add}</button></div> : selectedItems.map((item) => {
          const d = itemDate(item)!;
          return <article className={`calendarItem ${item.completedAt ? "completed" : ""}`} key={item.id}>
            <div className={`calendarTypeIcon ${item.type}`}>{item.type === "event" ? "▦" : item.type === "task" ? "☑" : "◎"}</div>
            <div className="calendarItemCopy"><strong>{item.title}</strong><span>{d.toLocaleTimeString(locale === "fr" ? "fr-FR" : locale === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" })} · {item.type === "event" ? text.event : item.type === "task" ? text.task : text.reminder}</span></div>
            <div className="calendarItemActions">{!item.completedAt && <button onClick={() => onComplete(item.id)}>{text.done}</button>}<button onClick={() => openEdit(item)}>{text.edit}</button><button className="dangerText" onClick={() => onDelete(item.id)}>{text.del}</button></div>
          </article>;
        })}
      </div>
    </section>
  );
}
