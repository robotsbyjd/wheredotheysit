import { useState, useRef, useCallback, useEffect, useMemo } from "react";

const C = {
  cream: "#FDF8F0", blush: "#E8C4B8", sage: "#9CAF88", darkSage: "#6B7F5E",
  gold: "#C4A35A", darkGold: "#8B7340", charcoal: "#2D2D2D", warmGray: "#6B6560", lightGray: "#E8E4DF",
  white: "#FFFFFF", rose: "#D4756B", deepRose: "#B85C52", lavender: "#A8A0C8",
  skyBlue: "#7BAFCC", mint: "#88C4A8", coral: "#E09080", error: "#C75050",
};

const DEFAULT_GROUP_COLORS = {
  "Bride's Side": "#E07898", "Groom's Side": "#5A9FD4", "Friends": "#6BBF70",
  "Colleagues": "#D4A24E", "VIPs": "#9B7ED4", "Sweetheart Table": "#E05A6B",
};

const EXTRA_COLORS = ["#D4A0D4", "#A0C8D4", "#D4C4A0", "#A0D4B8", "#C8A0D4", "#D4B0A0", "#A0B8D4", "#B8D4A0", "#D4A0B8", "#A0D4D4", "#D4D4A0", "#B0A0D4"];

let _id = 200;
const uid = (p = "g") => `${p}${_id++}`;
let _itemDragging = false; // prevents floor pan while dragging a table or object

const FLOOR_PRESETS = [
  { label: "Dance Floor", icon: "💃", w: 160, h: 120, color: "#D4C5F9" },
  { label: "DJ Booth", icon: "🎧", w: 80, h: 60, color: "#C5DCF9" },
  { label: "Bar", icon: "🍸", w: 120, h: 50, color: "#F9D5C5" },
  { label: "Food Station", icon: "🍽️", w: 100, h: 60, color: "#C5F9D5" },
  { label: "Cake Table", icon: "🎂", w: 70, h: 70, color: "#F9F0C5" },
  { label: "Photo Booth", icon: "📸", w: 80, h: 80, color: "#F9C5E8" },
  { label: "Gift Table", icon: "🎁", w: 90, h: 50, color: "#C5F0F9" },
  { label: "Stage", icon: "🎤", w: 160, h: 70, color: "#E8D5C5" },
  { label: "Exit", icon: "🚪", w: 50, h: 30, color: "#D5D5D5" },
  { label: "Entrance", icon: "🚪", w: 50, h: 30, color: "#D5E8D5" },
  { label: "Restrooms", icon: "🚻", w: 60, h: 40, color: "#D5D5E8" },
  { label: "Custom", icon: "📌", w: 80, h: 60, color: "#E8E4DF" },
];

const HISTORY_LIMIT = 40;
const AUTOSAVE_KEY = "wheredotheysit_autosave";

// ── Mobile detection hook ──
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Guest creation (v2: +1s become named guests linked via keepWith) ──
function makeGuest(name, group, plusOnes = 0, opts = {}) {
  const id = opts.id || uid();
  const g = { id, name, group, plusOnes: 0, constraints: { keepWith: [], keepApart: [], ...(opts.constraints || {}) } };
  const linked = [];
  for (let i = 0; i < plusOnes; i++) {
    const pid = uid("p");
    const guestName = plusOnes === 1 ? `${name}'s Guest` : `${name}'s Guest ${i + 1}`;
    linked.push({ id: pid, name: guestName, group, plusOnes: 0, constraints: { keepWith: [id], keepApart: [] } });
  }
  if (linked.length) {
    g.constraints.keepWith = [...g.constraints.keepWith, ...linked.map(p => p.id)];
  }
  return [g, ...linked];
}

function buildInitialGuests() {
  const all = []; const add = e => all.push(...e);

  // ── Sweetheart Table (Bride & Groom) ──
  const anna = makeGuest("Anna Marie", "Sweetheart Table", 0, { id: "b0" });
  const remy = makeGuest("Remy LeBeau", "Sweetheart Table", 0, { id: "b1" });
  anna[0].constraints.keepWith.push("b1"); remy[0].constraints.keepWith.push("b0"); add(anna); add(remy);

  // ── Bride's Side (20 guests incl +1s) ──
  add(makeGuest("Jubilation Lee", "Bride's Side", 1, { id: "bs1" }));
  add(makeGuest("Lucas Bishop", "Bride's Side", 0, { id: "bs2" }));
  add(makeGuest("Lorna Dane", "Bride's Side", 0, { id: "bs3" }));
  const scott = makeGuest("Scott Summers", "Bride's Side", 0, { id: "bs4" });
  const jean = makeGuest("Jean Grey", "Bride's Side", 0, { id: "bs5" });
  scott[0].constraints.keepWith.push("bs5"); jean[0].constraints.keepWith.push("bs4"); add(scott); add(jean);
  add(makeGuest("Everett Thomas", "Bride's Side", 0, { id: "bs6" }));
  add(makeGuest("Clarice Ferguson", "Bride's Side", 1, { id: "bs7" }));
  add(makeGuest("Betsy Braddock", "Bride's Side", 0, { id: "bs8" }));
  add(makeGuest("Monet St. Croix", "Bride's Side", 0, { id: "bs9" }));
  add(makeGuest("Alison Blaire", "Bride's Side", 0, { id: "bs10" }));
  add(makeGuest("Paige Guthrie", "Bride's Side", 0, { id: "bs11" }));
  add(makeGuest("Sam Guthrie", "Bride's Side", 1, { id: "bs12" }));
  add(makeGuest("Theresa Cassidy", "Bride's Side", 0, { id: "bs13" }));
  add(makeGuest("Danielle Moonstar", "Bride's Side", 1, { id: "bs14" }));
  add(makeGuest("Tessa", "Bride's Side", 0, { id: "bs15" }));
  add(makeGuest("Wanda Maximoff", "Bride's Side", 0, { id: "bs16" }));

  // ── Groom's Side (21 guests incl +1s) ──
  add(makeGuest("Laura Kinney", "Groom's Side", 0, { id: "gs1" }));
  add(makeGuest("Ben Grimm", "Groom's Side", 1, { id: "gs2" }));
  const peter = makeGuest("Peter Parker", "Groom's Side", 0, { id: "gs3" });
  const mj = makeGuest("Mary Jane Parker", "Groom's Side", 0, { id: "gs4" });
  peter[0].constraints.keepWith.push("gs4"); mj[0].constraints.keepWith.push("gs3"); add(peter); add(mj);
  add(makeGuest("Felicia Hardy", "Groom's Side", 1, { id: "gs5" }));
  add(makeGuest("Wade Wilson", "Groom's Side", 0, { id: "gs6" }));
  add(makeGuest("Jean-Luc LeBeau", "Groom's Side", 0, { id: "gs7" }));
  const henri = makeGuest("Henri LeBeau", "Groom's Side", 0, { id: "gs8" });
  const mercy = makeGuest("Mercy LeBeau", "Groom's Side", 0, { id: "gs9" });
  henri[0].constraints.keepWith.push("gs9"); mercy[0].constraints.keepWith.push("gs8"); add(henri); add(mercy);
  add(makeGuest("Emil Lapin", "Groom's Side", 0, { id: "gs10" }));
  add(makeGuest("Mattie Baptiste", "Groom's Side", 0, { id: "gs11" }));
  add(makeGuest("Johnny Storm", "Groom's Side", 1, { id: "gs12" }));
  add(makeGuest("Jessica Drew", "Groom's Side", 0, { id: "gs13" }));
  const luke = makeGuest("Luke Cage", "Groom's Side", 0, { id: "gs14" });
  const jj = makeGuest("Jessica Jones", "Groom's Side", 0, { id: "gs15" });
  luke[0].constraints.keepWith.push("gs15"); jj[0].constraints.keepWith.push("gs14"); add(luke); add(jj);
  add(makeGuest("Matt Murdock", "Groom's Side", 0, { id: "gs16" }));
  add(makeGuest("Danny Rand", "Groom's Side", 0, { id: "gs17" }));

  // ── Friends (20 guests incl +1s) ──
  add(makeGuest("Kate Pryde", "Friends", 1, { id: "f1" }));
  add(makeGuest("Piotr Rasputin", "Friends", 0, { id: "f2" }));
  add(makeGuest("Bobby Drake", "Friends", 0, { id: "f3" }));
  add(makeGuest("Emma Frost", "Friends", 0, { id: "f4" }));
  add(makeGuest("Sean Cassidy", "Friends", 0, { id: "f5" }));
  add(makeGuest("Warren Worthington", "Friends", 1, { id: "f6" }));
  add(makeGuest("Alex Summers", "Friends", 0, { id: "f7" }));
  add(makeGuest("Forge", "Friends", 0, { id: "f8" }));
  add(makeGuest("Rahne Sinclair", "Friends", 0, { id: "f9" }));
  const jamie = makeGuest("Jamie Madrox", "Friends", 0, { id: "f10" });
  const layla = makeGuest("Layla Miller", "Friends", 0, { id: "f11" });
  jamie[0].constraints.keepWith.push("f11"); layla[0].constraints.keepWith.push("f10"); add(jamie); add(layla);
  add(makeGuest("Tabitha Smith", "Friends", 0, { id: "f12" }));
  add(makeGuest("Domino", "Friends", 0, { id: "f13" }));
  const star = makeGuest("Shatterstar", "Friends", 0, { id: "f14" });
  const ric = makeGuest("Rictor", "Friends", 0, { id: "f15" });
  star[0].constraints.keepWith.push("f15"); ric[0].constraints.keepWith.push("f14"); add(star); add(ric);
  add(makeGuest("Longshot", "Friends", 0, { id: "f16" }));
  add(makeGuest("David Alleyne", "Friends", 0, { id: "f17" }));
  add(makeGuest("Jono Starsmore", "Friends", 0, { id: "f18" }));

  // ── Colleagues (19 guests incl +1s) ──
  add(makeGuest("Hank McCoy", "Colleagues", 0, { id: "c1" }));
  add(makeGuest("Nathan Summers", "Colleagues", 0, { id: "c2" }));
  add(makeGuest("Roberto da Costa", "Colleagues", 0, { id: "c3" }));
  const doug = makeGuest("Douglas Ramsey", "Colleagues", 0, { id: "c4" });
  const bei = makeGuest("Bei Ramsey", "Colleagues", 0, { id: "c5" });
  doug[0].constraints.keepWith.push("c5"); bei[0].constraints.keepWith.push("c4"); add(doug); add(bei);
  add(makeGuest("Illyana Rasputin", "Colleagues", 0, { id: "c6" }));
  add(makeGuest("Daniel Lone Eagle", "Colleagues", 0, { id: "c7" }));
  add(makeGuest("Xi'an Coy Manh", "Colleagues", 0, { id: "c8" }));
  add(makeGuest("Amara Aquilla", "Colleagues", 0, { id: "c9" }));
  add(makeGuest("Cecilia Reyes", "Colleagues", 0, { id: "c10" }));
  add(makeGuest("James Proudstar", "Colleagues", 0, { id: "c11" }));
  add(makeGuest("Noriko Ashida", "Colleagues", 1, { id: "c12" }));
  add(makeGuest("Victor Borkowski", "Colleagues", 0, { id: "c13" }));
  add(makeGuest("Quentin Quire", "Colleagues", 0, { id: "c14" }));
  add(makeGuest("Gabby Kinney", "Colleagues", 0, { id: "c15" }));
  add(makeGuest("Josh Foley", "Colleagues", 0, { id: "c16" }));
  add(makeGuest("Megan Gwynn", "Colleagues", 0, { id: "c17" }));
  add(makeGuest("Santo Vaccarro", "Colleagues", 0, { id: "c18" }));
  add(makeGuest("Cessily Kincaid", "Colleagues", 0, { id: "c19" }));

  // ── VIPs (18 guests incl +1s) ──
  add(makeGuest("Raven Darkhölme", "VIPs", 0, { id: "v1" }));
  add(makeGuest("Irene Adler", "VIPs", 0, { id: "v2" }));
  add(makeGuest("Charles Xavier", "VIPs", 0, { id: "v3" }));
  add(makeGuest("Erik Lehnsherr", "VIPs", 0, { id: "v4" }));
  add(makeGuest("Kurt Wagner", "VIPs", 1, { id: "v5" }));
  const ororo = makeGuest("Ororo Munroe", "VIPs", 0, { id: "v6" });
  const logan = makeGuest("Logan Howlett", "VIPs", 0, { id: "v7" });
  ororo[0].constraints.keepWith.push("v7"); logan[0].constraints.keepWith.push("v6"); add(ororo); add(logan);
  add(makeGuest("T'Challa", "VIPs", 1, { id: "v8" }));
  const reed = makeGuest("Reed Richards", "VIPs", 0, { id: "v9" });
  const sue = makeGuest("Sue Storm", "VIPs", 0, { id: "v10" });
  reed[0].constraints.keepWith.push("v10"); sue[0].constraints.keepWith.push("v9"); add(reed); add(sue);
  add(makeGuest("Stephen Strange", "VIPs", 0, { id: "v11" }));
  add(makeGuest("Steve Rogers", "VIPs", 0, { id: "v12" }));
  const tony = makeGuest("Tony Stark", "VIPs", 0, { id: "v13" });
  const pepper = makeGuest("Pepper Potts", "VIPs", 0, { id: "v14" });
  tony[0].constraints.keepWith.push("v14"); pepper[0].constraints.keepWith.push("v13"); add(tony); add(pepper);
  add(makeGuest("Carol Danvers", "VIPs", 0, { id: "v15" }));
  add(makeGuest("Namor", "VIPs", 0, { id: "v16" }));

  // ── Conflicts (keepApart) ──
  const setApart = (id1, id2) => { const a = all.find(x => x.id === id1), b = all.find(x => x.id === id2); if (a && b) { a.constraints.keepApart.push(id2); b.constraints.keepApart.push(id1); } };
  setApart("f2", "f1");    // Piotr Rasputin ↔ Kate Pryde
  setApart("f4", "bs5");   // Emma Frost ↔ Jean Grey
  setApart("gs5", "gs4");  // Felicia Hardy ↔ Mary Jane Parker
  setApart("v7", "bs4");   // Logan Howlett ↔ Scott Summers
  setApart("c14", "f4");   // Quentin Quire ↔ Emma Frost

  // ── Extra keepWith ──
  const setTogether = (id1, id2) => { const a = all.find(x => x.id === id1), b = all.find(x => x.id === id2); if (a && b) { a.constraints.keepWith.push(id2); b.constraints.keepWith.push(id1); } };
  setTogether("gs3", "gs2"); // Peter Parker ↔ Ben Grimm

  return all;
}

const defaultTables = [
  { id: "t0", name: "Sweetheart Table", x: 470, y: 20, seatCount: 2, shape: "rect", seats: Array(2).fill(null) },
  // Left column
  { id: "t1", name: "Table 1", x: 40, y: 100, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t2", name: "Table 2", x: 40, y: 320, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t3", name: "Table 3", x: 40, y: 540, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  // Center top
  { id: "t4", name: "Table 4", x: 280, y: 100, seatCount: 10, shape: "round", seats: Array(10).fill(null) },
  { id: "t5", name: "Table 5", x: 640, y: 100, seatCount: 10, shape: "round", seats: Array(10).fill(null) },
  // Right column
  { id: "t6", name: "Table 6", x: 880, y: 100, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t7", name: "Table 7", x: 880, y: 320, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t8", name: "Table 8", x: 880, y: 540, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  // Bottom row
  { id: "t9", name: "Table 9", x: 120, y: 740, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t10", name: "Table 10", x: 360, y: 740, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t11", name: "Table 11", x: 600, y: 740, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t12", name: "Table 12", x: 840, y: 740, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
];

const defaultFloorObjects = [
  { id: "fo1", label: "Dance Floor", icon: "💃", w: 200, h: 160, x: 380, y: 340, color: "#D4C5F9" },
  { id: "fo2", label: "DJ Booth", icon: "🎧", w: 90, h: 55, x: 435, y: 270, color: "#C5DCF9" },
  { id: "fo3", label: "Bar", icon: "🍸", w: 130, h: 50, x: 680, y: 520, color: "#F9D5C5" },
  { id: "fo4", label: "Cake Table", icon: "🎂", w: 70, h: 70, x: 280, y: 520, color: "#F9F0C5" },
  { id: "fo5", label: "Photo Booth", icon: "📸", w: 80, h: 80, x: 680, y: 340, color: "#F9C5E8" },
];

// ── Geometry ──
function getRoundPos(cx, cy, count) {
  const r = Math.min(68, 30 + count * 4);
  return Array.from({ length: count }, (_, i) => ({ x: cx + r * Math.cos((2 * Math.PI * i) / count - Math.PI / 2), y: cy + r * Math.sin((2 * Math.PI * i) / count - Math.PI / 2) }));
}
function getRectPos(cx, cy, count) {
  const half = Math.ceil(count / 2); const sp = 28; const tw = (half - 1) * sp; const pos = [];
  for (let i = 0; i < half; i++) pos.push({ x: cx - tw / 2 + i * sp, y: cy - 28 });
  for (let i = 0; i < count - half; i++) pos.push({ x: cx - ((count - half - 1) * sp) / 2 + i * sp, y: cy + 28 });
  return pos;
}
function getSeatPos(t) { const cx = t.shape === "rect" ? 75 : 78, cy = t.shape === "rect" ? 50 : 78; return t.shape === "rect" ? getRectPos(cx, cy, t.seatCount) : getRoundPos(cx, cy, t.seatCount); }
function getTableSize(t) {
  if (t.shape === "rect") return { w: Math.max(120, Math.ceil(t.seatCount / 2) * 30 + 20), h: 100 };
  const r = Math.min(68, 30 + t.seatCount * 4); return { w: (r + 16) * 2, h: (r + 16) * 2 };
}

// ── Conflict detection ──
function getConflicts(tables, gm) {
  const c = [];
  tables.forEach(t => { const s = t.seats.filter(Boolean); for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const a = gm[s[i]], b = gm[s[j]]; if (a && b && (a.constraints.keepApart.includes(b.id) || b.constraints.keepApart.includes(a.id))) c.push({ a: a.id, b: b.id, table: t.id, type: "apart" }); } });
  Object.values(gm).forEach(g => g.constraints.keepWith.forEach(pid => { const gT = tables.find(t => t.seats.includes(g.id)), pT = tables.find(t => t.seats.includes(pid)); if (gT && pT && gT.id !== pT.id && !c.find(x => (x.a === g.id && x.b === pid) || (x.a === pid && x.b === g.id))) c.push({ a: g.id, b: pid, type: "together" }); }));
  return c;
}

// ── BFS keepWith cluster ──
function getKeepWithCluster(guestId, gm) {
  const visited = new Set();
  const queue = [guestId];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const g = gm[id];
    if (g) g.constraints.keepWith.forEach(kid => { if (!visited.has(kid) && gm[kid]) queue.push(kid); });
  }
  return [...visited];
}

function buildClusters(list, gm) {
  const v = new Set(), cls = [];
  list.forEach(g => { if (v.has(g.id)) return; const cl = [g]; v.add(g.id); const q = [...g.constraints.keepWith]; while (q.length) { const pid = q.shift(); if (v.has(pid)) continue; v.add(pid); const p = gm[pid]; if (p) { cl.push(p); p.constraints.keepWith.forEach(id => { if (!v.has(id)) q.push(id); }); } } cls.push(cl); });
  return cls.sort((a, b) => b.length - a.length);
}

function scoreT(table, guest, gm) {
  const seated = table.seats.filter(Boolean); if (table.seats.filter(s => s === null).length === 0) return -9999;
  let sc = 0; seated.forEach(sid => { const s = gm[sid]; if (!s) return; if (guest.constraints.keepApart.includes(sid) || s.constraints.keepApart.includes(guest.id)) sc -= 200; if (s.group === guest.group) sc += 15; }); return sc;
}

function assignGuests(guestList, tables, gm, groups, preserve = false) {
  const nt = tables.map(t => ({ ...t, seats: preserve ? [...t.seats] : Array(t.seatCount).fill(null) }));
  const already = new Set(); if (preserve) nt.forEach(t => t.seats.forEach(s => s && already.add(s)));
  const toPlace = guestList.filter(g => !already.has(g.id));
  const go = {}; groups.forEach((g, i) => go[g] = i);
  const cls = buildClusters(toPlace, gm);
  cls.sort((a, b) => { const ag = a[0].group, bg = b[0].group; if (ag !== bg) return (go[ag] || 99) - (go[bg] || 99); return b.length - a.length; });
  cls.forEach(cl => {
    let best = null, bestSc = -Infinity;
    nt.forEach(t => { const empty = t.seats.filter(s => s === null).length; if (empty < cl.length) return; let total = 0; cl.forEach(g => total += scoreT(t, g, gm)); total += t.seats.filter(Boolean).filter(sid => gm[sid]?.group === cl[0].group).length * (preserve ? 12 : 8); if (total > bestSc) { bestSc = total; best = t; } });
    if (best) { const ei = best.seats.map((s, i) => s === null ? i : -1).filter(i => i >= 0); let si = 0, found = false; for (let i = 0; i <= ei.length - cl.length; i++) { let ok = true; for (let j = 1; j < cl.length; j++) if (ei[i + j] - ei[i] !== j) { ok = false; break; } if (ok) { si = i; found = true; break; } } cl.forEach((g, ci) => { const idx = found ? ei[si + ci] : ei[ci]; if (idx !== undefined) best.seats[idx] = g.id; }); }
  });
  toPlace.filter(g => !nt.some(t => t.seats.includes(g.id))).forEach(g => { let best = null, bestSc = -Infinity; nt.forEach(t => { const s = scoreT(t, g, gm); if (s > bestSc) { bestSc = s; best = t; } }); if (best) { const i = best.seats.indexOf(null); if (i !== -1) best.seats[i] = g.id; } });
  return nt;
}

function migrateV1Guests(guests) {
  return guests.map(g => {
    const migrated = { ...g, constraints: { ...g.constraints } };
    delete migrated.isPlusOneOf; delete migrated.plusOneIds; delete migrated.plusOnes;
    return migrated;
  });
}

// ── Components ──

function Badge({ guest, gc, small, isDragging, onDragStart, onDragEnd, hasConflict, highlight, onTap, isSelected, isMobile }) {
  const color = gc[guest.group] || C.warmGray;
  const isLinkedGuest = guest.name.includes("'s Guest");
  return (<div draggable={!isMobile}
    onDragStart={e => { if (isMobile) return; e.dataTransfer.setData("guestId", guest.id); e.dataTransfer.setData("dragType", "guest"); onDragStart?.(guest.id); }}
    onDragEnd={!isMobile ? onDragEnd : undefined}
    onClick={() => isMobile && onTap?.(guest.id)}
    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "3px 10px" : "5px 13px", borderRadius: 20, background: isSelected ? `${C.sage}30` : highlight ? `${C.gold}30` : hasConflict ? `${C.error}15` : isLinkedGuest ? `${color}10` : `${color}18`, border: `${isSelected ? 2.5 : 1.5}px ${isLinkedGuest && !isSelected ? "dashed" : "solid"} ${isSelected ? C.sage : highlight ? C.gold : hasConflict ? C.error : color}`, cursor: isMobile ? "pointer" : "grab", fontSize: small ? 13 : 15, fontFamily: "inherit", color: C.charcoal, opacity: isDragging ? 0.3 : 1, whiteSpace: "nowrap", boxShadow: isSelected ? `0 0 12px ${C.sage}50` : highlight ? `0 0 8px ${C.gold}40` : "none", transition: "all 0.15s", minHeight: isMobile ? 44 : "auto" }}>
    <span style={{ width: small ? 7 : 8, height: small ? 7 : 8, borderRadius: "50%", background: color, opacity: isLinkedGuest ? 0.5 : 1 }} />
    <span style={{ fontStyle: isLinkedGuest ? "italic" : "normal", opacity: isLinkedGuest ? 0.7 : 1 }}>{guest.name}</span>
    {isSelected && <span style={{ fontSize: 11, color: C.sage, fontWeight: 700 }}>✓</span>}
    {hasConflict && <span style={{ color: C.error, fontSize: 13 }}>⚠</span>}
  </div>);
}

function TableViz({ table, gm, gc, onDrop, onRemove, conflicts, onRename, onSeatChange, onDelete }) {
  const [over, setOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [nv, setNv] = useState(table.name);
  const sp = getSeatPos(table); const seated = table.seats.filter(Boolean).length;
  const isRect = table.shape === "rect";
  const cx = isRect ? 75 : 78, cy = isRect ? 50 : 78;
  const tw = isRect ? Math.max(60, Math.ceil(table.seatCount / 2) * 26) : 58, th = isRect ? 28 : 58;
  const sz = getTableSize(table);
  return (<div style={{ position: "absolute", left: table.x, top: table.y, width: sz.w, height: sz.h }}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
    onDrop={e => { e.preventDefault(); setOver(false); const gid = e.dataTransfer.getData("guestId"); if (gid) onDrop(gid, table.id); }}>
    {/* Delete button — top-right of table, shows on hover (or always on touch) */}
    {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(table.id); }} style={{ position: "absolute", top: isRect ? cy - th / 2 - 10 : cy - (Math.min(68, 30 + table.seatCount * 4)) - 10, right: isRect ? cx - tw / 2 - 2 : cx - (Math.min(68, 30 + table.seatCount * 4)) + 6, width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${C.rose}60`, background: C.white, color: C.rose, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, opacity: hovered ? 1 : 0.35, transition: "opacity 0.15s", zIndex: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>×</button>}
    <div style={{ position: "absolute", left: cx - tw / 2, top: cy - th / 2, width: tw, height: th, borderRadius: isRect ? 8 : "50%", background: over ? `linear-gradient(135deg, ${C.sage}55, ${C.darkSage}44)` : `linear-gradient(145deg, ${C.cream}, ${C.lightGray}ee)`, border: `2px solid ${over ? C.sage : C.lightGray}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1, boxShadow: over ? `0 4px 24px ${C.sage}40` : "0 2px 10px rgba(0,0,0,0.06)" }}>
      {editing ? <input autoFocus value={nv} onChange={e => setNv(e.target.value)} onBlur={() => { setEditing(false); onRename(table.id, nv); }} onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onRename(table.id, nv); } }} style={{ width: 46, textAlign: "center", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.charcoal, outline: "none" }} />
        : <span onClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer", textAlign: "center", lineHeight: 1.1 }}>{table.name}</span>}
      <span style={{ fontSize: 11, color: C.warmGray, opacity: 0.6 }}>{seated}/{table.seatCount}</span>
    </div>
    <div style={{ position: "absolute", left: cx - 24, top: cy + th / 2 + 6, display: "flex", gap: 2, zIndex: 3 }}>
      <button onClick={(e) => { e.stopPropagation(); onSeatChange(table.id, -1); }} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>−</button>
      <button onClick={(e) => { e.stopPropagation(); onSeatChange(table.id, 1); }} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>+</button>
    </div>
    {sp.map((pos, i) => { const gid = table.seats[i]; const guest = gid ? gm[gid] : null; const isLinkedGuest = guest?.name.includes("'s Guest"); const gColor = guest ? (gc[guest.group] || C.warmGray) : C.lightGray; const conf = guest && conflicts.some(c => (c.a === guest.id || c.b === guest.id) && c.table === table.id);
      return (<div key={i} title={guest ? `${guest.name} — click to unseat` : "Empty"} onClick={() => guest && onRemove(guest.id)}
        style={{ position: "absolute", left: pos.x - 16, top: pos.y - 16, width: 32, height: 32, borderRadius: "50%", background: guest ? (conf ? `${C.error}22` : `${gColor}35`) : `${C.white}70`, border: `1.5px ${guest ? (isLinkedGuest ? "dashed" : "solid") : "dashed"} ${guest ? (conf ? C.error : gColor) : `${C.lightGray}90`}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: guest ? "pointer" : "default", zIndex: 2, fontSize: 11, fontFamily: "inherit", color: C.charcoal }}>
        {guest ? (isLinkedGuest ? guest.name.split("'s")[0].slice(0, 3) + "+" : guest.name.split(" ")[0].slice(0, 4)) : ""}
      </div>); })}
  </div>);
}

// ── Mobile Table Card (for list view tap-to-place) ──
function MobileTableCard({ table, gm, gc, conflicts, selectedGuest, onPlaceHere, onUnseat, onSeatChange, onRename }) {
  const seated = table.seats.filter(Boolean).map(sid => gm[sid]).filter(Boolean);
  const empty = table.seatCount - seated.length;
  const hasSelection = !!selectedGuest;
  const [editing, setEditing] = useState(false);
  const [nv, setNv] = useState(table.name);

  return (
    <div style={{ padding: "12px 14px", border: `1.5px solid ${hasSelection && empty > 0 ? C.sage : C.lightGray}`, borderRadius: 12, marginBottom: 8, background: C.white, transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: seated.length ? 8 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {editing ? (
            <input autoFocus value={nv} onChange={e => setNv(e.target.value)}
              onBlur={() => { setEditing(false); onRename(table.id, nv); }}
              onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onRename(table.id, nv); } }}
              style={{ fontWeight: 600, fontSize: 15, border: `1px solid ${C.lightGray}`, borderRadius: 6, padding: "2px 6px", fontFamily: "inherit", outline: "none", width: 120 }} />
          ) : (
            <span onClick={() => setEditing(true)} style={{ fontWeight: 600, fontSize: 15, cursor: "pointer" }}>{table.name}</span>
          )}
          <span style={{ fontSize: 12.5, color: C.warmGray }}>{table.shape === "rect" ? "▬" : "⬤"} {seated.length}/{table.seatCount}</span>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => onSeatChange(table.id, -1)} style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>−</button>
            <button onClick={() => onSeatChange(table.id, 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
          </div>
        </div>
        {hasSelection && empty > 0 && (
          <button onClick={() => onPlaceHere(table.id)} style={{ padding: "6px 14px", border: "none", borderRadius: 8, background: `linear-gradient(135deg, ${C.sage}, ${C.darkSage})`, color: C.white, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 36 }}>
            Seat here
          </button>
        )}
      </div>
      {seated.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {seated.map(g => {
            const color = gc[g.group] || C.warmGray;
            const isLinked = g.name.includes("'s Guest");
            const conf = conflicts.some(c => (c.a === g.id || c.b === g.id) && c.table === table.id);
            return (
              <span key={g.id} onClick={() => onUnseat(g.id)} style={{ fontSize: 13, padding: "4px 10px", borderRadius: 8, background: conf ? `${C.error}15` : `${color}20`, border: `1px ${isLinked ? "dashed" : "solid"} ${conf ? C.error : color}40`, fontStyle: isLinked ? "italic" : "normal", cursor: "pointer", minHeight: 32, display: "inline-flex", alignItems: "center" }}>
                {g.name} <span style={{ marginLeft: 4, opacity: 0.4, fontSize: 11 }}>×</span>
              </span>
            );
          })}
        </div>
      )}
      {seated.length === 0 && !hasSelection && (
        <div style={{ fontSize: 13, color: C.warmGray, fontStyle: "italic", padding: "2px 0" }}>Empty — {empty} seats available</div>
      )}
    </div>
  );
}

function DesktopTableCard({ table, gm, gc, conflicts, onSeatChange, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [nv, setNv] = useState(table.name);
  const seated = table.seats.filter(Boolean);
  return (
    <div style={{ padding: "10px 12px", border: `1px solid ${C.lightGray}`, borderRadius: 9, marginBottom: 6, background: C.white }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: seated.length ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {editing ? (
            <input autoFocus value={nv} onChange={e => setNv(e.target.value)}
              onBlur={() => { setEditing(false); onRename(table.id, nv); }}
              onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onRename(table.id, nv); } }}
              style={{ fontWeight: 600, fontSize: 14.5, border: `1px solid ${C.lightGray}`, borderRadius: 6, padding: "2px 6px", fontFamily: "inherit", outline: "none", width: 120 }} />
          ) : (
            <span onClick={() => { setNv(table.name); setEditing(true); }} title="Click to rename" style={{ fontWeight: 600, fontSize: 14.5, cursor: "pointer", borderBottom: `1px dashed ${C.lightGray}` }}>{table.name}</span>
          )}
          <span style={{ fontSize: 12.5, color: C.warmGray }}>{table.shape === "rect" ? "▬" : "⬤"} {seated.length}/{table.seatCount}</span>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => onSeatChange(table.id, -1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>−</button>
            <button onClick={() => onSeatChange(table.id, 1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
          </div>
        </div>
        <button onClick={() => onRemove(table.id)} style={{ border: "none", background: "none", color: C.rose, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Remove</button>
      </div>
      {seated.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{seated.map(sid => { const g = gm[sid]; const color = g ? (gc[g.group] || C.warmGray) : C.lightGray; return g ? <span key={sid} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 7, background: `${color}20`, border: `1px ${g.name.includes("'s Guest") ? "dashed" : "solid"} ${color}40`, fontStyle: g.name.includes("'s Guest") ? "italic" : "normal" }}>{g.name}</span> : null; })}</div>}
    </div>
  );
}

function FloorObject({ obj, onUpdate, onRemove, zoom }) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(obj.label);
  const [hovered, setHovered] = useState(false);

  const handleMouseDown = (e) => {
    if (editing) return;
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origX = obj.x, origY = obj.y;
    setDragging(true);
    const move = (ev) => { onUpdate({ ...obj, x: origX + (ev.clientX - startX) / zoom, y: origY + (ev.clientY - startY) / zoom }); };
    const up = () => { setDragging(false); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const handleTouchDown = (e) => {
    if (editing) return;
    e.stopPropagation();
    _itemDragging = true;
    const touch = e.touches[0];
    const startX = touch.clientX, startY = touch.clientY;
    const origX = obj.x, origY = obj.y;
    setDragging(true);
    const move = (ev) => { ev.preventDefault(); const t = ev.touches[0]; onUpdate({ ...obj, x: origX + (t.clientX - startX) / zoom, y: origY + (t.clientY - startY) / zoom }); };
    const up = () => { setDragging(false); _itemDragging = false; window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up); };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  const handleResize = (e, handle) => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const origW = obj.w, origH = obj.h, origX = obj.x, origY = obj.y;
    const move = (ev) => {
      const dx = (ev.clientX - startX) / zoom, dy = (ev.clientY - startY) / zoom;
      let newW = origW, newH = origH, newX = origX, newY = origY;
      if (handle.includes("e")) newW = Math.max(40, origW + dx);
      if (handle.includes("w")) { newW = Math.max(40, origW - dx); newX = origX + origW - newW; }
      if (handle.includes("s")) newH = Math.max(30, origH + dy);
      if (handle.includes("n")) { newH = Math.max(30, origH - dy); newY = origY + origH - newH; }
      onUpdate({ ...obj, w: newW, h: newH, x: newX, y: newY });
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const handleTouchResize = (e, handle) => {
    e.stopPropagation(); e.preventDefault();
    _itemDragging = true;
    const touch = e.touches[0];
    const startX = touch.clientX, startY = touch.clientY;
    const origW = obj.w, origH = obj.h, origX = obj.x, origY = obj.y;
    const move = (ev) => {
      ev.preventDefault(); const t = ev.touches[0];
      const dx = (t.clientX - startX) / zoom, dy = (t.clientY - startY) / zoom;
      let newW = origW, newH = origH, newX = origX, newY = origY;
      if (handle.includes("e")) newW = Math.max(40, origW + dx);
      if (handle.includes("w")) { newW = Math.max(40, origW - dx); newX = origX + origW - newW; }
      if (handle.includes("s")) newH = Math.max(30, origH + dy);
      if (handle.includes("n")) { newH = Math.max(30, origH - dy); newY = origY + origH - newH; }
      onUpdate({ ...obj, w: newW, h: newH, x: newX, y: newY });
    };
    const up = () => { _itemDragging = false; window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up); };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  const handles = [
    { key: "nw", top: -4, left: -4, cursor: "nw-resize" },
    { key: "ne", top: -4, right: -4, cursor: "ne-resize" },
    { key: "sw", bottom: -4, left: -4, cursor: "sw-resize" },
    { key: "se", bottom: -4, right: -4, cursor: "se-resize" },
    { key: "n", top: -4, left: "50%", ml: -4, cursor: "n-resize" },
    { key: "s", bottom: -4, left: "50%", ml: -4, cursor: "s-resize" },
    { key: "e", top: "50%", right: -4, mt: -4, cursor: "e-resize" },
    { key: "w", top: "50%", left: -4, mt: -4, cursor: "w-resize" },
  ];

  return (
    <div onMouseDown={handleMouseDown} onTouchStart={handleTouchDown} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: "absolute", left: obj.x, top: obj.y, width: obj.w, height: obj.h, background: `${obj.color}40`, border: `2px dashed ${obj.color}90`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: dragging ? "grabbing" : "grab", userSelect: "none", zIndex: 0, touchAction: "none" }}>
      <span style={{ fontSize: Math.min(24, obj.h * 0.35), pointerEvents: "none" }}>{obj.icon}</span>
      {editing ? (
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onBlur={() => { setEditing(false); onUpdate({ ...obj, label }); }} onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onUpdate({ ...obj, label }); } }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} style={{ width: obj.w - 16, textAlign: "center", border: "none", background: `${C.white}80`, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.charcoal, outline: "none", borderRadius: 4, padding: "1px 4px" }} />
      ) : (
        <span onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{ fontSize: 12, fontWeight: 600, color: C.charcoal, opacity: 0.7, textAlign: "center", lineHeight: 1.1, maxWidth: obj.w - 8, pointerEvents: "none" }}>{obj.label}</span>
      )}
      {obj.w > 50 && obj.h > 35 && <span style={{ fontSize: 10.5, color: C.warmGray, opacity: 0.5, pointerEvents: "none", marginTop: 1 }}>{Math.round(obj.w)}×{Math.round(obj.h)}</span>}
      <button onClick={(e) => { e.stopPropagation(); onRemove(obj.id); }} style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, color: C.warmGray, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, opacity: hovered ? 1 : 0.35, transition: "opacity 0.15s" }}>×</button>
      {handles.map(h => (
        <div key={h.key} onMouseDown={e => handleResize(e, h.key)} onTouchStart={e => handleTouchResize(e, h.key)} style={{ position: "absolute", top: h.top, bottom: h.bottom, left: h.left, right: h.right, marginLeft: h.ml || 0, marginTop: h.mt || 0, width: 12, height: 12, borderRadius: "50%", background: C.white, border: `1.5px solid ${obj.color}`, cursor: h.cursor, zIndex: 1, opacity: hovered ? 1 : 0.35, transition: "opacity 0.15s", touchAction: "none" }} />
      ))}
    </div>
  );
}

// ── Modals ──

function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: "min(360px, 90vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
      <div style={{ padding: "20px 22px 10px" }}><h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 600 }}>{title}</h3></div>
      <div style={{ padding: "6px 22px 20px", fontSize: 14.5, color: C.warmGray, lineHeight: 1.6 }}>{message}</div>
      <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.lightGray}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "8px 18px", border: `1.5px solid ${C.lightGray}`, borderRadius: 10, background: C.white, fontFamily: "inherit", fontSize: 14, color: C.warmGray, cursor: "pointer" }}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: "8px 22px", border: "none", borderRadius: 10, background: danger ? `linear-gradient(135deg, ${C.rose}, ${C.deepRose})` : `linear-gradient(135deg, ${C.sage}, ${C.darkSage})`, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.white, cursor: "pointer" }}>{danger ? "Yes, clear everything" : "Confirm"}</button>
      </div>
    </div>
  </div>);
}

function BulkImportModal({ onClose, onImport, groups, gc }) {
  const [text, setText] = useState(""); const [group, setGroup] = useState(groups[0] || "General"); const [po, setPo] = useState(0);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: "min(460px, 95vw)", maxHeight: "80vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.lightGray}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 600 }}>Bulk Import</h3><button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: C.warmGray }}>×</button></div>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: C.warmGray }}>Paste one name per line.</p>
      </div>
      <div style={{ padding: "14px 22px", flex: 1, overflowY: "auto" }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Jane Smith\nMark Johnson\nDr. Patel"} style={{ width: "100%", height: 150, padding: 12, border: `1.5px solid ${C.lightGray}`, borderRadius: 10, fontFamily: "inherit", fontSize: 15, lineHeight: 1.7, resize: "vertical", background: C.cream, outline: "none" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}><label style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.warmGray, fontWeight: 600, display: "block", marginBottom: 3 }}>Group</label>
            <select value={group} onChange={e => setGroup(e.target.value)} style={{ width: "100%", padding: "7px 8px", border: `1px solid ${C.lightGray}`, borderRadius: 7, fontFamily: "inherit", fontSize: 14, background: C.white, outline: "none" }}>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.warmGray, fontWeight: 600, display: "block", marginBottom: 3 }}>+Ones</label>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: C.white, padding: "6px 10px", borderRadius: 7, border: `1px solid ${C.lightGray}` }}>
              <button onClick={() => setPo(Math.max(0, po - 1))} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: C.warmGray, fontSize: 18 }}>−</button>
              <span style={{ fontWeight: 600, minWidth: 16, textAlign: "center", fontSize: 15 }}>{po}</span>
              <button onClick={() => setPo(Math.min(5, po + 1))} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: C.warmGray, fontSize: 18 }}>+</button></div></div>
        </div>
        {lines.length > 0 && <div style={{ marginTop: 12, padding: 10, background: `${C.sage}08`, borderRadius: 8, fontSize: 14, color: C.darkSage, fontWeight: 600 }}>{lines.length} guest{lines.length > 1 ? "s" : ""} → {group}{po > 0 ? ` (+${po})` : ""} = {lines.length * (1 + po)} seats</div>}
      </div>
      <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.lightGray}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "8px 18px", border: `1.5px solid ${C.lightGray}`, borderRadius: 10, background: C.white, fontFamily: "inherit", fontSize: 14, color: C.warmGray, cursor: "pointer" }}>Cancel</button>
        <button disabled={!lines.length} onClick={() => { onImport(lines, group, po); onClose(); }} style={{ padding: "8px 22px", border: "none", borderRadius: 10, background: lines.length ? `linear-gradient(135deg, ${C.sage}, ${C.darkSage})` : C.lightGray, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: lines.length ? C.white : C.warmGray, cursor: lines.length ? "pointer" : "default" }}>Import {lines.length}</button>
      </div>
    </div>
  </div>);
}

function AddTableModal({ onClose, onAdd }) {
  const [name, setName] = useState(""); const [seats, setSeats] = useState(8); const [shape, setShape] = useState("round");
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: "min(380px, 90vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.lightGray}` }}><h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 600 }}>Add Table</h3></div>
      <div style={{ padding: "16px 22px" }}>
        <label style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.warmGray, fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sweetheart Table" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.lightGray}`, borderRadius: 7, fontFamily: "inherit", fontSize: 15, background: C.cream, outline: "none", marginBottom: 14, boxSizing: "border-box" }} />
        <label style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.warmGray, fontWeight: 600, display: "block", marginBottom: 6 }}>Shape</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[["round", "⬤ Round"], ["rect", "▬ Rectangular"]].map(([v, lb]) => (
            <button key={v} onClick={() => setShape(v)} style={{ flex: 1, padding: "10px 0", border: `1.5px solid ${shape === v ? C.sage : C.lightGray}`, borderRadius: 10, background: shape === v ? `${C.sage}12` : C.white, fontFamily: "inherit", fontSize: 14, fontWeight: shape === v ? 600 : 400, color: shape === v ? C.darkSage : C.warmGray, cursor: "pointer" }}>{lb}</button>))}
        </div>
        <label style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.warmGray, fontWeight: 600, display: "block", marginBottom: 6 }}>Seats: {seats}</label>
        <input type="range" min={2} max={16} value={seats} onChange={e => setSeats(+e.target.value)} style={{ width: "100%", accentColor: C.sage }} />
      </div>
      <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.lightGray}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "8px 18px", border: `1.5px solid ${C.lightGray}`, borderRadius: 10, background: C.white, fontFamily: "inherit", fontSize: 14, color: C.warmGray, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { onAdd(name || "Table", seats, shape); onClose(); }} style={{ padding: "8px 22px", border: "none", borderRadius: 10, background: `linear-gradient(135deg, ${C.sage}, ${C.darkSage})`, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.white, cursor: "pointer" }}>Add</button>
      </div>
    </div>
  </div>);
}

function ExportModal({ tables, guests, gm, gc, onClose }) {
  const unseated = guests.filter(g => !tables.some(t => t.seats.includes(g.id)));
  const copyText = () => { let txt = "TABLE ASSIGNMENTS\n" + "=".repeat(40) + "\n\n"; tables.forEach(t => { const gs = t.seats.filter(Boolean).map(sid => gm[sid]).filter(Boolean); txt += `${t.name} (${t.shape === "rect" ? "Rect" : "Round"}, ${t.seatCount} seats)\n` + "-".repeat(30) + "\n"; if (!gs.length) txt += "  (empty)\n"; else gs.forEach((g, i) => { txt += `  ${i + 1}. ${g.name}  [${g.group}]\n`; }); txt += "\n"; }); if (unseated.length) { txt += "UNSEATED\n" + "-".repeat(30) + "\n"; unseated.forEach(g => { txt += `  - ${g.name}  [${g.group}]\n`; }); } navigator.clipboard?.writeText(txt); };
  const printView = () => { const w = window.open("", "_blank"); let html = `<html><head><title>WhereDoTheySit.com</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;padding:40px;color:#2D2D2D}h1{font-size:26px;margin-bottom:4px}h2{font-size:13px;color:#6B6560;font-weight:300;margin-bottom:28px;letter-spacing:2px;text-transform:uppercase}.tc{break-inside:avoid;border:1px solid #E8E4DF;border-radius:12px;padding:14px 18px;margin-bottom:14px}.tn{font-size:15px;font-weight:700;margin-bottom:2px}.tm{font-size:11px;color:#6B6560;margin-bottom:8px}.gr{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0ede8;font-size:13px}.gr:last-child{border-bottom:none}.gt{font-size:10px;color:#6B6560;background:#f5f2ed;padding:1px 7px;border-radius:8px}.po{font-style:italic;opacity:.7}.sum{margin-top:28px;padding-top:18px;border-top:2px solid #E8E4DF;font-size:13px;color:#6B6560}@media print{body{padding:20px}}</style></head><body>`; html += `<h1>🪑 WhereDoTheySit.com</h1><h2>Seating Arrangement</h2>`; tables.forEach(t => { const gs = t.seats.filter(Boolean).map(sid => gm[sid]).filter(Boolean); html += `<div class="tc"><div class="tn">${t.name}</div><div class="tm">${t.shape === "rect" ? "Rectangular" : "Round"} · ${gs.length}/${t.seatCount}</div>`; if (!gs.length) html += `<div style="font-size:12px;color:#999">Empty</div>`; else gs.forEach(g => { const isLinked = g.name.includes("'s Guest"); html += `<div class="gr"><span class="${isLinked ? "po" : ""}">${g.name}</span><span class="gt">${g.group}</span></div>`; }); html += `</div>`; }); if (unseated.length) { html += `<div class="tc" style="border-color:#D4756B60"><div class="tn" style="color:#D4756B">Unseated</div><div class="tm">${unseated.length} guests</div>`; unseated.forEach(g => { html += `<div class="gr"><span>${g.name}</span><span class="gt">${g.group}</span></div>`; }); html += `</div>`; } const placed = guests.filter(g => tables.some(t => t.seats.includes(g.id))).length; html += `<div class="sum">${placed}/${guests.length} seated · ${tables.length} tables</div></body></html>`; w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: "min(520px, 95vw)", maxHeight: "85vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.lightGray}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 600 }}>Export</h3><button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: C.warmGray }}>×</button></div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px" }}>
        {tables.map(t => { const gs = t.seats.filter(Boolean).map(sid => gm[sid]).filter(Boolean); const gColor = (g) => gc[g.group] || C.warmGray; return (<div key={t.id} style={{ marginBottom: 12, padding: "10px 14px", border: `1px solid ${C.lightGray}`, borderRadius: 10 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: gs.length ? 6 : 0 }}><span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span><span style={{ fontSize: 12.5, color: C.warmGray }}>{t.shape === "rect" ? "Rect" : "Round"} · {gs.length}/{t.seatCount}</span></div>{gs.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{gs.map(g => <span key={g.id} style={{ fontSize: 13, padding: "3px 9px", borderRadius: 8, background: `${gColor(g)}20`, border: `1px ${g.name.includes("'s Guest") ? "dashed" : "solid"} ${gColor(g)}40`, fontStyle: g.name.includes("'s Guest") ? "italic" : "normal" }}>{g.name}</span>)}</div> : <div style={{ fontSize: 13, color: C.warmGray, fontStyle: "italic" }}>Empty</div>}</div>); })}
        {unseated.length > 0 && <div style={{ padding: "10px 14px", border: `1px solid ${C.rose}40`, borderRadius: 10 }}><div style={{ fontWeight: 600, fontSize: 14.5, color: C.rose, marginBottom: 4 }}>Unseated ({unseated.length})</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{unseated.map(g => <span key={g.id} style={{ fontSize: 13, padding: "3px 9px", borderRadius: 8, background: `${C.rose}12`, border: `1px solid ${C.rose}30` }}>{g.name}</span>)}</div></div>}
      </div>
      <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.lightGray}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={copyText} style={{ padding: "8px 18px", border: `1.5px solid ${C.lightGray}`, borderRadius: 10, background: C.white, fontFamily: "inherit", fontSize: 14, color: C.warmGray, cursor: "pointer" }}>📋 Copy Text</button>
        <button onClick={printView} style={{ padding: "8px 22px", border: "none", borderRadius: 10, background: `linear-gradient(135deg, ${C.sage}, ${C.darkSage})`, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.white, cursor: "pointer" }}>🖨️ Print / PDF</button>
      </div>
    </div>
  </div>);
}

function HelpModal({ onClose }) {
  const [helpTab, setHelpTab] = useState("start");
  const S = {
    section: { marginBottom: 20 },
    h: { fontSize: 16, fontWeight: 700, marginBottom: 8, color: C.charcoal, fontFamily: "'Playfair Display', Georgia, serif" },
    p: { fontSize: 14, color: C.warmGray, lineHeight: 1.7, marginBottom: 6 },
    step: { display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${C.lightGray}20` },
    stepNum: { width: 26, height: 26, borderRadius: "50%", background: `${C.sage}20`, color: C.darkSage, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    stepText: { fontSize: 14, color: C.warmGray, lineHeight: 1.6, flex: 1 },
    tip: { padding: "10px 14px", background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 10, fontSize: 13, color: C.darkGold, lineHeight: 1.6, marginTop: 8, marginBottom: 8 },
    kbd: { padding: "1px 6px", background: C.cream, border: `1px solid ${C.lightGray}`, borderRadius: 4, fontSize: 12, fontFamily: "monospace", fontWeight: 600 },
  };
  const tabs = [
    { id: "start", label: "Getting Started" },
    { id: "guests", label: "Guests" },
    { id: "seating", label: "Seating" },
    { id: "floor", label: "Floor Plan" },
    { id: "tips", label: "Tips & Shortcuts" },
  ];
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: "min(560px, 95vw)", maxHeight: "85vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.lightGray}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600 }}>🪑 How to Use WhereDoTheySit</h3>
        <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: C.warmGray }}>×</button>
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.lightGray}`, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setHelpTab(t.id)} style={{ padding: "9px 14px", border: "none", background: helpTab === t.id ? C.white : "transparent", borderBottom: helpTab === t.id ? `2px solid ${C.sage}` : "2px solid transparent", fontFamily: "inherit", fontSize: 13, fontWeight: helpTab === t.id ? 600 : 400, color: helpTab === t.id ? C.charcoal : C.warmGray, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>

        {helpTab === "start" && (<div>
          <div style={S.section}>
            <div style={S.h}>Welcome! Here's how to plan your seating in 5 minutes.</div>
            <div style={S.p}>WhereDoTheySit helps you organize seating for weddings, parties, galas, and any event with assigned tables. Here's the quickest path to a finished plan:</div>
          </div>
          <div style={S.section}>
            <div style={S.step}><div style={S.stepNum}>1</div><div style={S.stepText}><strong>Add your guests.</strong> Type names one at a time, or use <strong>Bulk Import</strong> to paste a list. Set each guest's group (e.g., "Bride's Side") and +1 count.</div></div>
            <div style={S.step}><div style={S.stepNum}>2</div><div style={S.stepText}><strong>Set up your tables.</strong> Go to the <strong>Tables</strong> tab and add tables — choose round or rectangular, and set how many seats each has.</div></div>
            <div style={S.step}><div style={S.stepNum}>3</div><div style={S.stepText}><strong>Set seating preferences</strong> (optional). In the <strong>Preferences</strong> tab, tell the tool who should sit together and who should be kept apart.</div></div>
            <div style={S.step}><div style={S.stepNum}>4</div><div style={S.stepText}><strong>Auto-assign or drag and drop.</strong> Hit <strong>✨ Auto-Assign</strong> to let the tool seat everyone intelligently, or manually drag guests onto tables.</div></div>
            <div style={S.step}><div style={S.stepNum}>5</div><div style={S.stepText}><strong>Fine-tune and export.</strong> Adjust anything by hand, then use <strong>📤 Export</strong> to copy your seating chart or print it for your coordinator.</div></div>
          </div>
          <div style={S.tip}>💡 <strong>Tip:</strong> Your work auto-saves in your browser. Use <strong>💾 Save</strong> to download a backup file you can reload anytime or share with your partner.</div>
        </div>)}

        {helpTab === "guests" && (<div>
          <div style={S.section}>
            <div style={S.h}>Adding Guests</div>
            <div style={S.p}>Use the input field in the <strong>Guests</strong> tab to add guests one by one. Set their group and +1 count before clicking <strong>Add</strong>.</div>
            <div style={S.p}>For larger lists, click <strong>📋 Bulk Import</strong> to paste multiple names at once (one per line). All imported guests will share the same group and +1 setting.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Groups</div>
            <div style={S.p}>Groups help organize your guests and affect how Auto-Assign works — it tries to keep groups together at the same table. Default groups include Bride's Side, Groom's Side, Friends, Colleagues, and VIPs.</div>
            <div style={S.p}>Create custom groups using the <strong>+</strong> button next to the group dropdown. Groups are color-coded throughout the app.</div>
            <div style={S.tip}>💡 <strong>Tip:</strong> On desktop, you can drag a guest badge between group sections to quickly reassign them.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Plus-Ones</div>
            <div style={S.p}>When you add a guest with +1s, each plus-one becomes a separate named guest (e.g., "Sarah's Guest") that is automatically linked to the original guest. Linked guests always move together — if you seat Sarah, her guest comes too.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Searching & Removing</div>
            <div style={S.p}>Use the search bar at the top of the Guests tab to quickly find anyone by name or group. Click the <strong>×</strong> next to a guest to remove them (this also removes their linked plus-ones).</div>
          </div>
        </div>)}

        {helpTab === "seating" && (<div>
          <div style={S.section}>
            <div style={S.h}>Seating Guests</div>
            <div style={S.p}><strong>On desktop:</strong> Drag guest badges from the sidebar and drop them onto tables in the floor plan. Linked guests (couples, +1s) will follow automatically.</div>
            <div style={S.p}><strong>On mobile:</strong> Tap a guest to select them (they'll get a green checkmark), then tap <strong>"Seat here"</strong> on the table you want.</div>
            <div style={S.p}>To <strong>unseat</strong> someone, click their name on the table (in the floor plan or table card) — they'll return to the unseated list.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Auto-Assign</div>
            <div style={S.p}><strong>✨ Auto-Assign All</strong> seats every guest from scratch. It keeps groups together, respects your "together" and "apart" preferences, and clusters linked guests.</div>
            <div style={S.p}><strong>🧩 Auto-Complete</strong> only fills remaining empty seats — any guests you've already placed by hand stay put. Great for when you've arranged the VIPs and want the tool to handle the rest.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Seating Preferences</div>
            <div style={S.p}>In the <strong>Preferences</strong> tab, select a guest, then mark other guests as <strong style={{ color: C.sage }}>Together</strong> (same table) or <strong style={{ color: C.rose }}>Apart</strong> (different tables).</div>
            <div style={S.p}>Conflicts (broken preferences) show as ⚠ warning badges and are listed persistently in the sidebar so you never miss them.</div>
            <div style={S.tip}>💡 <strong>Tip:</strong> Use the search bar in the Preferences tab to quickly find the guest you're looking for — essential for larger weddings.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Handling Overflow</div>
            <div style={S.p}>If you drop a group of linked guests onto a table without enough seats, you'll get an option to automatically expand the table. You can also use the <strong>+/−</strong> buttons on any table to adjust seat counts.</div>
          </div>
        </div>)}

        {helpTab === "floor" && (<div>
          <div style={S.section}>
            <div style={S.h}>The Floor Plan</div>
            <div style={S.p}>The floor plan gives you a visual, birds-eye view of your venue. Tables are shown with colored seats representing each guest's group.</div>
            <div style={S.p}><strong>Navigate:</strong> Scroll to zoom, drag the background to pan. On mobile, pinch to zoom and swipe to pan. Use the <strong>⟲</strong> button to auto-center all tables.</div>
            <div style={S.p}><strong>Move tables:</strong> Drag the center of any table to reposition it.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Venue Elements</div>
            <div style={S.p}>In the <strong>Layout</strong> tab, add venue elements like dance floors, bars, photo booths, DJ booths, and more. These help you visualize the full room layout.</div>
            <div style={S.p}>Elements can be dragged to reposition, resized from the edges, and renamed by double-clicking the label. Use them to plan traffic flow and make sure Grandma isn't next to the speaker stack.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Table Types</div>
            <div style={S.p}><strong>Round tables</strong> show seats in a circle. <strong>Rectangular tables</strong> show seats on two sides. Both support 2-20 seats. Click the table name to rename it (e.g., "Sweetheart Table").</div>
          </div>
        </div>)}

        {helpTab === "tips" && (<div>
          <div style={S.section}>
            <div style={S.h}>Keyboard Shortcuts</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 14, color: C.warmGray }}>
              <span style={S.kbd}>Ctrl + Z</span><span>Undo last action</span>
              <span style={S.kbd}>Ctrl + Shift + Z</span><span>Redo</span>
              <span style={S.kbd}>Ctrl + Y</span><span>Redo (alternate)</span>
            </div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Saving & Loading</div>
            <div style={S.p}><strong>Auto-save:</strong> Your work saves to your browser automatically after every change. If you close the tab and come back, everything will be there.</div>
            <div style={S.p}><strong>💾 Save:</strong> Downloads a .json backup file. Great for sharing with your partner, backing up before major changes, or transferring between devices.</div>
            <div style={S.p}><strong>📂 Load:</strong> Open a previously saved .json file to restore a layout.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Exporting Your Plan</div>
            <div style={S.p}><strong>📋 Copy Text:</strong> Copies a formatted text version of your seating chart to the clipboard — great for pasting into emails or documents.</div>
            <div style={S.p}><strong>🖨️ Print / PDF:</strong> Opens a clean, print-optimized view of your seating chart. Use your browser's "Save as PDF" option to create a file for your coordinator.</div>
          </div>
          <div style={S.section}>
            <div style={S.h}>Pro Tips for Smooth Planning</div>
            <div style={S.tip}>🎯 <strong>Start with constraints.</strong> Before auto-assigning, set your must-sit-together couples and must-keep-apart guests. The algorithm respects these first.</div>
            <div style={S.tip}>🪑 <strong>Over-provision seats.</strong> Add a few extra seats per table — it's easier to remove empty chairs than to reshuffle at the last minute.</div>
            <div style={S.tip}>✨ <strong>Use Auto-Complete, not Auto-Assign</strong>, once you've hand-placed your key people. It fills the gaps without disturbing your careful arrangements.</div>
            <div style={S.tip}>💾 <strong>Save often.</strong> Download a backup before any big changes. The undo system is 40 steps deep, but a saved file is forever.</div>
          </div>
        </div>)}
      </div>
      <div style={{ padding: "12px 22px", borderTop: `1px solid ${C.lightGray}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="https://ko-fi.com/deptappliedmagic" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.gold, textDecoration: "none", fontWeight: 600 }}>☕ Support this project</a>
        <button onClick={onClose} style={{ padding: "8px 20px", border: "none", borderRadius: 10, background: `linear-gradient(135deg, ${C.sage}, ${C.darkSage})`, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.white, cursor: "pointer" }}>Got it!</button>
      </div>
    </div>
  </div>);
}

function GroupSelector({ value, onChange, groups, gc, onAddGroup, fontSize = 14 }) {
  const [adding, setAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const handleAdd = () => { const name = newGroupName.trim(); if (name && !groups.includes(name)) { onAddGroup(name); onChange(name); } setNewGroupName(""); setAdding(false); };
  if (adding) {
    return (<div style={{ display: "flex", gap: 4, flex: 1 }}>
      <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }} placeholder="Group name..." style={{ flex: 1, padding: "5px 8px", border: `1.5px solid ${C.sage}`, borderRadius: 6, fontFamily: "inherit", fontSize, background: C.cream, outline: "none" }} />
      <button onClick={handleAdd} style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: C.sage, color: C.white, fontFamily: "inherit", fontSize: fontSize - 1, fontWeight: 600, cursor: "pointer" }}>Add</button>
      <button onClick={() => setAdding(false)} style={{ padding: "5px 6px", border: `1px solid ${C.lightGray}`, borderRadius: 6, background: C.white, color: C.warmGray, fontFamily: "inherit", fontSize: fontSize - 1, cursor: "pointer" }}>×</button>
    </div>);
  }
  return (<div style={{ display: "flex", gap: 4, flex: 1 }}>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, padding: "5px 7px", border: `1px solid ${C.lightGray}`, borderRadius: 6, fontFamily: "inherit", fontSize, background: C.cream, outline: "none" }}>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select>
    <button onClick={() => setAdding(true)} title="Create new group" style={{ padding: "5px 9px", border: `1.5px dashed ${C.sage}`, borderRadius: 6, background: `${C.sage}08`, color: C.darkSage, fontFamily: "inherit", fontSize: fontSize - 1, fontWeight: 700, cursor: "pointer" }}>+</button>
  </div>);
}

// ══════════════════════════════════════════════════════════════
// ██  MAIN APP
// ══════════════════════════════════════════════════════════════

export default function App() {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState("list"); // "list" | "floor"
  const [selectedForPlacement, setSelectedForPlacement] = useState(null); // guest id for tap-to-place

  const [guests, setGuests] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.guests?.length) return s._version < 2 ? migrateV1Guests(s.guests) : s.guests; } } catch {} return buildInitialGuests();
  });
  const [tables, setTables] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.tables) return s.tables; } } catch {} return defaultTables;
  });
  const [floorObjects, setFloorObjects] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.floorObjects) return s.floorObjects; } } catch {} return defaultFloorObjects;
  });
  const [groupColors, setGroupColors] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.groupColors) return s.groupColors; } } catch {} return DEFAULT_GROUP_COLORS;
  });
  const [isStarterContent, setIsStarterContent] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); return s.isStarterContent === true; } } catch {} return true;
  });

  const [draggingGuest, setDraggingGuest] = useState(null);
  const [tab, setTab] = useState("guests");
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("General");
  const [newPO, setNewPO] = useState(0);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [toast, setToast] = useState(null);
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showBulk, setShowBulk] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [zoom, setZoom] = useState(() => isMobile ? 0.4 : 1);
  const [pan, setPan] = useState(() => isMobile ? { x: 0, y: 0 } : { x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [prefsSearch, setPrefsSearch] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const floorRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Undo/Redo ──
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const undoingRef = useRef(false);

  const snapshot = useCallback(() => JSON.stringify({ guests, tables, floorObjects, groupColors }), [guests, tables, floorObjects, groupColors]);
  const pushHistory = useCallback(() => {
    if (undoingRef.current) return;
    const snap = snapshot();
    setHistory(prev => { const newH = prev.slice(0, historyIndex + 1); newH.push(snap); if (newH.length > HISTORY_LIMIT) newH.shift(); return newH; });
    setHistoryIndex(prev => Math.min(prev + 1, HISTORY_LIMIT - 1));
  }, [snapshot, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    undoingRef.current = true;
    const newIdx = historyIndex - 1;
    try { const state = JSON.parse(history[newIdx]); setGuests(state.guests); setTables(state.tables); setFloorObjects(state.floorObjects); setGroupColors(state.groupColors); setHistoryIndex(newIdx); } catch {}
    setTimeout(() => { undoingRef.current = false; }, 50);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    undoingRef.current = true;
    const newIdx = historyIndex + 1;
    try { const state = JSON.parse(history[newIdx]); setGuests(state.guests); setTables(state.tables); setFloorObjects(state.floorObjects); setGroupColors(state.groupColors); setHistoryIndex(newIdx); } catch {}
    setTimeout(() => { undoingRef.current = false; }, 50);
  }, [history, historyIndex]);

  useEffect(() => { const snap = JSON.stringify({ guests, tables, floorObjects, groupColors }); setHistory([snap]); setHistoryIndex(0); }, []); // eslint-disable-line
  useEffect(() => { const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); } if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); } if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [undo, redo]);
  useEffect(() => { const timer = setTimeout(() => { try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ guests, tables, floorObjects, groupColors, isStarterContent, _version: 2 })); } catch {} }, 500); return () => clearTimeout(timer); }, [guests, tables, floorObjects, groupColors, isStarterContent]);
  const prevSnapRef = useRef("");
  useEffect(() => { const timer = setTimeout(() => { const snap = snapshot(); if (snap !== prevSnapRef.current) { prevSnapRef.current = snap; pushHistory(); } }, 600); return () => clearTimeout(timer); }, [guests, tables, floorObjects, groupColors]); // eslint-disable-line

  const groups = useMemo(() => { const s = new Set(Object.keys(groupColors)); guests.forEach(g => s.add(g.group)); return [...s]; }, [groupColors, guests]);
  useEffect(() => { if (!groupColors["General"]) setGroupColors(prev => ({ "General": "#B0B8C8", ...prev })); }, []);
  const addGroup = (name) => { if (groupColors[name]) return; const usedColors = new Set(Object.values(groupColors)); const color = EXTRA_COLORS.find(c => !usedColors.has(c)) || EXTRA_COLORS[Object.keys(groupColors).length % EXTRA_COLORS.length]; setGroupColors(prev => ({ ...prev, [name]: color })); };

  const gc = groupColors;
  const gm = useMemo(() => { const m = {}; guests.forEach(g => m[g.id] = g); return m; }, [guests]);
  const seatedSet = useMemo(() => { const s = new Set(); tables.forEach(t => t.seats.forEach(id => id && s.add(id))); return s; }, [tables]);
  const unseated = guests.filter(g => !seatedSet.has(g.id));
  const conflicts = useMemo(() => getConflicts(tables, gm), [tables, gm]);
  const cIds = useMemo(() => { const s = new Set(); conflicts.forEach(c => { s.add(c.a); s.add(c.b); }); return s; }, [conflicts]);

  const totalSeats = tables.reduce((n, t) => n + t.seatCount, 0);
  const totalSeated = seatedSet.size;
  const openSeats = totalSeats - totalSeated;

  const searchLower = searchQuery.toLowerCase().trim();
  const searchMatches = useMemo(() => { if (!searchLower) return new Set(); const s = new Set(); guests.forEach(g => { if (g.name.toLowerCase().includes(searchLower) || g.group.toLowerCase().includes(searchLower)) s.add(g.id); }); return s; }, [guests, searchLower]);

  const flash = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const flashAction = (msg, actionLabel, onAction) => { setToast({ msg, type: "warn", actionLabel, onAction }); setTimeout(() => setToast(prev => prev?.msg === msg ? null : prev), 8000); };

  const addGuest = () => { if (!newName.trim()) return; setGuests(p => [...p, ...makeGuest(newName.trim(), newGroup, newPO)]); flash(`Added ${newName.trim()}${newPO ? ` +${newPO}` : ""}`); setNewName(""); setNewPO(0); setIsStarterContent(false); };
  const bulkImport = (names, group, po) => { const all = []; names.forEach(n => all.push(...makeGuest(n, group, po))); setGuests(p => [...p, ...all]); flash(`Imported ${names.length} guests`); setIsStarterContent(false); };
  const removeGuest = (id) => { const g = gm[id]; if (!g) return; const cluster = getKeepWithCluster(id, gm); const linkedGuests = cluster.filter(cid => gm[cid]?.name.includes("'s Guest")); const rm = new Set([id, ...linkedGuests]); setGuests(p => p.filter(x => !rm.has(x.id)).map(x => ({ ...x, constraints: { keepWith: x.constraints.keepWith.filter(y => !rm.has(y)), keepApart: x.constraints.keepApart.filter(y => !rm.has(y)) } }))); setTables(p => p.map(t => ({ ...t, seats: t.seats.map(s => rm.has(s) ? null : s) }))); if (selectedGuest === id) setSelectedGuest(null); if (selectedForPlacement === id) setSelectedForPlacement(null); };
  const changeGroup = (guestId, newGrp) => { const g = gm[guestId]; if (!g || g.group === newGrp) return; const cluster = getKeepWithCluster(guestId, gm); setGuests(p => p.map(x => cluster.includes(x.id) ? { ...x, group: newGrp } : x)); flash(`Moved ${g.name} → ${newGrp}`); };
  const clearAllGuests = () => { setGuests([]); setTables(p => p.map(t => ({ ...t, seats: Array(t.seatCount).fill(null) }))); setSelectedGuest(null); setSelectedForPlacement(null); setGroupColors({ "General": "#B0B8C8" }); setNewGroup("General"); setIsStarterContent(false); flash("Everything cleared!"); };
  const startFresh = () => { clearAllGuests(); setTables(defaultTables.map(t => ({ ...t, seats: Array(t.seatCount).fill(null) }))); setFloorObjects(defaultFloorObjects); setIsStarterContent(false); flash("Fresh start!"); };

  const addTable = (name, seats, shape) => { setTables(p => [...p, { id: uid("t"), name: name || `Table ${p.length + 1}`, x: 200 + Math.random() * 200, y: 200 + Math.random() * 100, seatCount: seats, shape, seats: Array(seats).fill(null) }]); };
  const removeTable = (id) => setTables(p => p.filter(t => t.id !== id));
  const changeSeatCount = (tableId, delta) => {
    setTables(p => p.map(t => {
      if (t.id !== tableId) return t;
      const newCount = Math.max(2, Math.min(20, t.seatCount + delta));
      if (newCount === t.seatCount) return t;
      let newSeats;
      if (newCount > t.seatCount) { newSeats = [...t.seats, ...Array(newCount - t.seatCount).fill(null)]; }
      else { newSeats = [...t.seats]; let toRemove = t.seatCount - newCount; for (let i = newSeats.length - 1; i >= 0 && toRemove > 0; i--) { if (newSeats[i] === null) { newSeats.splice(i, 1); toRemove--; } } while (newSeats.length > newCount) newSeats.pop(); }
      return { ...t, seatCount: newCount, seats: newSeats };
    }));
  };

  const addFloorObject = (preset) => { setFloorObjects(p => [...p, { ...preset, id: uid("fo"), x: 150 + Math.random() * 200, y: 150 + Math.random() * 100 }]); };
  const updateFloorObject = (obj) => setFloorObjects(p => p.map(o => o.id === obj.id ? obj : o));
  const removeFloorObject = (id) => setFloorObjects(p => p.filter(o => o.id !== id));

  // ── Drop / Place guest with cluster + overflow ──
  const placeGuest = (guestId, tableId) => {
    const guest = gm[guestId]; if (!guest) return;
    const cluster = getKeepWithCluster(guestId, gm);
    const targetTable = tables.find(t => t.id === tableId); if (!targetTable) return;
    const emptyAfterClear = targetTable.seats.filter(s => s === null || cluster.includes(s)).length;
    const needToPlace = cluster.filter(cid => !targetTable.seats.includes(cid));

    if (needToPlace.length > emptyAfterClear) {
      const shortage = needToPlace.length - emptyAfterClear;
      flashAction(
        `Not enough seats! ${guest.name} + ${cluster.length - 1} linked need ${needToPlace.length} open, ${targetTable.name} has ${targetTable.seats.filter(s => s === null).length}.`,
        `Add ${shortage} seat${shortage > 1 ? "s" : ""} & place`,
        () => {
          setTables(p => {
            let u = p.map(t => {
              if (t.id === tableId) { const nc = t.seatCount + shortage; return { ...t, seatCount: nc, seats: [...t.seats.map(s => cluster.includes(s) ? null : s), ...Array(shortage).fill(null)] }; }
              return { ...t, seats: t.seats.map(s => cluster.includes(s) ? null : s) };
            });
            const tgt = u.find(t => t.id === tableId);
            if (tgt) cluster.forEach(mid => { if (!tgt.seats.includes(mid)) { const i = tgt.seats.indexOf(null); if (i !== -1) tgt.seats[i] = mid; } });
            return u;
          });
          setToast(null); flash(`Expanded ${targetTable.name} and seated ${cluster.length}`);
        }
      );
      return;
    }
    setTables(p => {
      let u = p.map(t => ({ ...t, seats: [...t.seats.map(s => cluster.includes(s) ? null : s)] }));
      const tgt = u.find(t => t.id === tableId);
      if (tgt) cluster.forEach(mid => { const i = tgt.seats.indexOf(null); if (i !== -1) tgt.seats[i] = mid; });
      return u;
    });
    setSelectedForPlacement(null);
    flash(`Seated ${guest.name}${cluster.length > 1 ? ` +${cluster.length - 1}` : ""} at ${targetTable.name}`);
  };

  const dropGuest = (guestId, tableId) => placeGuest(guestId, tableId);

  const unseat = (guestId) => { const guest = gm[guestId]; if (!guest) return; const cluster = getKeepWithCluster(guestId, gm); setTables(p => p.map(t => ({ ...t, seats: t.seats.map(s => cluster.includes(s) ? null : s) }))); };
  const renameTable = (id, name) => setTables(p => p.map(t => t.id === id ? { ...t, name } : t));
  const toggleConstraint = (guestId, targetId, type) => { setGuests(p => p.map(g => { if (g.id !== guestId && g.id !== targetId) return g; const thisId = g.id === guestId ? targetId : guestId; const other = type === "keepWith" ? "keepApart" : "keepWith"; const list = g.constraints[type].includes(thisId) ? g.constraints[type].filter(x => x !== thisId) : [...g.constraints[type], thisId]; return { ...g, constraints: { ...g.constraints, [type]: list, [other]: g.constraints[other].filter(x => x !== thisId) } }; })); };

  const runAutoAssign = () => { const r = assignGuests(guests, tables, gm, groups); setTables(r); const c = getConflicts(r, gm); const s = r.reduce((n, t) => n + t.seats.filter(Boolean).length, 0); flash(c.length === 0 ? `All ${s} seated!` : `${s} seated — ${c.length} conflict${c.length > 1 ? "s" : ""}`, c.length ? "warn" : "success"); };
  const runAutoComplete = () => { const already = new Set(); tables.forEach(t => t.seats.forEach(s => s && already.add(s))); const rem = guests.filter(g => !already.has(g.id)).length; if (!rem) { flash("Everyone seated!"); return; } const r = assignGuests(guests, tables, gm, groups, true); setTables(r); const c = getConflicts(r, gm); const newS = r.reduce((n, t) => n + t.seats.filter(Boolean).length, 0) - already.size; flash(c.length === 0 ? `Placed ${newS} remaining!` : `Placed ${newS} — ${c.length} conflict${c.length > 1 ? "s" : ""}`, c.length ? "warn" : "success"); };
  const clearAllSeats = () => setTables(p => p.map(t => ({ ...t, seats: Array(t.seatCount).fill(null) })));

  const saveState = () => {
    const state = { guests, tables, floorObjects, groupColors, isStarterContent, _version: 2 };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `wheredotheysit-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    flash("Layout saved!");
  };
  const loadState = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const state = JSON.parse(ev.target.result);
        if (state.guests) setGuests(state._version < 2 ? migrateV1Guests(state.guests) : state.guests);
        if (state.tables) setTables(state.tables);
        if (state.floorObjects) setFloorObjects(state.floorObjects);
        if (state.groupColors) setGroupColors(state.groupColors);
        _id = Math.max(_id, 500 + (state.guests?.length || 0) + (state.tables?.length || 0));
        setIsStarterContent(false); flash("Layout loaded!");
      } catch { flash("Invalid file", "warn"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  // ── Mobile tap-to-place handler ──
  const handleGuestTap = (guestId) => {
    if (selectedForPlacement === guestId) { setSelectedForPlacement(null); }
    else { setSelectedForPlacement(guestId); }
  };

  // ── Desktop floor drag ──
  const handleFloorMouseDown = (e, tid) => { e.preventDefault(); e.stopPropagation(); const rect = floorRef.current.getBoundingClientRect(); const t = tables.find(x => x.id === tid); setDraggingTable(tid); setDragOffset({ x: (e.clientX - rect.left) / zoom - pan.x - t.x, y: (e.clientY - rect.top) / zoom - pan.y - t.y }); };
  const handleFloorTouchStart = (e, tid) => { e.stopPropagation(); _itemDragging = true; const touch = e.touches[0]; const rect = floorRef.current.getBoundingClientRect(); const t = tables.find(x => x.id === tid); setDraggingTable(tid); setDragOffset({ x: (touch.clientX - rect.left) / zoom - pan.x - t.x, y: (touch.clientY - rect.top) / zoom - pan.y - t.y }); };
  const handleFloorMouseMove = useCallback(e => { if (!draggingTable || !floorRef.current) return; const rect = floorRef.current.getBoundingClientRect(); setTables(p => p.map(t => { if (t.id !== draggingTable) return t; return { ...t, x: (e.clientX - rect.left) / zoom - pan.x - dragOffset.x, y: (e.clientY - rect.top) / zoom - pan.y - dragOffset.y }; })); }, [draggingTable, dragOffset, zoom, pan]);
  const handleFloorTouchMove = useCallback(e => { if (!draggingTable || !floorRef.current) return; e.preventDefault(); const touch = e.touches[0]; const rect = floorRef.current.getBoundingClientRect(); setTables(p => p.map(t => { if (t.id !== draggingTable) return t; return { ...t, x: (touch.clientX - rect.left) / zoom - pan.x - dragOffset.x, y: (touch.clientY - rect.top) / zoom - pan.y - dragOffset.y }; })); }, [draggingTable, dragOffset, zoom, pan]);
  const handleFloorMouseUp = useCallback(() => { setDraggingTable(null); _itemDragging = false; }, []);
  useEffect(() => { if (draggingTable) { window.addEventListener("mousemove", handleFloorMouseMove); window.addEventListener("mouseup", handleFloorMouseUp); window.addEventListener("touchmove", handleFloorTouchMove, { passive: false }); window.addEventListener("touchend", handleFloorMouseUp); return () => { window.removeEventListener("mousemove", handleFloorMouseMove); window.removeEventListener("mouseup", handleFloorMouseUp); window.removeEventListener("touchmove", handleFloorTouchMove); window.removeEventListener("touchend", handleFloorMouseUp); }; } }, [draggingTable, handleFloorMouseMove, handleFloorTouchMove, handleFloorMouseUp]);

  const handlePanStart = (e) => { if (e.target !== floorRef.current && e.target !== floorRef.current?.firstChild) return; setPanning(true); setPanStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom }); };
  const handlePanMove = useCallback((e) => { if (!panning) return; setPan({ x: (e.clientX - panStart.x) / zoom, y: (e.clientY - panStart.y) / zoom }); }, [panning, panStart, zoom]);
  const handlePanEnd = useCallback(() => setPanning(false), []);
  useEffect(() => { if (panning) { window.addEventListener("mousemove", handlePanMove); window.addEventListener("mouseup", handlePanEnd); return () => { window.removeEventListener("mousemove", handlePanMove); window.removeEventListener("mouseup", handlePanEnd); }; } }, [panning, handlePanMove, handlePanEnd]);

  const handleWheel = useCallback((e) => { e.preventDefault(); setZoom(z => Math.min(2, Math.max(0.3, z + (e.deltaY > 0 ? -0.08 : 0.08)))); }, []);
  useEffect(() => { const el = floorRef.current; if (el) { el.addEventListener("wheel", handleWheel, { passive: false }); return () => el.removeEventListener("wheel", handleWheel); } }, [handleWheel]);

  // ── Touch pan & pinch-to-zoom ──
  const touchRef = useRef({ lastTouch: null, lastDist: null, itemDragging: false });

  const handleTouchStart = useCallback((e) => {
    if (_itemDragging) return;
    if (e.touches.length === 1) {
      touchRef.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchRef.current.lastDist = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current.lastDist = Math.hypot(dx, dy);
      touchRef.current.lastTouch = null;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (_itemDragging) return;
    e.preventDefault();
    if (e.touches.length === 1 && touchRef.current.lastTouch) {
      const t = e.touches[0];
      const dx = t.clientX - touchRef.current.lastTouch.x;
      const dy = t.clientY - touchRef.current.lastTouch.y;
      setPan(p => ({ x: p.x + dx / zoom, y: p.y + dy / zoom }));
      touchRef.current.lastTouch = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2 && touchRef.current.lastDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / touchRef.current.lastDist;
      setZoom(z => Math.min(2, Math.max(0.3, z * scale)));
      touchRef.current.lastDist = dist;
    }
  }, [zoom]);

  const handleTouchEnd = useCallback(() => {
    touchRef.current.lastTouch = null;
    touchRef.current.lastDist = null;
    touchRef.current.itemDragging = false;
  }, []);

  useEffect(() => {
    const el = floorRef.current;
    if (el) {
      el.addEventListener("touchstart", handleTouchStart, { passive: false });
      el.addEventListener("touchmove", handleTouchMove, { passive: false });
      el.addEventListener("touchend", handleTouchEnd, { passive: false });
      return () => {
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
        el.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // ── Fit-to-tables (auto-center and zoom to show all tables) ──
  const fitToTables = useCallback(() => {
    if (!tables.length || !floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    const vw = rect.width, vh = rect.height;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    tables.forEach(t => {
      const sz = getTableSize(t);
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + sz.w);
      maxY = Math.max(maxY, t.y + sz.h);
    });
    const pad = 60;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const newZoom = Math.min(2, Math.max(0.3, Math.min(vw / contentW, vh / contentH)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoom(newZoom);
    setPan({ x: (vw / 2 / newZoom) - cx, y: (vh / 2 / newZoom) - cy });
  }, [tables]);

  // Auto-fit when switching to floor view on mobile
  useEffect(() => {
    if (isMobile && mobileView === "floor") {
      // Multiple retries because the ref may not have dimensions immediately
      const tryFit = (attempt) => {
        if (attempt > 5) return;
        if (floorRef.current) {
          const rect = floorRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            fitToTables();
            return;
          }
        }
        setTimeout(() => tryFit(attempt + 1), 150);
      };
      setTimeout(() => tryFit(0), 50);
    }
  }, [isMobile, mobileView]); // eslint-disable-line

  const selObj = selectedGuest ? gm[selectedGuest] : null;
  const handleGroupDrop = (e, grp) => { e.preventDefault(); const gid = e.dataTransfer.getData("guestId"); const dt = e.dataTransfer.getData("dragType"); if (gid && dt === "guest") changeGroup(gid, grp); };
  const activeGroups = groups.filter(grp => guests.some(g => g.group === grp));

  // ── Sidebar / Panel Content (shared between desktop sidebar and mobile list view) ──
  const renderPanel = () => (
    <>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.lightGray}` }}>
        {["guests", "tables", "layout", "prefs"].map(t => {
          const tabLabels = { guests: "Guests", tables: "Tables", layout: "Layout", prefs: "Preferences" };
          return (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: isMobile ? "11px 0" : "9px 0", border: "none", background: tab === t ? C.white : "transparent", borderBottom: tab === t ? `2px solid ${C.sage}` : "2px solid transparent", fontFamily: "inherit", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? C.charcoal : C.warmGray, cursor: "pointer" }}>{tabLabels[t]}</button>
        ); })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {tab === "guests" && (<div>
          <div style={{ marginBottom: 10, position: "relative" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Search guests..." style={{ width: "100%", padding: "7px 10px", border: `1.5px solid ${searchQuery ? C.gold : C.lightGray}`, borderRadius: 8, fontFamily: "inherit", fontSize: 14, background: C.white, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
            {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: 8, border: "none", background: "none", cursor: "pointer", color: C.warmGray, fontSize: 14 }}>×</button>}
            {searchQuery && <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginTop: 3 }}>{searchMatches.size} match{searchMatches.size !== 1 ? "es" : ""}</div>}
          </div>
          <div style={{ marginBottom: 10, padding: 10, background: C.white, borderRadius: 10, border: `1px solid ${C.lightGray}` }}>
            <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addGuest()} placeholder="Guest name..." style={{ flex: 1, padding: "6px 9px", border: `1px solid ${C.lightGray}`, borderRadius: 6, fontFamily: "inherit", fontSize: 15, background: C.cream, outline: "none", minHeight: isMobile ? 44 : "auto" }} />
              <button onClick={addGuest} style={{ padding: "6px 14px", border: "none", borderRadius: 6, background: C.sage, color: C.white, fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer", minHeight: isMobile ? 44 : "auto" }}>Add</button>
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <GroupSelector value={newGroup} onChange={setNewGroup} groups={groups} gc={gc} onAddGroup={addGroup} fontSize={14} />
              <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 14, color: C.warmGray, background: C.cream, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.lightGray}`, flexShrink: 0 }}>
                <span>+:</span>
                <button onClick={() => setNewPO(Math.max(0, newPO - 1))} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: C.warmGray, fontSize: 17, padding: 0, minWidth: isMobile ? 32 : "auto", minHeight: isMobile ? 32 : "auto" }}>−</button>
                <span style={{ minWidth: 14, textAlign: "center", fontWeight: 600 }}>{newPO}</span>
                <button onClick={() => setNewPO(Math.min(5, newPO + 1))} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: C.warmGray, fontSize: 17, padding: 0, minWidth: isMobile ? 32 : "auto", minHeight: isMobile ? 32 : "auto" }}>+</button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
            <button onClick={() => setShowBulk(true)} style={{ flex: 1, padding: "7px 0", border: `1.5px dashed ${C.gold}`, borderRadius: 7, background: `${C.gold}08`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.gold, cursor: "pointer", minHeight: isMobile ? 44 : "auto" }}>📋 Bulk Import</button>
            {guests.length > 0 && <button onClick={() => setConfirmAction({ title: "Clear All Guests?", message: "This removes every guest and unseats everyone. You can undo with Ctrl+Z.", danger: true, onConfirm: () => { clearAllGuests(); setConfirmAction(null); }, onClose: () => setConfirmAction(null) })} style={{ padding: "7px 10px", border: `1.5px solid ${C.rose}40`, borderRadius: 7, background: `${C.rose}06`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.rose, cursor: "pointer", minHeight: isMobile ? 44 : "auto" }}>Clear All</button>}
          </div>

          {/* On mobile: show selected guest banner */}
          {isMobile && selectedForPlacement && gm[selectedForPlacement] && (
            <div style={{ marginBottom: 10, padding: "8px 12px", background: `${C.sage}15`, border: `2px solid ${C.sage}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.darkSage }}>
                ✓ {gm[selectedForPlacement].name} selected — tap "Seat here" on a table below
              </div>
              <button onClick={() => setSelectedForPlacement(null)} style={{ border: "none", background: "none", color: C.warmGray, fontSize: 16, cursor: "pointer", padding: "0 4px" }}>×</button>
            </div>
          )}

          {unseated.length > 0 && (<div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.warmGray, marginBottom: 5, fontWeight: 600 }}>Unseated ({unseated.length}){isMobile ? " — tap to select" : ""}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{unseated.filter(g => !searchLower || searchMatches.has(g.id)).map(g => <Badge key={g.id} guest={g} gc={gc} small isDragging={draggingGuest === g.id} onDragStart={setDraggingGuest} onDragEnd={() => setDraggingGuest(null)} hasConflict={cIds.has(g.id)} highlight={searchMatches.has(g.id)} onTap={handleGuestTap} isSelected={selectedForPlacement === g.id} isMobile={isMobile} />)}</div></div>)}

          {/* On mobile: show table cards for tap-to-place INLINE in guests tab */}
          {isMobile && selectedForPlacement && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.sage, marginBottom: 6, fontWeight: 700 }}>Choose a table</div>
              {tables.map(t => <MobileTableCard key={t.id} table={t} gm={gm} gc={gc} conflicts={conflicts} selectedGuest={selectedForPlacement} onPlaceHere={(tid) => placeGuest(selectedForPlacement, tid)} onUnseat={unseat} onSeatChange={changeSeatCount} onRename={renameTable} />)}
            </div>
          )}

          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.warmGray, marginBottom: 5, fontWeight: 600 }}>All Guests{!isMobile ? " — drag between groups" : ""}</div>
          {activeGroups.map(grp => {
            const groupGuests = guests.filter(g => g.group === grp && (!searchLower || searchMatches.has(g.id)));
            if (searchLower && groupGuests.length === 0) return null;
            return (
            <div key={grp} style={{ marginBottom: 10, padding: "4px 6px", borderRadius: 7, transition: "all 0.2s" }}
              onDragOver={!isMobile ? (e => { e.preventDefault(); e.currentTarget.style.background = `${gc[grp] || C.warmGray}15`; e.currentTarget.style.outline = `2px dashed ${gc[grp] || C.warmGray}60`; }) : undefined}
              onDragLeave={!isMobile ? (e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.outline = "none"; }) : undefined}
              onDrop={!isMobile ? (e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.outline = "none"; handleGroupDrop(e, grp); }) : undefined}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: gc[grp] || C.warmGray }} /><span style={{ fontSize: 13.5, fontWeight: 600, color: C.warmGray }}>{grp}</span><span style={{ fontSize: 12, color: `${C.warmGray}70` }}>({guests.filter(g => g.group === grp).length})</span></div>
              {groupGuests.map(g => (
                <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px", marginBottom: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                    <Badge guest={g} gc={gc} small isDragging={draggingGuest === g.id} onDragStart={setDraggingGuest} onDragEnd={() => setDraggingGuest(null)} hasConflict={cIds.has(g.id)} highlight={searchMatches.has(g.id)} onTap={handleGuestTap} isSelected={selectedForPlacement === g.id} isMobile={isMobile} />
                    {g.constraints.keepWith.length > 0 && <span style={{ fontSize: 12, color: C.warmGray, fontStyle: "italic" }}>🔗{g.constraints.keepWith.length}</span>}
                  </div>
                  <button onClick={() => removeGuest(g.id)} style={{ border: "none", background: "none", color: C.warmGray, cursor: "pointer", fontSize: 15, padding: "0 4px", opacity: 0.3, minHeight: isMobile ? 44 : "auto", minWidth: isMobile ? 44 : "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>))}
            </div>); })}
        </div>)}

        {tab === "tables" && (<div>
          <button onClick={() => setShowAddTable(true)} style={{ width: "100%", padding: "9px 0", border: `1.5px dashed ${C.sage}`, borderRadius: 8, background: `${C.sage}08`, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.darkSage, cursor: "pointer", marginBottom: 12, minHeight: isMobile ? 48 : "auto" }}>+ Add Table</button>
          {tables.map(t => {
            if (isMobile) return <MobileTableCard key={t.id} table={t} gm={gm} gc={gc} conflicts={conflicts} selectedGuest={selectedForPlacement} onPlaceHere={(tid) => placeGuest(selectedForPlacement, tid)} onUnseat={unseat} onSeatChange={changeSeatCount} onRename={renameTable} />;
            return <DesktopTableCard key={t.id} table={t} gm={gm} gc={gc} conflicts={conflicts} onSeatChange={changeSeatCount} onRename={renameTable} onRemove={(id) => setConfirmAction({ title: `Remove ${t.name}?`, message: `This will unseat ${t.seats.filter(Boolean).length} guest${t.seats.filter(Boolean).length !== 1 ? "s" : ""} and remove the table. You can undo with Ctrl+Z.`, danger: true, onConfirm: () => { removeTable(id); setConfirmAction(null); flash(`Removed ${t.name}`); }, onClose: () => setConfirmAction(null) })} />;
          })}
        </div>)}

        {tab === "layout" && (<div>
          <div style={{ fontSize: 13.5, color: C.warmGray, marginBottom: 12, lineHeight: 1.5 }}>Add venue elements.{!isMobile ? " Drag to position, hover edges to resize, double-click to rename." : " Switch to Floor View to position them."}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {FLOOR_PRESETS.map((p, i) => (
              <button key={i} onClick={() => addFloorObject(p)} style={{ padding: "10px 6px", border: `1.5px solid ${C.lightGray}`, borderRadius: 9, background: C.white, fontFamily: "inherit", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: C.charcoal, minHeight: isMobile ? 48 : "auto" }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span><span style={{ fontWeight: 500 }}>{p.label}</span>
              </button>))}
          </div>
          {floorObjects.length > 0 && (<div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.warmGray, marginBottom: 6, fontWeight: 600 }}>On Floor ({floorObjects.length})</div>
            {floorObjects.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 6px", fontSize: 14, borderBottom: `1px solid ${C.lightGray}20`, minHeight: isMobile ? 44 : "auto" }}>
                <span>{o.icon} {o.label}</span>
                <button onClick={() => removeFloorObject(o.id)} style={{ border: "none", background: "none", color: C.rose, cursor: "pointer", fontSize: 12.5 }}>Remove</button>
              </div>))}
          </div>)}
        </div>)}

        {tab === "prefs" && (<div>
          <div style={{ fontSize: 13.5, color: C.warmGray, marginBottom: 10, lineHeight: 1.6 }}>Select a guest, then choose who they should sit <strong style={{ color: C.sage }}>together with</strong> or <strong style={{ color: C.rose }}>apart from</strong>.</div>
          <input value={prefsSearch} onChange={e => setPrefsSearch(e.target.value)} placeholder="🔍 Search by name..." style={{ width: "100%", padding: "7px 10px", border: `1.5px solid ${prefsSearch ? C.gold : C.lightGray}`, borderRadius: 8, fontFamily: "inherit", fontSize: 14, background: C.white, outline: "none", boxSizing: "border-box", marginBottom: 10, transition: "border-color 0.2s" }} />
          {/* Existing constraints summary */}
          {(() => { const allConstraints = []; guests.forEach(g => { g.constraints.keepWith.forEach(tid => { const t = gm[tid]; if (t && g.id < tid) allConstraints.push({ a: g, b: t, type: "together" }); }); g.constraints.keepApart.forEach(tid => { const t = gm[tid]; if (t && g.id < tid) allConstraints.push({ a: g, b: t, type: "apart" }); }); }); return allConstraints.length > 0 && !selectedGuest ? (
            <div style={{ marginBottom: 12, padding: 10, background: `${C.cream}`, borderRadius: 10, border: `1px solid ${C.lightGray}` }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.warmGray, marginBottom: 6, fontWeight: 600 }}>Active Preferences ({allConstraints.length})</div>
              {allConstraints.filter(c => !prefsSearch || c.a.name.toLowerCase().includes(prefsSearch.toLowerCase()) || c.b.name.toLowerCase().includes(prefsSearch.toLowerCase())).map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: `1px solid ${C.lightGray}20`, fontSize: 13 }}>
                  <span style={{ color: c.type === "together" ? C.darkSage : C.deepRose, fontSize: 12 }}>{c.type === "together" ? "🔗" : "🚫"}</span>
                  <span>{c.a.name}</span>
                  <span style={{ color: C.warmGray, fontSize: 11 }}>{c.type === "together" ? "with" : "apart from"}</span>
                  <span>{c.b.name}</span>
                </div>
              ))}
            </div>
          ) : null; })()}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
            {guests.filter(g => !prefsSearch || g.name.toLowerCase().includes(prefsSearch.toLowerCase())).map(g => (<div key={g.id} onClick={() => { setSelectedGuest(selectedGuest === g.id ? null : g.id); }} style={{ padding: "3px 10px", borderRadius: 12, border: `1.5px solid ${selectedGuest === g.id ? C.sage : (g.constraints.keepWith.length > 0 || g.constraints.keepApart.length > 0) ? `${C.gold}60` : C.lightGray}`, background: selectedGuest === g.id ? `${C.sage}15` : C.white, cursor: "pointer", fontSize: 13, fontWeight: selectedGuest === g.id ? 600 : 400, minHeight: isMobile ? 40 : "auto", display: "flex", alignItems: "center", gap: 4 }}>{g.name}{(g.constraints.keepWith.length > 0 || g.constraints.keepApart.length > 0) && <span style={{ fontSize: 10, color: C.gold }}>●</span>}</div>))}
          </div>
          {selObj && (<div style={{ padding: 12, border: `1px solid ${C.lightGray}`, borderRadius: 10, background: C.white }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 3 }}>Preferences for {selObj.name}</div>
            {selObj.constraints.keepWith.length > 0 && <div style={{ fontSize: 12.5, color: C.warmGray, marginBottom: 7, fontStyle: "italic" }}>Linked with: {selObj.constraints.keepWith.map(kid => gm[kid]?.name).filter(Boolean).join(", ")}</div>}
            {selObj.constraints.keepApart.length > 0 && <div style={{ fontSize: 12.5, color: C.rose, marginBottom: 7, fontStyle: "italic" }}>Apart from: {selObj.constraints.keepApart.map(kid => gm[kid]?.name).filter(Boolean).join(", ")}</div>}
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {guests.filter(g => g.id !== selectedGuest).filter(g => !prefsSearch || g.name.toLowerCase().includes(prefsSearch.toLowerCase())).map(g => { const kw = selObj.constraints.keepWith.includes(g.id), ka = selObj.constraints.keepApart.includes(g.id); return (
                <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.lightGray}20` }}>
                  <span style={{ fontSize: 13.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name} <span style={{ fontSize: 11, color: `${C.warmGray}80` }}>({g.group})</span></span>
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    <button onClick={() => toggleConstraint(selectedGuest, g.id, "keepWith")} style={{ padding: isMobile ? "6px 12px" : "2px 9px", borderRadius: 8, border: `1px solid ${kw ? C.sage : C.lightGray}`, background: kw ? `${C.sage}20` : "transparent", color: kw ? C.darkSage : C.warmGray, fontSize: 12, fontWeight: kw ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>Together</button>
                    <button onClick={() => toggleConstraint(selectedGuest, g.id, "keepApart")} style={{ padding: isMobile ? "6px 12px" : "2px 9px", borderRadius: 8, border: `1px solid ${ka ? C.rose : C.lightGray}`, background: ka ? `${C.rose}20` : "transparent", color: ka ? C.deepRose : C.warmGray, fontSize: 12, fontWeight: ka ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>Apart</button>
                  </div>
                </div>); })}
            </div>
          </div>)}
        </div>)}
      </div>

      {/* Persistent conflicts panel */}
      {conflicts.length > 0 && (
        <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.error}30`, background: `${C.error}06` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.error, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>⚠ {conflicts.length} Seating Conflict{conflicts.length > 1 ? "s" : ""}</div>
          <div style={{ maxHeight: 80, overflowY: "auto" }}>
            {conflicts.map((c, i) => {
              const a = gm[c.a], b = gm[c.b];
              if (!a || !b) return null;
              const tbl = c.table ? tables.find(t => t.id === c.table) : null;
              return (
                <div key={i} style={{ fontSize: 12, color: C.warmGray, lineHeight: 1.6 }}>
                  {c.type === "apart" ? <span><strong style={{ color: C.charcoal }}>{a.name}</strong> & <strong style={{ color: C.charcoal }}>{b.name}</strong> should be <span style={{ color: C.rose, fontWeight: 600 }}>apart</span>{tbl ? ` (both at ${tbl.name})` : ""}</span>
                    : <span><strong style={{ color: C.charcoal }}>{a.name}</strong> & <strong style={{ color: C.charcoal }}>{b.name}</strong> should be <span style={{ color: C.sage, fontWeight: 600 }}>together</span> (different tables)</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions panel */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.lightGray}`, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={runAutoAssign} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, background: `linear-gradient(135deg, ${C.sage}, ${C.darkSage})`, color: C.white, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 2px 12px ${C.sage}40`, minHeight: isMobile ? 48 : "auto" }}>✨ Auto-Assign</button>
          <button onClick={() => setConfirmAction({ title: "Clear Seats?", message: "Unseat everyone but keep guest list and tables?", onConfirm: () => { clearAllSeats(); setConfirmAction(null); flash("Seats cleared"); }, onClose: () => setConfirmAction(null) })} style={{ padding: "9px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 8, background: C.white, color: C.warmGray, fontFamily: "inherit", fontSize: 13, cursor: "pointer", minHeight: isMobile ? 48 : "auto" }}>Clear</button>
        </div>
        {unseated.length > 0 && unseated.length < guests.length && (
          <button onClick={runAutoComplete} style={{ width: "100%", padding: "8px 0", border: `1.5px solid ${C.gold}`, borderRadius: 8, background: `${C.gold}10`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.darkGold, cursor: "pointer", minHeight: isMobile ? 44 : "auto" }}>🧩 Auto-Complete ({unseated.length} left)</button>
        )}
      </div>
    </>
  );

  // ── Floor plan (shared between desktop right side and mobile floor view) ──
  const renderFloor = () => (
    <div style={isMobile ? { width: "100%", height: "100%", position: "relative", overflow: "hidden", background: C.cream } : { flex: 1, position: "relative", overflow: "hidden" }}>
      {toast && <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "8px 16px", borderRadius: 10, fontWeight: 600, fontSize: 14, background: toast.type === "success" ? C.sage : C.gold, color: C.white, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.3s ease", display: "flex", alignItems: "center", gap: 10, maxWidth: "90%" }}>
        <span style={{ flex: 1 }}>{toast.msg}</span>
        {toast.actionLabel && <button onClick={toast.onAction} style={{ padding: "4px 12px", border: `1.5px solid ${C.white}40`, borderRadius: 6, background: `${C.white}25`, color: C.white, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{toast.actionLabel}</button>}
      </div>}

      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 20, display: "flex", flexDirection: "column", gap: 4, background: `${C.white}95`, borderRadius: 10, padding: 4, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, border: `1px solid ${C.lightGray}`, borderRadius: 7, background: C.white, cursor: "pointer", fontSize: 17, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        <div style={{ fontSize: 11.5, textAlign: "center", color: C.warmGray, fontWeight: 600 }}>{Math.round(zoom * 100)}%</div>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, border: `1px solid ${C.lightGray}`, borderRadius: 7, background: C.white, cursor: "pointer", fontSize: 17, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <button onClick={fitToTables} title="Fit all tables" style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, border: `1px solid ${C.sage}`, borderRadius: 7, background: `${C.sage}15`, cursor: "pointer", fontSize: 12, color: C.darkSage, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>⟲</button>
      </div>

      {/* Prominent center button on mobile */}
      {isMobile && (
        <button onClick={fitToTables} style={{ position: "absolute", top: 10, left: 10, zIndex: 20, padding: "8px 14px", border: `1.5px solid ${C.sage}`, borderRadius: 8, background: `${C.white}95`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.darkSage, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 5 }}>
          📍 Center Tables
        </button>
      )}

      {isMobile && <div style={{ position: "absolute", bottom: 44, right: 10, fontSize: 12, color: C.warmGray, background: `${C.white}90`, padding: "5px 10px", borderRadius: 6, zIndex: 10 }}>Drag to pan · Pinch to zoom</div>}

      {!isMobile && <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 11.5, color: C.warmGray, background: `${C.white}90`, padding: "4px 8px", borderRadius: 6, zIndex: 10 }}>Scroll to zoom · Drag space to pan · Ctrl+Z undo</div>}

      <div ref={floorRef} onMouseDown={handlePanStart} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", cursor: panning ? "grabbing" : (draggingTable ? "grabbing" : "grab"), touchAction: "none" }}>
        <div style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "0 0", position: "absolute", width: 1200, height: 900, backgroundImage: `radial-gradient(circle, ${C.lightGray}40 1px, transparent 1px)`, backgroundSize: "24px 24px" }}>
          {floorObjects.map(o => <FloorObject key={o.id} obj={o} onUpdate={updateFloorObject} onRemove={removeFloorObject} zoom={zoom} />)}
          {tables.map(t => { const cx = t.shape === "rect" ? 75 : 78; const cy = t.shape === "rect" ? 50 : 78; return (<div key={`h-${t.id}`} onMouseDown={e => handleFloorMouseDown(e, t.id)} onTouchStart={e => handleFloorTouchStart(e, t.id)} style={{ position: "absolute", left: t.x + cx - 18, top: t.y + cy - 18, width: 36, height: 36, borderRadius: "50%", cursor: "grab", zIndex: 5, touchAction: "none" }} />); })}
          {tables.map(t => <TableViz key={t.id} table={t} gm={gm} gc={gc} onDrop={dropGuest} onRemove={unseat} conflicts={conflicts} onRename={renameTable} onSeatChange={changeSeatCount} onDelete={(id) => setConfirmAction({ title: `Remove ${t.name}?`, message: `This will unseat ${t.seats.filter(Boolean).length} guest${t.seats.filter(Boolean).length !== 1 ? "s" : ""} and remove the table. You can undo with Ctrl+Z.`, danger: true, onConfirm: () => { removeTable(id); setConfirmAction(null); flash(`Removed ${t.name}`); }, onClose: () => setConfirmAction(null) })} />)}
          {tables.length === 0 && floorObjects.length === 0 && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: C.warmGray }}><div style={{ fontSize: 36, opacity: 0.3 }}>🪑</div><div style={{ fontSize: 15 }}>Add tables to start</div></div>}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", flexWrap: "wrap", gap: 6, background: `${C.white}95`, padding: "7px 12px", borderRadius: 8, backdropFilter: "blur(8px)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", zIndex: 10 }}>
        {groups.filter(g => guests.some(x => x.group === g)).map(g => (<div key={g} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><span style={{ width: 8, height: 7, borderRadius: "50%", background: gc[g] || C.warmGray }} /><span style={{ color: C.warmGray }}>{g}</span></div>))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", background: `linear-gradient(170deg, ${C.cream} 0%, #F5EDE4 50%, ${C.cream} 100%)`, height: isMobile ? "100dvh" : "auto", minHeight: isMobile ? "100vh" : "100vh", maxHeight: isMobile ? "100dvh" : "none", color: C.charcoal, display: "flex", flexDirection: "column", overflow: isMobile ? "hidden" : "visible" }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {showBulk && <BulkImportModal onClose={() => setShowBulk(false)} onImport={bulkImport} groups={groups} gc={gc} />}
      {showAddTable && <AddTableModal onClose={() => setShowAddTable(false)} onAdd={addTable} />}
      {showExport && <ExportModal tables={tables} guests={guests} gm={gm} gc={gc} onClose={() => setShowExport(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {confirmAction && <ConfirmModal {...confirmAction} />}
      <input ref={fileInputRef} type="file" accept=".json" onChange={loadState} style={{ display: "none" }} />

      {/* ── Header ── */}
      <div style={{ padding: isMobile ? "8px 12px" : "10px 20px", borderBottom: `1px solid ${C.lightGray}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.white}90`, backdropFilter: "blur(10px)", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, minWidth: 0 }}>
          <span style={{ fontSize: isMobile ? 18 : 20 }}>🪑</span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: isMobile ? 16 : 19, fontWeight: 600, margin: 0, background: `linear-gradient(135deg, ${C.charcoal}, ${C.warmGray})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>WhereDoTheySit.com</h1>
            {!isMobile && <div style={{ fontSize: 11, color: C.warmGray, fontWeight: 400, letterSpacing: 0.5, marginTop: 1, opacity: 0.65 }}>The Free Guest List Organizer</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 4 : 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* Capacity summary — compact on mobile */}
          <div style={{ fontSize: isMobile ? 11 : 12, color: C.warmGray, display: "flex", gap: isMobile ? 6 : 10, alignItems: "center", marginRight: isMobile ? 0 : 4, flexWrap: "wrap" }}>
            <span>{guests.length} {isMobile ? "guests" : "guests"}</span>
            <span style={{ color: C.darkSage }}>{totalSeated} seated</span>
            <span style={{ color: openSeats < unseated.length ? C.rose : C.warmGray, fontWeight: openSeats < unseated.length ? 600 : 400 }}>{unseated.length} unseated</span>
            {conflicts.length > 0 && <span style={{ color: C.error, fontWeight: 600 }}>⚠ {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}</span>}
          </div>
          <div style={{ display: "flex", gap: isMobile ? 3 : 4 }}>
            <button onClick={undo} disabled={historyIndex <= 0} title="Undo" style={{ padding: isMobile ? "6px 8px" : "4px 8px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 13, color: historyIndex <= 0 ? C.lightGray : C.warmGray, cursor: historyIndex <= 0 ? "default" : "pointer", fontWeight: 600, minHeight: isMobile ? 36 : "auto" }}>↩</button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" style={{ padding: isMobile ? "6px 8px" : "4px 8px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 13, color: historyIndex >= history.length - 1 ? C.lightGray : C.warmGray, cursor: historyIndex >= history.length - 1 ? "default" : "pointer", fontWeight: 600, minHeight: isMobile ? 36 : "auto" }}>↪</button>
            {isMobile ? (
              /* Mobile: hamburger menu for save/load/export/help */
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowMobileMenu(p => !p)} style={{ padding: "6px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 14, color: C.warmGray, cursor: "pointer", minHeight: 36 }}>⋯</button>
                {showMobileMenu && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: C.white, border: `1px solid ${C.lightGray}`, borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 50, minWidth: 160, overflow: "hidden" }}>
                    {[
                      { label: "💾 Save", action: () => { saveState(); setShowMobileMenu(false); } },
                      { label: "📂 Load", action: () => { fileInputRef.current?.click(); setShowMobileMenu(false); } },
                      { label: "📤 Export", action: () => { setShowExport(true); setShowMobileMenu(false); } },
                      { label: "? Help", action: () => { setShowHelp(true); setShowMobileMenu(false); } },
                      { label: "☕ Support", action: () => { window.open("https://ko-fi.com/deptappliedmagic", "_blank"); setShowMobileMenu(false); } },
                    ].map((item, i) => (
                      <button key={i} onClick={item.action} style={{ width: "100%", padding: "12px 16px", border: "none", borderBottom: i < 4 ? `1px solid ${C.lightGray}30` : "none", background: "transparent", fontFamily: "inherit", fontSize: 14, color: C.charcoal, cursor: "pointer", textAlign: "left" }}>{item.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Desktop: full button row */
              <>
                <button onClick={saveState} title="Save layout" style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>💾 Save</button>
                <button onClick={() => fileInputRef.current?.click()} title="Load layout" style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>📂 Load</button>
                <button onClick={() => setShowExport(true)} style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>📤 Export</button>
                <button onClick={() => setShowHelp(true)} style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>? Help</button>
                <a href="https://ko-fi.com/deptappliedmagic" target="_blank" rel="noopener noreferrer" style={{ padding: "4px 10px", border: `1.5px solid ${C.gold}40`, borderRadius: 7, background: `${C.gold}08`, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.gold, textDecoration: "none", display: "flex", alignItems: "center" }}>☕ Support</a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Close mobile menu on tap outside */}
      {showMobileMenu && <div onClick={() => setShowMobileMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}

      {/* Starter content banner */}
      {isStarterContent && (
        <div style={{ padding: isMobile ? "8px 12px" : "10px 20px", background: `linear-gradient(135deg, ${C.gold}15, ${C.gold}08)`, borderBottom: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13.5, color: C.darkGold, lineHeight: 1.5, flex: 1, minWidth: 200 }}>
            <strong>👋 Welcome!</strong> This is demo content. Explore, then start fresh or load a saved file.
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => setConfirmAction({ title: "Start Fresh?", message: "This will remove all guests, reset tables to defaults, and clear all floor objects. This can be undone with Ctrl+Z.", danger: true, onConfirm: () => { startFresh(); setConfirmAction(null); }, onClose: () => setConfirmAction(null) })} style={{ padding: "6px 14px", border: "none", borderRadius: 8, background: `linear-gradient(135deg, ${C.gold}, ${C.darkGold})`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.white, cursor: "pointer", whiteSpace: "nowrap" }}>Start Fresh</button>
            <button onClick={() => setIsStarterContent(false)} style={{ padding: "6px 12px", border: `1.5px solid ${C.gold}40`, borderRadius: 8, background: C.white, fontFamily: "inherit", fontSize: 13, color: C.darkGold, cursor: "pointer", whiteSpace: "nowrap" }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* ── Mobile View Toggle ── */}
      {isMobile && (
        <div style={{ display: "flex", borderBottom: `1px solid ${C.lightGray}`, background: `${C.white}80` }}>
          <button onClick={() => setMobileView("list")} style={{ flex: 1, padding: "10px 0", border: "none", background: mobileView === "list" ? C.white : "transparent", borderBottom: mobileView === "list" ? `2.5px solid ${C.sage}` : "2.5px solid transparent", fontFamily: "inherit", fontSize: 14, fontWeight: mobileView === "list" ? 700 : 400, color: mobileView === "list" ? C.darkSage : C.warmGray, cursor: "pointer" }}>📋 List View</button>
          <button onClick={() => setMobileView("floor")} style={{ flex: 1, padding: "10px 0", border: "none", background: mobileView === "floor" ? C.white : "transparent", borderBottom: mobileView === "floor" ? `2.5px solid ${C.sage}` : "2.5px solid transparent", fontFamily: "inherit", fontSize: 14, fontWeight: mobileView === "floor" ? 700 : 400, color: mobileView === "floor" ? C.darkSage : C.warmGray, cursor: "pointer" }}>🗺️ Floor View</button>
        </div>
      )}

      {/* ── Main Content ── */}
      {isMobile ? (
        /* Mobile: both views always in DOM. Floor uses absolute positioning to fill space reliably */
        <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>
          {/* List view: scrollable */}
          <div style={{ position: "absolute", inset: 0, display: mobileView === "list" ? "flex" : "none", flexDirection: "column", background: `${C.white}60`, overflow: "hidden" }}>
            {renderPanel()}
          </div>
          {/* Floor view: fills parent absolutely */}
          <div style={{ position: "absolute", inset: 0, display: mobileView === "floor" ? "block" : "none" }}>
            {renderFloor()}
          </div>
        </div>
      ) : (
        /* Desktop: side by side */
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ width: 350, borderRight: `1px solid ${C.lightGray}`, display: "flex", flexDirection: "column", background: `${C.white}60`, flexShrink: 0 }}>
            {renderPanel()}
          </div>
          {renderFloor()}
        </div>
      )}

      {/* Footer */}
      <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${C.lightGray}`, background: `${C.white}80`, flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, color: `${C.warmGray}90`, letterSpacing: 0.2 }}>This site uses basic analytics to understand usage. No personal data is stored. Copyright JD Ventures LLC.</span>
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.lightGray};border-radius:3px}`}</style>
    </div>
  );
}
