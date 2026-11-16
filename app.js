import { CATEGORIES, CAT, DISARIDA, merchantKey, parseLines, parseText,
  detectSource, verify, mergeNew, activeInstallments } from "./parser.js";
import { pdfToLines } from "./pdflines.js";

// ---------- Veri (sadece bu telefonda, localStorage) ----------
const KEY = "param.v1";
const blank = () => ({ txs: [], rules: {}, incomes: [], settings: { fixedIncome: 20000, startDay: 15 } });
let S = load();
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); return d ? { ...blank(), ...d, settings: { ...blank().settings, ...d.settings } } : blank(); } catch { return blank(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Kaydedilemedi: " + e.message); } }
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

// ---------- Yardımcılar ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TL = (v, d = 0) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v) + " ₺";
const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const KISA = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const sd = () => String(S.settings.startDay || 1).padStart(2, "0");
// Dönem anahtarı "YYYY-MM": o ayın başlangıç gününden bir sonraki ayın başlangıç gününe kadar
const pStart = m => `${m}-${sd()}`;
const inPeriod = (date, m) => date >= pStart(m) && date < pStart(shiftMonth(m, 1));
const periodOf = date => date.slice(8, 10) >= sd() ? date.slice(0, 7) : shiftMonth(date.slice(0, 7), -1);
const monthName = m => {
  if (+sd() === 1) { const [y, mm] = m.split("-"); return `${AYLAR[+mm - 1]} ${y}`; }
  const a = new Date(pStart(m) + "T12:00"), b = new Date(new Date(pStart(shiftMonth(m, 1)) + "T12:00") - 864e5);
  return `${a.getDate()} ${KISA[a.getMonth()]} – ${b.getDate()} ${KISA[b.getMonth()]} ${b.getFullYear()}`;
};
const shiftMonth = (m, d) => { const [y, mm] = m.split("-").map(Number); const t = new Date(y, mm - 1 + d, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`; };
const prettyDesc = d => d.replace(/^\d{2}\/\d{2}\s+/, "").replace(/\s+(İSTANBUL|ISTANBUL|BİLECİK|BILECIK|ANKARA|İZMİR|IZMIR)(\s+TR)?(TR)?$/i, "").replace(/\s+TR$/, "");
const subName = d => { const f = d.toUpperCase();
  for (const [k, n] of [["SPOTIFY","Spotify"],["NETFLIX","Netflix"],["COURSERA","Coursera"],["APPLE.COM","Apple (iCloud/App Store)"],["GOOGLE","Google One"],["ANTHROPIC","Claude"],["PRIME","Amazon Prime"],["DIGITURK","Digiturk"],["YOUTUBE","YouTube Premium"],["DISNEY","Disney+"]]) if (f.includes(k)) return n;
  return prettyDesc(d); };
const initials = c => (CAT[c]?.name || "?").slice(0, 2);
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2200); }

let month = periodOf(S.txs.length ? S.txs.map(t => t.date).sort().at(-1) : new Date().toISOString().slice(0, 10));
let tab = "ozet", filter = null, pending = null;

const SPEND = t => t.type === "harcama" || t.type === "iade";
const monthTx = m => S.txs.filter(t => inPeriod(t.date, m) && SPEND(t));
const spend = list => list.reduce((a, t) => a + t.amount, 0);
const incDate = i => i.date || `${i.month}-${sd()}`;
const income = m => S.settings.fixedIncome + S.incomes.filter(i => inPeriod(incDate(i), m)).reduce((a, i) => a + i.amount, 0);

// ---------- Görünümler ----------
function render() {
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  $("#view").innerHTML = { ozet, islemler, ekle, ayarlar }[tab]();
  window.scrollTo(0, 0);
}

function monthBar() {
  return `<div class="month"><button data-act="prev">‹</button><b>${monthName(month)}</b><button data-act="next">›</button></div>`;
}

function ozet() {
  if (!S.txs.length) return `<h1>Param</h1><div class="card empty">Henüz veri yok.<br><br>
    <button class="btn" data-go="ekle">İlk ekstreni yükle</button></div>`;
  const list = monthTx(month), total = spend(list), inc = income(month), left = inc - total;
  const pct = Math.min(100, total / inc * 100);
  const by = {}; for (const t of list) by[t.cat] = (by[t.cat] || 0) + t.amount;
  const cats = Object.entries(by).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
  const max = cats[0]?.[1] || 1;
  let acc = 0;
  const grad = cats.map(([c, v]) => { const a = acc; acc += v / total * 360; return `${CAT[c]?.color || "#999"} ${a}deg ${acc}deg`; }).join(",");
  const dis = list.filter(t => DISARIDA.includes(t.cat)), disT = spend(dis);
  const siparis = list.filter(t => t.cat === "yemek" && t.amount > 0).length;
  const prev = spend(monthTx(shiftMonth(month, -1)));
  const inst = activeInstallments(S.txs).filter(p => p.left > 0);
  const merchants = {}; for (const t of list) { const k = prettyDesc(t.desc); merchants[k] = (merchants[k] || { v: 0, n: 0, c: t.cat }); merchants[k].v += t.amount; merchants[k].n++; }
  const top = Object.entries(merchants).sort((a, b) => b[1].v - a[1].v).slice(0, 5);
  const sources = [...new Set(list.map(t => t.source))].join(" + ") || "—";
  const subMap = {}; for (const t of list.filter(t => t.cat === "abonelik" && t.type === "harcama")) {
    const k = subName(t.desc); subMap[k] = subMap[k] || { v: 0, n: 0, src: t.source }; subMap[k].v += t.amount; subMap[k].n++; }
  const subs = Object.entries(subMap).sort((a, b) => b[1].v - a[1].v);

  return `${monthBar()}
  <div class="card ${left < 0 ? "alert" : ""}">
    <div class="small muted">${left < 0 ? "Gelirini aştın" : "Bu ay kalan"}</div>
    <div class="big">${TL(left)}</div>
    <div class="bar" style="margin:12px 0 14px"><i style="width:${pct}%;${left < 0 ? "background:var(--bad)" : ""}"></i></div>
    <div class="grid3">
      <div><div class="small muted">Gelir</div><div class="v">${TL(inc)}</div></div>
      <div><div class="small muted">Harcama</div><div class="v">${TL(total)}</div></div>
      <div><div class="small muted">Geçen ay</div><div class="v">${prev ? TL(prev) : "—"}</div></div>
    </div>
    <div class="small muted" style="margin-top:10px">Kaynak: ${esc(sources)}</div>
  </div>

  <div class="card" data-filter="disarida">
    <div class="row between"><div><div class="small muted">Dışarıda yemek</div>
      <div class="big" style="font-size:26px">${TL(disT)}</div></div>
      <div style="text-align:right"><div class="v num" style="font-weight:650">%${inc ? Math.round(disT / inc * 100) : 0}</div><div class="small muted">gelirinin</div></div></div>
    <div class="small muted" style="margin-top:6px">${siparis} sipariş · günde ortalama ${TL(disT / daysIn(month))}</div>
  </div>

  <h2>Kategoriler</h2>
  <div class="card">
    <div class="row" style="margin-bottom:8px"><div class="donut" style="background:conic-gradient(${grad || "var(--line) 0 360deg"})"></div>
      <div class="small muted">${list.length} işlem<br>En büyük: <b style="color:var(--text)">${esc(CAT[cats[0]?.[0]]?.name || "—")}</b><br>%${cats[0] ? Math.round(cats[0][1] / total * 100) : 0} pay</div></div>
    ${cats.map(([c, v]) => `<div class="cat" data-filter="${c}"><span class="dot" style="background:${CAT[c]?.color}"></span>
      <div><div class="row between"><span>${esc(CAT[c]?.name || c)}</span><span class="num">${TL(v)}</span></div>
      <div class="bar"><i style="width:${v / max * 100}%;background:${CAT[c]?.color}"></i></div></div>
      <span class="small muted num">%${Math.round(v / total * 100)}</span></div>`).join("")}
  </div>

  <h2>En çok harcadığın yerler</h2>
  <div class="card">${top.map(([k, m]) => `<div class="tx"><div class="ico" style="background:${CAT[m.c]?.color}">${initials(m.c)}</div>
    <div><div class="d">${esc(k)}</div><div class="small muted">${m.n} kez</div></div><div class="num">${TL(m.v)}</div></div>`).join("")}</div>

  ${subs.length ? `<h2>Abonelikler</h2><div class="card">
    ${subs.map(([k, m]) => `<div class="tx"><div class="ico" style="background:${CAT.abonelik.color}">${esc(m.src[0])}</div>
      <div style="min-width:0"><div class="d">${esc(k)}</div><div class="small muted">${esc(m.src)}${m.n > 1 ? ` · <span class="bad">bu dönem ${m.n} kez</span>` : ""}</div></div>
      <div class="num">${TL(m.v, 2)}</div></div>`).join("")}
    <div class="row between small" style="padding-top:10px"><span class="muted">Aylık abonelik toplamı</span><b class="num">${TL(subs.reduce((a, [, m]) => a + m.v, 0), 2)}</b></div>
  </div>` : ""}

  ${inst.length ? `<h2>Devam eden taksitler</h2><div class="card">
    ${inst.map(p => `<div class="tx"><div class="ico" style="background:${CAT[p.cat]?.color || "#999"}">${p.n}/${p.of}</div>
      <div><div class="d">${esc(prettyDesc(p.name))}</div><div class="small muted">${p.left} ay daha · ayda ${TL(p.monthly, 2)}</div></div>
      <div class="num">${TL(p.leftAmount)}</div></div>`).join("")}
    <div class="row between small" style="padding-top:10px"><span class="muted">Gelecek aylara kalan yük</span><b class="num">${TL(inst.reduce((a, p) => a + p.leftAmount, 0))}</b></div>
  </div>` : ""}`;
}
const daysIn = m => { const a = new Date(pStart(m) + "T00:00"), b = new Date(pStart(shiftMonth(m, 1)) + "T00:00");
  const end = Math.min(b, Date.now()); return Math.max(1, Math.ceil((end - a) / 864e5)); };

function islemler() {
  const all = S.txs.filter(t => inPeriod(t.date, month));
  const list = all.filter(t => !filter || (filter === "disarida" ? DISARIDA.includes(t.cat) : filter === "transfer" ? ["transfer", "gelen"].includes(t.type) : t.cat === filter))
    .sort((a, b) => b.date.localeCompare(a.date));
  const NONSPEND = { odeme: "Kart ödemesi", transfer: "Kendi hesabından transfer", gelen: "Gelen para" };
  const usedCats = [...new Set(all.map(t => t.cat))];
  const chip = (id, name) => `<button class="chip ${filter === id ? "on" : ""}" data-chip="${id ?? ""}">${name}</button>`;
  let out = monthBar() + `<div class="chips">${chip(null, "Tümü")}${chip("disarida", "Dışarıda yemek")}
    ${CATEGORIES.filter(c => usedCats.includes(c.id)).map(c => chip(c.id, c.name)).join("")}${usedCats.includes("odeme") ? chip("odeme", "Kart ödemeleri") : ""}${usedCats.includes("transfer") || usedCats.includes("gelen") ? chip("transfer", "Transferler") : ""}</div>`;
  if (!list.length) return out + `<div class="card empty">Bu ay için işlem yok.</div>`;
  const tot = spend(list.filter(SPEND));
  out += `<div class="small muted" style="margin:0 4px">${list.length} işlem${tot ? " · harcama " + TL(tot, 2) : ""}</div>`;
  let day = "";
  for (const t of list) {
    if (t.date !== day) { if (day) out += `</div>`; day = t.date; const d = new Date(t.date + "T12:00");
      out += `<div class="day">${d.getDate()} ${AYLAR[d.getMonth()]}, ${d.toLocaleDateString("tr-TR", { weekday: "long" })}</div><div class="card" style="padding:4px 16px">`; }
    const i = S.txs.indexOf(t), c = CAT[t.cat];
    const ns = NONSPEND[t.type];
    out += `<div class="tx" data-tx="${i}"><div class="ico" style="background:${ns ? "#8e8e93" : c?.color || "#8e8e93"}">${ns ? "₺" : initials(t.cat)}</div>
      <div style="min-width:0"><div class="d">${esc(prettyDesc(t.desc))}</div><div class="small muted">${esc(ns || c?.name)}${t.taksit ? ` · ${t.taksit.n}/${t.taksit.of} taksit` : ""} · ${esc(t.source)}</div></div>
      <div class="num ${t.amount < 0 || ns ? "neg" : ""}">${ns ? "+" : ""}${TL(Math.abs(t.amount), 2)}</div></div>`;
  }
  return out + `</div>`;
}

function ekle() {
  const today = new Date().toISOString().slice(0, 10);
  return `<h1>Ekle</h1>
  <h2>Ekstre</h2>
  <div class="card">
    <div class="small muted">Bankanın PDF ekstresini seç ya da ekstre metnini kopyalayıp yapıştır. Aynı ekstreyi iki kez yüklersen tekrar eden işlemler eklenmez.</div>
    <label>Kart</label>
    <select id="src"><option value="auto">Otomatik algıla</option><option>Ziraat</option><option>Enpara</option></select>
    <div class="btn file">PDF seç<input type="file" id="pdf" accept="application/pdf,.pdf,.txt,text/plain"></div>
    <label>veya metni yapıştır</label>
    <textarea id="paste" placeholder="14.10.2026  UBEREATS-YEMEK İSTANBUL  228,75 ..."></textarea>
    <button class="btn sec" data-act="parse">Metni oku</button>
    <div id="preview"></div>
  </div>

  <h2>Nakit / elle harcama</h2>
  <div class="card">
    <label>Tutar (₺)</label><input id="m-amt" inputmode="decimal" placeholder="0,00">
    <label>Açıklama</label><input id="m-desc" placeholder="ör. Dolmuş, berber">
    <label>Kategori</label><select id="m-cat">${CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
    <label>Tarih</label><input id="m-date" type="date" value="${today}">
    <button class="btn" data-act="manual">Harcamayı ekle</button>
  </div>

  <h2>Ek gelir</h2>
  <div class="card">
    <div class="small muted">Sabit gelirin (${TL(S.settings.fixedIncome)}) her döneme otomatik eklenir. Burada değişken gelirini gir; tarihine göre doğru döneme yazılır.</div>
    <label>Tutar (₺)</label><input id="i-amt" inputmode="decimal" placeholder="0,00">
    <label>Not</label><input id="i-note" placeholder="ör. ders, aileden">
    <label>Tarih</label><input id="i-date" type="date" value="${today}">
    <button class="btn" data-act="income">Geliri ekle</button>
    ${S.incomes.length ? `<div style="margin-top:12px">${S.incomes.slice().reverse().map(i => `<div class="tx" style="grid-template-columns:1fr auto auto">
      <div><div class="d">${esc(i.note || "Ek gelir")}</div><div class="small muted">${incDate(i).split("-").reverse().join(".")}</div></div><div class="num">${TL(i.amount)}</div>
      <button class="chip" data-delinc="${S.incomes.indexOf(i)}">Sil</button></div>`).join("")}</div>` : ""}
  </div>`;
}

function ayarlar() {
  const rules = Object.entries(S.rules);
  const sources = {}; for (const t of S.txs) sources[t.source] = (sources[t.source] || 0) + 1;
  return `<h1>Ayarlar</h1>
  <div class="card">
    <label style="margin-top:0">Aylık sabit gelir (₺)</label>
    <input id="fixed" inputmode="decimal" value="${S.settings.fixedIncome}">
    <label>Ay başlangıç günü</label>
    <input id="startday" type="number" min="1" max="28" inputmode="numeric" value="${S.settings.startDay}">
    <div class="small muted" style="margin-top:6px">Ör. 15 ise dönem 15'inden bir sonraki ayın 14'üne kadar sayılır.</div>
    <button class="btn sec" data-act="fixed">Kaydet</button>
  </div>
  <h2>Veriler</h2>
  <div class="card">
    <div class="small muted">${S.txs.length} işlem · ${Object.entries(sources).map(([k, v]) => `${esc(k)}: ${v}`).join(" · ") || "boş"}<br>
    Verilerin sadece bu telefonda saklanır, hiçbir sunucuya gönderilmez. Ara sıra yedek al.</div>
    <button class="btn sec" data-act="export">Yedeği dışa aktar</button>
    <div class="btn sec file">Yedeği geri yükle<input type="file" id="import" accept="application/json,.json"></div>
    <button class="btn danger" data-act="wipe">Tüm verileri sil</button>
  </div>
  <h2>Öğrenilen kurallar (${rules.length})</h2>
  <div class="card">${rules.length ? rules.map(([k, c]) => `<div class="tx" style="grid-template-columns:1fr auto auto">
      <div class="d small">${esc(k)}</div><span class="small">${esc(CAT[c]?.name)}</span><button class="chip" data-delrule="${esc(k)}">Sil</button></div>`).join("")
    : `<div class="small muted">Bir işlemin kategorisini değiştirdiğinde burada görünür.</div>`}</div>
  <div class="small muted" style="text-align:center;margin:20px">Param · v4</div>`;
}

// ---------- Kategori değiştirme ----------
function openSheet(i) {
  const t = S.txs[i]; if (!t) return;
  const bg = document.createElement("div"); bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet"><div class="row between"><div style="min-width:0"><b>${esc(prettyDesc(t.desc))}</b>
    <div class="small muted">${t.date.split("-").reverse().join(".")} · ${TL(Math.abs(t.amount), 2)} · ${esc(t.source)}</div></div></div>
    ${!SPEND(t) ? `<p class="small muted">Bu bir ${t.type === "odeme" ? "kart borcu ödemesi" : "gelen para / transfer"}; harcama olarak sayılmaz.</p>` : `
    <div class="catpick">${CATEGORIES.map(c => `<button data-pick="${c.id}" class="${t.cat === c.id ? "on" : ""}"><span class="dot" style="background:${c.color}"></span>${c.name}</button>`).join("")}</div>
    <label class="check"><input type="checkbox" id="all" checked> Bu yerdeki tüm harcamalara uygula ve hatırla</label>`}
    <button class="btn danger" data-del>İşlemi sil</button></div>`;
  bg.addEventListener("click", e => {
    if (e.target === bg) return bg.remove();
    const p = e.target.closest("[data-pick]");
    if (p) {
      const c = p.dataset.pick;
      if (bg.querySelector("#all").checked) {
        const k = merchantKey(t.desc); S.rules[k] = c;
        let n = 0; for (const x of S.txs) if (SPEND(x) && merchantKey(x.desc) === k) { x.cat = c; n++; }
        toast(`${n} işlem güncellendi`);
      } else t.cat = c;
      save(); bg.remove(); render();
    }
    if (e.target.closest("[data-del]") && confirm("Bu işlem silinsin mi?")) { S.txs.splice(i, 1); save(); bg.remove(); render(); }
  });
  document.body.append(bg);
}

// ---------- Ekstre içe aktarma ----------
let pdfjs = null;
async function readPdf(file) {
  if (!pdfjs) { pdfjs = await import("./pdf.min.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = new URL("./pdf.worker.min.mjs", import.meta.url).href; }
  return pdfToLines(pdfjs, new Uint8Array(await file.arrayBuffer()));
}
function preparePreview(lines) {
  const text = lines.join("\n");
  const chosen = $("#src").value, source = chosen === "auto" ? detectSource(text) : chosen;
  const rows = parseLines(lines, source, S.rules);
  if (!rows.length) { $("#preview").innerHTML = `<p class="bad">İşlem bulunamadı. Bu ekstre formatını henüz tanımıyorum.</p>`; return; }
  const added = mergeNew(S.txs, rows);
  const v = verify(text, rows, source);
  const check = v ? `<div class="${v.ok ? "ok" : "bad"}">${v.ok ? "✓" : "⚠"} ${esc(v.msg)}</div>` : "";
  const dates = rows.map(t => t.date).sort();
  pending = { added, source, lastMonth: periodOf(dates.at(-1)) };
  $("#preview").innerHTML = `<div style="margin-top:14px">${check}
    <p class="small">${esc(source)} · ${dates[0].split("-").reverse().join(".")} – ${dates.at(-1).split("-").reverse().join(".")}<br>
    ${rows.length} işlem okundu, <b>${added.length} tanesi yeni</b>${rows.length - added.length ? `, ${rows.length - added.length} tanesi zaten kayıtlı` : ""}.<br>
    ${rows.filter(t => t.cat === "diger").length} işlem "Diğer" kategorisinde. Kaydettikten sonra İşlemler'den düzeltebilirsin.</p>
    ${added.length ? `<button class="btn" data-act="commit">${added.length} işlemi kaydet</button>` : ""}</div>`;
}

// ---------- Olaylar ----------
document.addEventListener("click", e => {
  const nav = e.target.closest("nav button"); if (nav) { tab = nav.dataset.tab; filter = null; return render(); }
  const go = e.target.closest("[data-go]"); if (go) { tab = go.dataset.go; return render(); }
  const f = e.target.closest("[data-filter]"); if (f && tab === "ozet") { filter = f.dataset.filter; tab = "islemler"; return render(); }
  const ch = e.target.closest("[data-chip]"); if (ch) { filter = ch.dataset.chip || null; return render(); }
  const tx = e.target.closest("[data-tx]"); if (tx) return openSheet(+tx.dataset.tx);
  const dr = e.target.closest("[data-delrule]"); if (dr) { delete S.rules[dr.dataset.delrule]; save(); return render(); }
  const di = e.target.closest("[data-delinc]"); if (di) { S.incomes.splice(+di.dataset.delinc, 1); save(); return render(); }
  const a = e.target.closest("[data-act]")?.dataset.act; if (!a) return;
  const num = s => parseFloat(String(s).replace(/\./g, "").replace(",", "."));
  if (a === "prev") { month = shiftMonth(month, -1); render(); }
  if (a === "next") { month = shiftMonth(month, 1); render(); }
  if (a === "parse") { const v = $("#paste").value.trim(); if (v) preparePreview(v.split(/\r?\n/)); }
  if (a === "commit" && pending) {
    S.txs.push(...pending.added); save(); month = pending.lastMonth; pending = null;
    toast("Kaydedildi"); tab = "ozet"; render();
  }
  if (a === "manual") {
    const amt = num($("#m-amt").value); if (!(amt > 0)) return toast("Tutar gir");
    S.txs.push({ date: $("#m-date").value, desc: $("#m-desc").value.trim() || "Nakit harcama", amount: amt, type: "harcama", cat: $("#m-cat").value, source: "Nakit", taksit: null });
    save(); toast("Eklendi"); render();
  }
  if (a === "income") {
    const amt = num($("#i-amt").value); if (!(amt > 0)) return toast("Tutar gir");
    S.incomes.push({ date: $("#i-date").value, amount: amt, note: $("#i-note").value.trim() }); save(); toast("Gelir eklendi"); render();
  }
  if (a === "fixed") { const v = num($("#fixed").value), d = Math.round(+$("#startday").value);
    if (v >= 0) S.settings.fixedIncome = v;
    if (d >= 1 && d <= 28) { S.settings.startDay = d; month = periodOf(new Date().toISOString().slice(0, 10)); }
    save(); toast("Kaydedildi"); }
  if (a === "export") exportData();
  if (a === "wipe" && confirm("Tüm işlemler, kurallar ve gelirler silinecek. Emin misin?")) { S = blank(); save(); render(); }
});

document.addEventListener("change", async e => {
  if (e.target.id === "pdf" && e.target.files[0]) {
    const file = e.target.files[0];
    $("#preview").innerHTML = `<p class="small muted">Okunuyor…</p>`;
    try {
      const lines = /\.txt$/i.test(file.name) ? (await file.text()).split(/\r?\n/) : await readPdf(file);
      preparePreview(lines);
    } catch (err) { $("#preview").innerHTML = `<p class="bad">Dosya okunamadı: ${esc(err.message)}</p>`; }
    e.target.value = "";
  }
  if (e.target.id === "import" && e.target.files[0]) {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(d.txs)) throw new Error("Geçersiz yedek");
      if (confirm(`Yedekte ${d.txs.length} işlem var. Mevcut verilerin yerine geçsin mi?`)) { S = { ...blank(), ...d }; save(); toast("Yedek yüklendi"); render(); }
    } catch (err) { toast("Yedek okunamadı"); }
  }
});

async function exportData() {
  const name = `param-yedek-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(S)], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: "Param yedeği" }); return; } catch { return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; a.click();
}

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
render();

