import { useState, useRef, useCallback, useEffect, useMemo } from "react";

const C = {
  cream: "#FDF8F0", blush: "#E8C4B8", sage: "#9CAF88", darkSage: "#6B7F5E",
  gold: "#C4A35A", darkGold: "#8B7340", charcoal: "#2D2D2D", warmGray: "#6B6560", lightGray: "#E8E4DF",
  white: "#FFFFFF", rose: "#D4756B", deepRose: "#B85C52", lavender: "#A8A0C8",
  skyBlue: "#7BAFCC", mint: "#88C4A8", coral: "#E09080", error: "#C75050",
};

const DEFAULT_GROUP_COLORS = {
  "Bride's Family": C.blush, "Groom's Family": C.skyBlue, "Bride's Friends": C.coral,
  "Groom's Friends": C.lavender, "Mutual Friends": C.sage, "Colleagues": C.gold, "VIP": C.deepRose, "Kids": C.mint,
};

const EXTRA_COLORS = ["#D4A0D4", "#A0C8D4", "#D4C4A0", "#A0D4B8", "#C8A0D4", "#D4B0A0", "#A0B8D4", "#B8D4A0", "#D4A0B8", "#A0D4D4", "#D4D4A0", "#B0A0D4"];

let _id = 200;
const uid = (p = "g") => `${p}${_id++}`;

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
  const s = makeGuest("Sarah Chen", "Bride's Family", 0, { id: "g1" });
  const t = makeGuest("Tom Chen", "Bride's Family", 0, { id: "g2" });
  s[0].constraints.keepWith.push("g2"); t[0].constraints.keepWith.push("g1"); add(s); add(t);
  add(makeGuest("Margaret Chen", "Bride's Family", 1, { id: "g3" }));
  add(makeGuest("Uncle Rick", "Bride's Family", 0, { id: "g4" }));
  add(makeGuest("Aunt Linda", "Bride's Family", 0, { id: "g17" }));
  const j = makeGuest("James Park", "Groom's Family", 0, { id: "g5" });
  const l = makeGuest("Lily Park", "Groom's Family", 0, { id: "g6" });
  j[0].constraints.keepWith.push("g6"); l[0].constraints.keepWith.push("g5"); add(j); add(l);
  add(makeGuest("David Park", "Groom's Family", 1, { id: "g7" }));
  const ap = makeGuest("Aunt Patrice", "Groom's Family", 0, { id: "g8" });
  ap[0].constraints.keepApart.push("g4"); all.find(x => x.id === "g4").constraints.keepApart.push("g8"); add(ap);
  add(makeGuest("Grandma Park", "Groom's Family", 0, { id: "g18" }));
  add(makeGuest("Mia Torres", "Mutual Friends", 1, { id: "g9" }));
  add(makeGuest("Jake Robinson", "Mutual Friends", 0, { id: "g10" }));
  add(makeGuest("Hannah Cole", "Mutual Friends", 0, { id: "g19" }));
  const z = makeGuest("Zoe Williams", "Bride's Friends", 0, { id: "g11" });
  const em = makeGuest("Emma Liu", "Bride's Friends", 0, { id: "g12" });
  z[0].constraints.keepWith.push("g12"); em[0].constraints.keepWith.push("g11"); add(z); add(em);
  add(makeGuest("Noah Harris", "Groom's Friends", 1, { id: "g13" }));
  add(makeGuest("Liam Foster", "Groom's Friends", 0, { id: "g20" }));
  add(makeGuest("Oliver Grant", "Colleagues", 0, { id: "g14" }));
  add(makeGuest("Ava Martinez", "Colleagues", 1, { id: "g15" }));
  add(makeGuest("Sophie Laurent", "VIP", 1, { id: "g16" }));
  return all;
}

const defaultTables = [
  { id: "t1", name: "Head Table", x: 320, y: 50, seatCount: 10, shape: "round", seats: Array(10).fill(null) },
  { id: "t2", name: "Table 2", x: 100, y: 280, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t3", name: "Table 3", x: 520, y: 280, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
  { id: "t4", name: "Table 4", x: 310, y: 470, seatCount: 8, shape: "round", seats: Array(8).fill(null) },
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
    if (g) {
      g.constraints.keepWith.forEach(kid => {
        if (!visited.has(kid) && gm[kid]) queue.push(kid);
      });
    }
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

// ── Migrate old save files (v1 isPlusOneOf/plusOneIds → v2 keepWith) ──
function migrateV1Guests(guests) {
  return guests.map(g => {
    const migrated = { ...g, constraints: { ...g.constraints } };
    delete migrated.isPlusOneOf;
    delete migrated.plusOneIds;
    delete migrated.plusOnes;
    return migrated;
  });
}

// ── Components ──

function Badge({ guest, gc, small, isDragging, onDragStart, onDragEnd, hasConflict, highlight }) {
  const color = gc[guest.group] || C.warmGray;
  const isLinkedGuest = guest.name.includes("'s Guest");
  return (<div draggable onDragStart={e => { e.dataTransfer.setData("guestId", guest.id); e.dataTransfer.setData("dragType", "guest"); onDragStart?.(guest.id); }} onDragEnd={onDragEnd}
    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "3px 10px" : "5px 13px", borderRadius: 20, background: highlight ? `${C.gold}30` : hasConflict ? `${C.error}15` : isLinkedGuest ? `${color}10` : `${color}18`, border: `1.5px ${isLinkedGuest ? "dashed" : "solid"} ${highlight ? C.gold : hasConflict ? C.error : color}`, cursor: "grab", fontSize: small ? 13 : 15, fontFamily: "inherit", color: C.charcoal, opacity: isDragging ? 0.3 : 1, whiteSpace: "nowrap", boxShadow: highlight ? `0 0 8px ${C.gold}40` : "none", transition: "box-shadow 0.2s, border-color 0.2s" }}>
    <span style={{ width: small ? 7 : 8, height: small ? 7 : 8, borderRadius: "50%", background: color, opacity: isLinkedGuest ? 0.5 : 1 }} />
    <span style={{ fontStyle: isLinkedGuest ? "italic" : "normal", opacity: isLinkedGuest ? 0.7 : 1 }}>{guest.name}</span>
    {hasConflict && <span style={{ color: C.error, fontSize: 13 }}>⚠</span>}
  </div>);
}

function TableViz({ table, gm, gc, onDrop, onRemove, conflicts, onRename, onSeatChange }) {
  const [over, setOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nv, setNv] = useState(table.name);
  const sp = getSeatPos(table); const seated = table.seats.filter(Boolean).length;
  const isRect = table.shape === "rect";
  const cx = isRect ? 75 : 78, cy = isRect ? 50 : 78;
  const tw = isRect ? Math.max(60, Math.ceil(table.seatCount / 2) * 26) : 58, th = isRect ? 28 : 58;
  const sz = getTableSize(table);
  return (<div style={{ position: "absolute", left: table.x, top: table.y, width: sz.w, height: sz.h }}
    onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
    onDrop={e => { e.preventDefault(); setOver(false); const gid = e.dataTransfer.getData("guestId"); if (gid) onDrop(gid, table.id); }}>
    <div style={{ position: "absolute", left: cx - tw / 2, top: cy - th / 2, width: tw, height: th, borderRadius: isRect ? 8 : "50%", background: over ? `linear-gradient(135deg, ${C.sage}55, ${C.darkSage}44)` : `linear-gradient(145deg, ${C.cream}, ${C.lightGray}ee)`, border: `2px solid ${over ? C.sage : C.lightGray}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1, boxShadow: over ? `0 4px 24px ${C.sage}40` : "0 2px 10px rgba(0,0,0,0.06)" }}>
      {editing ? <input autoFocus value={nv} onChange={e => setNv(e.target.value)} onBlur={() => { setEditing(false); onRename(table.id, nv); }} onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onRename(table.id, nv); } }} style={{ width: 46, textAlign: "center", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.charcoal, outline: "none" }} />
        : <span onClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer", textAlign: "center", lineHeight: 1.1 }}>{table.name}</span>}
      <span style={{ fontSize: 11, color: C.warmGray, opacity: 0.6 }}>{seated}/{table.seatCount}</span>
    </div>
    {/* +/- seat controls on the table visualization */}
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
    <div onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute", left: obj.x, top: obj.y, width: obj.w, height: obj.h,
        background: `${obj.color}40`, border: `2px dashed ${obj.color}90`, borderRadius: 10,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        cursor: dragging ? "grabbing" : "grab", userSelect: "none", zIndex: 0,
      }}>
      <span style={{ fontSize: Math.min(24, obj.h * 0.35), pointerEvents: "none" }}>{obj.icon}</span>
      {editing ? (
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
          onBlur={() => { setEditing(false); onUpdate({ ...obj, label }); }}
          onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onUpdate({ ...obj, label }); } }}
          onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
          style={{ width: obj.w - 16, textAlign: "center", border: "none", background: `${C.white}80`, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.charcoal, outline: "none", borderRadius: 4, padding: "1px 4px" }} />
      ) : (
        <span onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{ fontSize: 12, fontWeight: 600, color: C.charcoal, opacity: 0.7, textAlign: "center", lineHeight: 1.1, maxWidth: obj.w - 8, pointerEvents: "none" }}>{obj.label}</span>
      )}
      {obj.w > 50 && obj.h > 35 && <span style={{ fontSize: 10.5, color: C.warmGray, opacity: 0.5, pointerEvents: "none", marginTop: 1 }}>{Math.round(obj.w)}×{Math.round(obj.h)}</span>}
      <button onClick={(e) => { e.stopPropagation(); onRemove(obj.id); }}
        style={{ position: "absolute", top: -8, right: -8, width: 18, height: 18, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, color: C.warmGray, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}>×</button>
      {handles.map(h => (
        <div key={h.key} onMouseDown={e => handleResize(e, h.key)}
          style={{ position: "absolute", top: h.top, bottom: h.bottom, left: h.left, right: h.right, marginLeft: h.ml || 0, marginTop: h.mt || 0, width: 8, height: 8, borderRadius: "50%", background: C.white, border: `1.5px solid ${obj.color}`, cursor: h.cursor, zIndex: 1, opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }} />
      ))}
    </div>
  );
}

// ── Modals ──

function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
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
    <div style={{ background: C.white, borderRadius: 16, width: 460, maxHeight: "80vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.lightGray}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 600 }}>Bulk Import</h3><button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: C.warmGray }}>×</button></div>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: C.warmGray }}>Paste one name per line.</p>
      </div>
      <div style={{ padding: "14px 22px", flex: 1, overflowY: "auto" }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={"Jane Smith\nMark Johnson\nDr. Patel"} style={{ width: "100%", height: 150, padding: 12, border: `1.5px solid ${C.lightGray}`, borderRadius: 10, fontFamily: "inherit", fontSize: 15, lineHeight: 1.7, resize: "vertical", background: C.cream, outline: "none" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
          <div style={{ flex: 1 }}><label style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.warmGray, fontWeight: 600, display: "block", marginBottom: 3 }}>Group</label>
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
    <div style={{ background: C.white, borderRadius: 16, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
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
  const printView = () => { const w = window.open("", "_blank"); let html = `<html><head><title>WhereDoTheySit.com</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;padding:40px;color:#2D2D2D}h1{font-size:26px;margin-bottom:4px}h2{font-size:13px;color:#6B6560;font-weight:300;margin-bottom:28px;letter-spacing:2px;text-transform:uppercase}.tc{break-inside:avoid;border:1px solid #E8E4DF;border-radius:12px;padding:14px 18px;margin-bottom:14px}.tn{font-size:15px;font-weight:700;margin-bottom:2px}.tm{font-size:11px;color:#6B6560;margin-bottom:8px}.gr{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0ede8;font-size:13px}.gr:last-child{border-bottom:none}.gt{font-size:10px;color:#6B6560;background:#f5f2ed;padding:1px 7px;border-radius:8px}.po{font-style:italic;opacity:.7}.sum{margin-top:28px;padding-top:18px;border-top:2px solid #E8E4DF;font-size:13px;color:#6B6560}@media print{body{padding:20px}}</style></head><body>`; html += `<h1>🪑 WhereDoTheySit.com</h1><h2>Seating Arrangement</h2>`; tables.forEach(t => { const gs = t.seats.filter(Boolean).map(sid => gm[sid]).filter(Boolean); html += `<div class="tc"><div class="tn">${t.name}</div><div class="tm">${t.shape === "rect" ? "Rectangular" : "Round"} · ${gs.length}/${t.seatCount}</div>`; if (!gs.length) html += `<div style="font-size:12px;color:#999">Empty</div>`; else gs.forEach(g => { const isLinked = g.name.includes("'s Guest"); html += `<div class="gr"><span class="${isLinked ? "po" : ""}">${g.name}</span><span class="gt">${g.group}</span></div>`; }); html += `</div>`; }); if (unseated.length) { html += `<div class="tc" style="border-color:#D4756B60"><div class="tn" style="color:#D4756B">Unseated</div><div class="tm">${unseated.length} guests</div>`; unseated.forEach(g => { html += `<div class="gr"><span>${g.name}</span><span class="gt">${g.group}</span></div>`; }); html += `</div>`; } const placed = guests.filter(g => tables.some(t => t.seats.includes(g.id))).length; html += `<div class="sum">${placed}/${guests.length} seats · ${tables.length} tables</div></body></html>`; w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: 520, maxHeight: "85vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
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
  const S = { section: { marginBottom: 16 }, h: { fontSize: 16, fontWeight: 700, marginBottom: 6, color: C.charcoal }, li: { fontSize: 14, color: C.warmGray, lineHeight: 1.7, paddingLeft: 4 }, dot: { display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.sage, marginRight: 7, verticalAlign: "middle" } };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: C.white, borderRadius: 16, width: 500, maxHeight: "82vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.lightGray}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600 }}>🪑 Help Guide</h3>
        <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: C.warmGray }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
        <div style={S.section}><div style={S.h}>Quick Start</div><div style={S.li}><span style={S.dot} />Add guests individually or via <strong>Bulk Import</strong> (one name per line)</div><div style={S.li}><span style={S.dot} />Drag guests onto tables to seat them — linked guests follow automatically</div><div style={S.li}><span style={S.dot} />Drag tables to reposition them on the floor plan</div><div style={S.li}><span style={S.dot} />Click a seated name or seat circle to unseat</div></div>
        <div style={S.section}><div style={S.h}>Auto-Assign</div><div style={S.li}><span style={S.dot} /><strong>Auto-Assign All</strong> seats everyone and tries to keep groups together</div><div style={S.li}><span style={S.dot} /><strong>Auto-Complete</strong> fills remaining seats preserving your manual placements</div><div style={S.li}><span style={S.dot} />Conflicts are flagged with ⚠</div></div>
        <div style={S.section}><div style={S.h}>Groups &amp; Search</div><div style={S.li}><span style={S.dot} />Guests are color-coded by group</div><div style={S.li}><span style={S.dot} />Create custom groups with the + button next to the group dropdown</div><div style={S.li}><span style={S.dot} />Drag a guest badge onto a different group header to reassign them</div><div style={S.li}><span style={S.dot} />Use the search bar to find any guest — matches are highlighted</div></div>
        <div style={S.section}><div style={S.h}>Plus-Ones &amp; Linked Guests</div><div style={S.li}><span style={S.dot} />Set +ones when adding — they become named guests (e.g. "Jane's Guest")</div><div style={S.li}><span style={S.dot} />Linked guests are automatically seated together</div><div style={S.li}><span style={S.dot} />You can rename, move, or unlink them like any guest</div></div>
        <div style={S.section}><div style={S.h}>Constraints (Rules Tab)</div><div style={S.li}><span style={S.dot} /><strong style={{ color: C.sage }}>Together</strong> — seat at the same table</div><div style={S.li}><span style={S.dot} /><strong style={{ color: C.rose }}>Apart</strong> — keep at different tables</div><div style={S.li}><span style={S.dot} />Violated constraints are highlighted</div></div>
        <div style={S.section}><div style={S.h}>Table Management</div><div style={S.li}><span style={S.dot} />Use +/− buttons on tables to add or remove seats</div><div style={S.li}><span style={S.dot} />If a drop overflows, you'll get an option to auto-expand the table</div></div>
        <div style={S.section}><div style={S.h}>Layout</div><div style={S.li}><span style={S.dot} />Add venue elements from the Layout tab</div><div style={S.li}><span style={S.dot} />Drag to move, drag corners/edges to resize, double-click to rename</div></div>
        <div style={S.section}><div style={S.h}>Undo &amp; Saving</div><div style={S.li}><span style={S.dot} /><strong>Ctrl+Z</strong> to undo, <strong>Ctrl+Shift+Z</strong> to redo</div><div style={S.li}><span style={S.dot} />Your work auto-saves in your browser</div><div style={S.li}><span style={S.dot} /><strong>💾 Save</strong> downloads a .json backup file</div><div style={S.li}><span style={S.dot} /><strong>📂 Load</strong> restores from a saved .json file</div><div style={S.li}><span style={S.dot} /><strong>📤 Export</strong> copies as text or prints as PDF</div></div>
      </div>
    </div>
  </div>);
}

// ── Group Selector ──
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

// ── Main ──
export default function App() {
  const [guests, setGuests] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.guests?.length) return s._version < 2 ? migrateV1Guests(s.guests) : s.guests; } } catch {} return buildInitialGuests();
  });
  const [tables, setTables] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.tables) return s.tables; } } catch {} return defaultTables;
  });
  const [floorObjects, setFloorObjects] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.floorObjects) return s.floorObjects; } } catch {} return [];
  });
  const [groupColors, setGroupColors] = useState(() => {
    try { const saved = localStorage.getItem(AUTOSAVE_KEY); if (saved) { const s = JSON.parse(saved); if (s.groupColors) return s.groupColors; } } catch {} return DEFAULT_GROUP_COLORS;
  });
  const [isStarterContent, setIsStarterContent] = useState(() => {
    try { return !localStorage.getItem(AUTOSAVE_KEY); } catch { return true; }
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
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
    setHistory(prev => {
      const newH = prev.slice(0, historyIndex + 1);
      newH.push(snap);
      if (newH.length > HISTORY_LIMIT) newH.shift();
      return newH;
    });
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

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ guests, tables, floorObjects, groupColors, _version: 2 })); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [guests, tables, floorObjects, groupColors]);

  // Push history on meaningful changes
  const prevSnapRef = useRef("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const snap = snapshot();
      if (snap !== prevSnapRef.current) { prevSnapRef.current = snap; pushHistory(); }
    }, 600);
    return () => clearTimeout(timer);
  }, [guests, tables, floorObjects, groupColors]); // eslint-disable-line

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
  const searchMatches = useMemo(() => {
    if (!searchLower) return new Set();
    const s = new Set();
    guests.forEach(g => { if (g.name.toLowerCase().includes(searchLower) || g.group.toLowerCase().includes(searchLower)) s.add(g.id); });
    return s;
  }, [guests, searchLower]);

  const flash = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const flashAction = (msg, actionLabel, onAction) => { setToast({ msg, type: "warn", actionLabel, onAction }); setTimeout(() => setToast(prev => prev?.msg === msg ? null : prev), 8000); };

  const addGuest = () => { if (!newName.trim()) return; setGuests(p => [...p, ...makeGuest(newName.trim(), newGroup, newPO)]); flash(`Added ${newName.trim()}${newPO ? ` +${newPO}` : ""}`); setNewName(""); setNewPO(0); setIsStarterContent(false); };
  const bulkImport = (names, group, po) => { const all = []; names.forEach(n => all.push(...makeGuest(n, group, po))); setGuests(p => [...p, ...all]); flash(`Imported ${names.length} guests`); setIsStarterContent(false); };
  const removeGuest = (id) => { const g = gm[id]; if (!g) return; const cluster = getKeepWithCluster(id, gm); const linkedGuests = cluster.filter(cid => gm[cid]?.name.includes("'s Guest")); const rm = new Set([id, ...linkedGuests]); setGuests(p => p.filter(x => !rm.has(x.id)).map(x => ({ ...x, constraints: { keepWith: x.constraints.keepWith.filter(y => !rm.has(y)), keepApart: x.constraints.keepApart.filter(y => !rm.has(y)) } }))); setTables(p => p.map(t => ({ ...t, seats: t.seats.map(s => rm.has(s) ? null : s) }))); if (selectedGuest === id) setSelectedGuest(null); };
  const changeGroup = (guestId, newGrp) => { const g = gm[guestId]; if (!g || g.group === newGrp) return; const cluster = getKeepWithCluster(guestId, gm); setGuests(p => p.map(x => cluster.includes(x.id) ? { ...x, group: newGrp } : x)); flash(`Moved ${g.name} → ${newGrp}`); };
  const clearAllGuests = () => { setGuests([]); setTables(p => p.map(t => ({ ...t, seats: Array(t.seatCount).fill(null) }))); setSelectedGuest(null); setGroupColors({ "General": "#B0B8C8" }); setNewGroup("General"); setIsStarterContent(false); flash("Everything cleared — fresh start!"); };
  const startFresh = () => { clearAllGuests(); setTables(defaultTables.map(t => ({ ...t, seats: Array(t.seatCount).fill(null) }))); setFloorObjects([]); setIsStarterContent(false); flash("Fresh start! Add your guests and tables."); };

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

  // ── Drop guest with full cluster, overflow handling ──
  const dropGuest = (guestId, tableId) => {
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
  };

  const unseat = (guestId) => { const guest = gm[guestId]; if (!guest) return; const cluster = getKeepWithCluster(guestId, gm); setTables(p => p.map(t => ({ ...t, seats: t.seats.map(s => cluster.includes(s) ? null : s) }))); };
  const renameTable = (id, name) => setTables(p => p.map(t => t.id === id ? { ...t, name } : t));
  const toggleConstraint = (guestId, targetId, type) => { setGuests(p => p.map(g => { if (g.id !== guestId && g.id !== targetId) return g; const thisId = g.id === guestId ? targetId : guestId; const other = type === "keepWith" ? "keepApart" : "keepWith"; const list = g.constraints[type].includes(thisId) ? g.constraints[type].filter(x => x !== thisId) : [...g.constraints[type], thisId]; return { ...g, constraints: { ...g.constraints, [type]: list, [other]: g.constraints[other].filter(x => x !== thisId) } }; })); };

  const runAutoAssign = () => { const r = assignGuests(guests, tables, gm, groups); setTables(r); const c = getConflicts(r, gm); const s = r.reduce((n, t) => n + t.seats.filter(Boolean).length, 0); flash(c.length === 0 ? `All ${s} seated!` : `${s} seated — ${c.length} conflict${c.length > 1 ? "s" : ""}`, c.length ? "warn" : "success"); };
  const runAutoComplete = () => { const already = new Set(); tables.forEach(t => t.seats.forEach(s => s && already.add(s))); const rem = guests.filter(g => !already.has(g.id)).length; if (!rem) { flash("Everyone seated!"); return; } const r = assignGuests(guests, tables, gm, groups, true); setTables(r); const c = getConflicts(r, gm); const newS = r.reduce((n, t) => n + t.seats.filter(Boolean).length, 0) - already.size; flash(c.length === 0 ? `Placed ${newS} remaining!` : `Placed ${newS} — ${c.length} conflict${c.length > 1 ? "s" : ""}`, c.length ? "warn" : "success"); };
  const clearAllSeats = () => setTables(p => p.map(t => ({ ...t, seats: Array(t.seatCount).fill(null) })));

  const saveState = () => {
    const state = { guests, tables, floorObjects, groupColors, _version: 2 };
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
        setIsStarterContent(false);
        flash("Layout loaded!");
      } catch { flash("Invalid file", "warn"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const handleFloorMouseDown = (e, tid) => { e.preventDefault(); e.stopPropagation(); const rect = floorRef.current.getBoundingClientRect(); const t = tables.find(x => x.id === tid); setDraggingTable(tid); setDragOffset({ x: (e.clientX - rect.left) / zoom - pan.x - t.x, y: (e.clientY - rect.top) / zoom - pan.y - t.y }); };
  const handleFloorMouseMove = useCallback(e => { if (!draggingTable || !floorRef.current) return; const rect = floorRef.current.getBoundingClientRect(); setTables(p => p.map(t => { if (t.id !== draggingTable) return t; return { ...t, x: (e.clientX - rect.left) / zoom - pan.x - dragOffset.x, y: (e.clientY - rect.top) / zoom - pan.y - dragOffset.y }; })); }, [draggingTable, dragOffset, zoom, pan]);
  const handleFloorMouseUp = useCallback(() => setDraggingTable(null), []);
  useEffect(() => { if (draggingTable) { window.addEventListener("mousemove", handleFloorMouseMove); window.addEventListener("mouseup", handleFloorMouseUp); return () => { window.removeEventListener("mousemove", handleFloorMouseMove); window.removeEventListener("mouseup", handleFloorMouseUp); }; } }, [draggingTable, handleFloorMouseMove, handleFloorMouseUp]);

  const handlePanStart = (e) => { if (e.target !== floorRef.current && e.target !== floorRef.current?.firstChild) return; setPanning(true); setPanStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom }); };
  const handlePanMove = useCallback((e) => { if (!panning) return; setPan({ x: (e.clientX - panStart.x) / zoom, y: (e.clientY - panStart.y) / zoom }); }, [panning, panStart, zoom]);
  const handlePanEnd = useCallback(() => setPanning(false), []);
  useEffect(() => { if (panning) { window.addEventListener("mousemove", handlePanMove); window.addEventListener("mouseup", handlePanEnd); return () => { window.removeEventListener("mousemove", handlePanMove); window.removeEventListener("mouseup", handlePanEnd); }; } }, [panning, handlePanMove, handlePanEnd]);

  const handleWheel = useCallback((e) => { e.preventDefault(); setZoom(z => Math.min(2, Math.max(0.3, z + (e.deltaY > 0 ? -0.08 : 0.08)))); }, []);
  useEffect(() => { const el = floorRef.current; if (el) { el.addEventListener("wheel", handleWheel, { passive: false }); return () => el.removeEventListener("wheel", handleWheel); } }, [handleWheel]);

  const selObj = selectedGuest ? gm[selectedGuest] : null;
  const handleGroupDrop = (e, grp) => { e.preventDefault(); const gid = e.dataTransfer.getData("guestId"); const dt = e.dataTransfer.getData("dragType"); if (gid && dt === "guest") changeGroup(gid, grp); };
  const activeGroups = groups.filter(grp => guests.some(g => g.group === grp));

  return (
    <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", background: `linear-gradient(170deg, ${C.cream} 0%, #F5EDE4 50%, ${C.cream} 100%)`, minHeight: "100vh", color: C.charcoal, display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {showBulk && <BulkImportModal onClose={() => setShowBulk(false)} onImport={bulkImport} groups={groups} gc={gc} />}
      {showAddTable && <AddTableModal onClose={() => setShowAddTable(false)} onAdd={addTable} />}
      {showExport && <ExportModal tables={tables} guests={guests} gm={gm} gc={gc} onClose={() => setShowExport(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {confirmAction && <ConfirmModal {...confirmAction} />}
      <input ref={fileInputRef} type="file" accept=".json" onChange={loadState} style={{ display: "none" }} />

      {/* Header */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.lightGray}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.white}90`, backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🪑</span>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 19, fontWeight: 600, margin: 0, background: `linear-gradient(135deg, ${C.charcoal}, ${C.warmGray})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>WhereDoTheySit.com</h1>
            <div style={{ fontSize: 11, color: C.warmGray, fontWeight: 400, letterSpacing: 0.5, marginTop: 1, opacity: 0.65 }}>The Free Guest List Organizer</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 12, color: C.warmGray, display: "flex", gap: 8, alignItems: "center", marginRight: 4 }}>
            <span>{guests.length} guest{guests.length !== 1 ? "s" : ""}</span>
            <span style={{ color: C.lightGray }}>·</span>
            <span>{totalSeated} seated</span>
            <span style={{ color: C.lightGray }}>·</span>
            <span style={{ color: openSeats < unseated.length ? C.rose : C.warmGray, fontWeight: openSeats < unseated.length ? 600 : 400 }}>{openSeats} open</span>
            {unseated.length > 0 && <><span style={{ color: C.lightGray }}>·</span><span style={{ color: C.gold, fontWeight: 600 }}>{unseated.length} unseated</span></>}
            {conflicts.length > 0 && <><span style={{ color: C.lightGray }}>·</span><span style={{ color: C.error, fontWeight: 600 }}>{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}</span></>}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)" style={{ padding: "4px 8px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 13, color: historyIndex <= 0 ? C.lightGray : C.warmGray, cursor: historyIndex <= 0 ? "default" : "pointer", fontWeight: 600 }}>↩</button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)" style={{ padding: "4px 8px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 13, color: historyIndex >= history.length - 1 ? C.lightGray : C.warmGray, cursor: historyIndex >= history.length - 1 ? "default" : "pointer", fontWeight: 600 }}>↪</button>
            <button onClick={saveState} title="Save layout" style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>💾 Save</button>
            <button onClick={() => fileInputRef.current?.click()} title="Load layout" style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>📂 Load</button>
            <button onClick={() => setShowExport(true)} style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>📤 Export</button>
            <button onClick={() => setShowHelp(true)} style={{ padding: "4px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 7, background: C.white, fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.warmGray, cursor: "pointer" }}>? Help</button>
          </div>
        </div>
      </div>

      {/* Starter content banner */}
      {isStarterContent && (
        <div style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${C.gold}15, ${C.gold}08)`, borderBottom: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 13.5, color: C.darkGold, lineHeight: 1.5 }}>
            <strong>👋 Welcome!</strong> This is starter content to show how everything works. Explore the demo, then erase it and start your own project, or load a previously saved file.
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={startFresh} style={{ padding: "6px 14px", border: "none", borderRadius: 8, background: `linear-gradient(135deg, ${C.gold}, ${C.darkGold})`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.white, cursor: "pointer", whiteSpace: "nowrap" }}>Start Fresh</button>
            <button onClick={() => setIsStarterContent(false)} style={{ padding: "6px 12px", border: `1.5px solid ${C.gold}40`, borderRadius: 8, background: C.white, fontFamily: "inherit", fontSize: 13, color: C.darkGold, cursor: "pointer", whiteSpace: "nowrap" }}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left Panel */}
        <div style={{ width: 350, borderRight: `1px solid ${C.lightGray}`, display: "flex", flexDirection: "column", background: `${C.white}60`, flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.lightGray}` }}>
            {["guests", "tables", "layout", "rules"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px 0", border: "none", background: tab === t ? C.white : "transparent", borderBottom: tab === t ? `2px solid ${C.sage}` : "2px solid transparent", fontFamily: "inherit", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? C.charcoal : C.warmGray, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
            ))}
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
                  <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addGuest()} placeholder="Guest name..." style={{ flex: 1, padding: "6px 9px", border: `1px solid ${C.lightGray}`, borderRadius: 6, fontFamily: "inherit", fontSize: 15, background: C.cream, outline: "none" }} />
                  <button onClick={addGuest} style={{ padding: "6px 14px", border: "none", borderRadius: 6, background: C.sage, color: C.white, fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Add</button>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <GroupSelector value={newGroup} onChange={setNewGroup} groups={groups} gc={gc} onAddGroup={addGroup} fontSize={14} />
                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 14, color: C.warmGray, background: C.cream, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.lightGray}`, flexShrink: 0 }}>
                    <span>+:</span>
                    <button onClick={() => setNewPO(Math.max(0, newPO - 1))} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: C.warmGray, fontSize: 17, padding: 0 }}>−</button>
                    <span style={{ minWidth: 14, textAlign: "center", fontWeight: 600 }}>{newPO}</span>
                    <button onClick={() => setNewPO(Math.min(5, newPO + 1))} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: C.warmGray, fontSize: 17, padding: 0 }}>+</button>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                <button onClick={() => setShowBulk(true)} style={{ flex: 1, padding: "7px 0", border: `1.5px dashed ${C.gold}`, borderRadius: 7, background: `${C.gold}08`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.gold, cursor: "pointer" }}>📋 Bulk Import</button>
                {guests.length > 0 && <button onClick={() => setConfirmAction({ title: "Clear All Guests?", message: "This removes every guest and unseats everyone. You can undo with Ctrl+Z.", danger: true, onConfirm: () => { clearAllGuests(); setConfirmAction(null); }, onClose: () => setConfirmAction(null) })} style={{ padding: "7px 10px", border: `1.5px solid ${C.rose}40`, borderRadius: 7, background: `${C.rose}06`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.rose, cursor: "pointer" }}>Clear All</button>}
              </div>
              {unseated.length > 0 && (<div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.warmGray, marginBottom: 5, fontWeight: 600 }}>Unseated ({unseated.length})</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{unseated.filter(g => !searchLower || searchMatches.has(g.id)).map(g => <Badge key={g.id} guest={g} gc={gc} small isDragging={draggingGuest === g.id} onDragStart={setDraggingGuest} onDragEnd={() => setDraggingGuest(null)} hasConflict={cIds.has(g.id)} highlight={searchMatches.has(g.id)} />)}</div></div>)}
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.warmGray, marginBottom: 5, fontWeight: 600 }}>All Guests — drag between groups</div>
              {activeGroups.map(grp => {
                const groupGuests = guests.filter(g => g.group === grp && (!searchLower || searchMatches.has(g.id)));
                if (searchLower && groupGuests.length === 0) return null;
                return (
                <div key={grp} style={{ marginBottom: 10, padding: "4px 6px", borderRadius: 7, transition: "all 0.2s" }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = `${gc[grp] || C.warmGray}15`; e.currentTarget.style.outline = `2px dashed ${gc[grp] || C.warmGray}60`; }}
                  onDragLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.outline = "none"; }}
                  onDrop={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.outline = "none"; handleGroupDrop(e, grp); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: gc[grp] || C.warmGray }} /><span style={{ fontSize: 13.5, fontWeight: 600, color: C.warmGray }}>{grp}</span><span style={{ fontSize: 12, color: `${C.warmGray}70` }}>({guests.filter(g => g.group === grp).length})</span></div>
                  {groupGuests.map(g => (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px", marginBottom: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                        <Badge guest={g} gc={gc} small isDragging={draggingGuest === g.id} onDragStart={setDraggingGuest} onDragEnd={() => setDraggingGuest(null)} hasConflict={cIds.has(g.id)} highlight={searchMatches.has(g.id)} />
                        {g.constraints.keepWith.length > 0 && <span style={{ fontSize: 12, color: C.warmGray, fontStyle: "italic" }}>🔗{g.constraints.keepWith.length}</span>}
                      </div>
                      <button onClick={() => removeGuest(g.id)} style={{ border: "none", background: "none", color: C.warmGray, cursor: "pointer", fontSize: 15, padding: "0 4px", opacity: 0.3 }}>×</button>
                    </div>))}
                </div>); })}
            </div>)}

            {tab === "tables" && (<div>
              <button onClick={() => setShowAddTable(true)} style={{ width: "100%", padding: "9px 0", border: `1.5px dashed ${C.sage}`, borderRadius: 8, background: `${C.sage}08`, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.darkSage, cursor: "pointer", marginBottom: 12 }}>+ Add Table</button>
              {tables.map(t => { const seated = t.seats.filter(Boolean); return (
                <div key={t.id} style={{ padding: "10px 12px", border: `1px solid ${C.lightGray}`, borderRadius: 9, marginBottom: 6, background: C.white }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: seated.length ? 6 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14.5 }}>{t.name}</span>
                      <span style={{ fontSize: 12.5, color: C.warmGray }}>{t.shape === "rect" ? "▬" : "⬤"} {seated.length}/{t.seatCount}</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={() => changeSeatCount(t.id, -1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>−</button>
                        <button onClick={() => changeSeatCount(t.id, 1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.lightGray}`, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>+</button>
                      </div>
                    </div>
                    <button onClick={() => removeTable(t.id)} style={{ border: "none", background: "none", color: C.rose, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Remove</button>
                  </div>
                  {seated.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{seated.map(sid => { const g = gm[sid]; const color = g ? (gc[g.group] || C.warmGray) : C.lightGray; return g ? <span key={sid} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 7, background: `${color}20`, border: `1px ${g.name.includes("'s Guest") ? "dashed" : "solid"} ${color}40`, fontStyle: g.name.includes("'s Guest") ? "italic" : "normal" }}>{g.name}</span> : null; })}</div>}
                </div>); })}
            </div>)}

            {tab === "layout" && (<div>
              <div style={{ fontSize: 13.5, color: C.warmGray, marginBottom: 12, lineHeight: 1.5 }}>Add venue elements. Drag to position, hover edges to resize, double-click to rename.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {FLOOR_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => addFloorObject(p)} style={{ padding: "10px 6px", border: `1.5px solid ${C.lightGray}`, borderRadius: 9, background: C.white, fontFamily: "inherit", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: C.charcoal }}>
                    <span style={{ fontSize: 16 }}>{p.icon}</span><span style={{ fontWeight: 500 }}>{p.label}</span>
                  </button>))}
              </div>
              {floorObjects.length > 0 && (<div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: C.warmGray, marginBottom: 6, fontWeight: 600 }}>On Floor ({floorObjects.length})</div>
                {floorObjects.map(o => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", fontSize: 14, borderBottom: `1px solid ${C.lightGray}20` }}>
                    <span>{o.icon} {o.label}</span>
                    <button onClick={() => removeFloorObject(o.id)} style={{ border: "none", background: "none", color: C.rose, cursor: "pointer", fontSize: 12.5 }}>Remove</button>
                  </div>))}
              </div>)}
            </div>)}

            {tab === "rules" && (<div>
              <div style={{ fontSize: 13.5, color: C.warmGray, marginBottom: 12, lineHeight: 1.6 }}>Select a guest, then set <strong style={{ color: C.sage }}>together</strong> or <strong style={{ color: C.rose }}>apart</strong>.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                {guests.map(g => (<div key={g.id} onClick={() => setSelectedGuest(selectedGuest === g.id ? null : g.id)} style={{ padding: "3px 10px", borderRadius: 12, border: `1.5px solid ${selectedGuest === g.id ? C.sage : C.lightGray}`, background: selectedGuest === g.id ? `${C.sage}15` : C.white, cursor: "pointer", fontSize: 13, fontWeight: selectedGuest === g.id ? 600 : 400 }}>{g.name}</div>))}
              </div>
              {selObj && (<div style={{ padding: 12, border: `1px solid ${C.lightGray}`, borderRadius: 10, background: C.white }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 3 }}>Rules for {selObj.name}</div>
                {selObj.constraints.keepWith.length > 0 && <div style={{ fontSize: 12.5, color: C.warmGray, marginBottom: 7, fontStyle: "italic" }}>Linked with: {selObj.constraints.keepWith.map(kid => gm[kid]?.name).filter(Boolean).join(", ")}</div>}
                <div style={{ maxHeight: 240, overflowY: "auto" }}>
                  {guests.filter(g => g.id !== selectedGuest).map(g => { const kw = selObj.constraints.keepWith.includes(g.id), ka = selObj.constraints.keepApart.includes(g.id); return (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.lightGray}20` }}>
                      <span style={{ fontSize: 13.5 }}>{g.name}</span>
                      <div style={{ display: "flex", gap: 3 }}>
                        <button onClick={() => toggleConstraint(selectedGuest, g.id, "keepWith")} style={{ padding: "2px 9px", borderRadius: 8, border: `1px solid ${kw ? C.sage : C.lightGray}`, background: kw ? `${C.sage}20` : "transparent", color: kw ? C.darkSage : C.warmGray, fontSize: 12, fontWeight: kw ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>Together</button>
                        <button onClick={() => toggleConstraint(selectedGuest, g.id, "keepApart")} style={{ padding: "2px 9px", borderRadius: 8, border: `1px solid ${ka ? C.rose : C.lightGray}`, background: ka ? `${C.rose}20` : "transparent", color: ka ? C.deepRose : C.warmGray, fontSize: 12, fontWeight: ka ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>Apart</button>
                      </div>
                    </div>); })}
                </div>
              </div>)}
            </div>)}
          </div>

          {/* Actions */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.lightGray}`, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={runAutoAssign} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, background: `linear-gradient(135deg, ${C.sage}, ${C.darkSage})`, color: C.white, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 2px 12px ${C.sage}40` }}>✨ Auto-Assign</button>
              <button onClick={() => setConfirmAction({ title: "Clear Seats?", message: "Unseat everyone but keep guest list and tables? You can undo with Ctrl+Z.", onConfirm: () => { clearAllSeats(); setConfirmAction(null); flash("Seats cleared"); }, onClose: () => setConfirmAction(null) })} style={{ padding: "9px 10px", border: `1.5px solid ${C.lightGray}`, borderRadius: 8, background: C.white, color: C.warmGray, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>Clear</button>
            </div>
            {unseated.length > 0 && unseated.length < guests.length && (
              <button onClick={runAutoComplete} style={{ width: "100%", padding: "8px 0", border: `1.5px solid ${C.gold}`, borderRadius: 8, background: `${C.gold}10`, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.darkGold, cursor: "pointer" }}>🧩 Auto-Complete ({unseated.length} left)</button>
            )}
            <div style={{ textAlign: "center", fontSize: 12, color: `${C.warmGray}99`, lineHeight: 1.5, paddingTop: 2 }}>
              Free forever. If this saved you time (or drama),<br />you can <a href="https://ko-fi.com/deptappliedmagic" target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 600 }}>buy me a coffee</a> — thank you!
            </div>
          </div>
        </div>

        {/* Floor */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {toast && <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "8px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, background: toast.type === "success" ? C.sage : C.gold, color: C.white, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.3s ease", display: "flex", alignItems: "center", gap: 10, maxWidth: "80%" }}>
            <span>{toast.msg}</span>
            {toast.actionLabel && <button onClick={toast.onAction} style={{ padding: "4px 12px", border: `1.5px solid ${C.white}40`, borderRadius: 6, background: `${C.white}25`, color: C.white, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{toast.actionLabel}</button>}
          </div>}

          <div style={{ position: "absolute", top: 10, right: 10, zIndex: 20, display: "flex", flexDirection: "column", gap: 4, background: `${C.white}95`, borderRadius: 10, padding: 4, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} style={{ width: 32, height: 32, border: `1px solid ${C.lightGray}`, borderRadius: 7, background: C.white, cursor: "pointer", fontSize: 17, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            <div style={{ fontSize: 11.5, textAlign: "center", color: C.warmGray, fontWeight: 600 }}>{Math.round(zoom * 100)}%</div>
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} style={{ width: 32, height: 32, border: `1px solid ${C.lightGray}`, borderRadius: 7, background: C.white, cursor: "pointer", fontSize: 17, fontWeight: 700, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset" style={{ width: 32, height: 32, border: `1px solid ${C.lightGray}`, borderRadius: 7, background: C.white, cursor: "pointer", fontSize: 12, color: C.warmGray, display: "flex", alignItems: "center", justifyContent: "center" }}>⟲</button>
          </div>

          <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 11.5, color: C.warmGray, background: `${C.white}90`, padding: "4px 8px", borderRadius: 6, zIndex: 10 }}>Scroll to zoom · Drag space to pan · Ctrl+Z undo</div>

          <div ref={floorRef} onMouseDown={handlePanStart} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", cursor: panning ? "grabbing" : (draggingTable ? "grabbing" : "grab") }}>
            <div style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "0 0", position: "absolute", width: 1200, height: 900, backgroundImage: `radial-gradient(circle, ${C.lightGray}40 1px, transparent 1px)`, backgroundSize: "24px 24px" }}>
              {floorObjects.map(o => <FloorObject key={o.id} obj={o} onUpdate={updateFloorObject} onRemove={removeFloorObject} zoom={zoom} />)}
              {tables.map(t => { const cx = t.shape === "rect" ? 75 : 78; const cy = t.shape === "rect" ? 50 : 78; return (<div key={`h-${t.id}`} onMouseDown={e => handleFloorMouseDown(e, t.id)} style={{ position: "absolute", left: t.x + cx - 18, top: t.y + cy - 18, width: 36, height: 36, borderRadius: "50%", cursor: "grab", zIndex: 5 }} />); })}
              {tables.map(t => <TableViz key={t.id} table={t} gm={gm} gc={gc} onDrop={dropGuest} onRemove={unseat} conflicts={conflicts} onRename={renameTable} onSeatChange={changeSeatCount} />)}
              {tables.length === 0 && floorObjects.length === 0 && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: C.warmGray }}><div style={{ fontSize: 36, opacity: 0.3 }}>🪑</div><div style={{ fontSize: 15 }}>Add tables to start</div></div>}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", flexWrap: "wrap", gap: 6, background: `${C.white}95`, padding: "7px 12px", borderRadius: 8, backdropFilter: "blur(8px)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", zIndex: 10 }}>
            {groups.filter(g => guests.some(x => x.group === g)).map(g => (<div key={g} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><span style={{ width: 8, height: 7, borderRadius: "50%", background: gc[g] || C.warmGray }} /><span style={{ color: C.warmGray }}>{g}</span></div>))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${C.lightGray}`, background: `${C.white}80`, flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, color: `${C.warmGray}90`, letterSpacing: 0.2 }}>This site uses basic analytics to understand usage. No personal data is stored. Copyright JD Ventures LLC.</span>
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.lightGray};border-radius:3px}`}</style>
    </div>
  );
}
