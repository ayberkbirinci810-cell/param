// Ekstre ayrıştırıcı + kategori kuralları. Tarayıcıda ve Node'da çalışır.

export const CATEGORIES = [
  { id: "yemek",   name: "Yemek siparişi",   color: "#E4572E" },
  { id: "kafe",    name: "Kafe & restoran",  color: "#F3A712" },
  { id: "kantin",  name: "Kantin",           color: "#C17C74" },
  { id: "market",  name: "Market",           color: "#29BF12" },
  { id: "giyim",   name: "Giyim & alışveriş",color: "#A23B72" },
  { id: "ulasim",  name: "Ulaşım",           color: "#2E86AB" },
  { id: "abonelik",name: "Abonelik",         color: "#6C4AB6" },
  { id: "okul",    name: "Okul & eğitim",             color: "#3D5A80" },
  { id: "eglence", name: "Eğlence & oyun",   color: "#FF6B35" },
  { id: "spor",    name: "Spor & takviye",   color: "#00A6A6" },
  { id: "saglik",  name: "Sağlık",           color: "#EF476F" },
  { id: "diger",   name: "Diğer",            color: "#8D99AE" },
];
export const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
// "Dışarıda yemek" sayacına giren kategoriler
export const DISARIDA = ["yemek", "kafe", "kantin"];

// Türkçe büyük harf + ASCII'ye katlama: "Şeyh Edebali" -> "SEYH EDEBALI"
export function fold(s) {
  return String(s).toLocaleUpperCase("tr-TR")
    .replace(/Ç/g, "C").replace(/Ğ/g, "G").replace(/[İI]/g, "I")
    .replace(/Ö/g, "O").replace(/Ş/g, "S").replace(/Ü/g, "U")
    .replace(/Â/g, "A").replace(/\s+/g, " ").trim();
}

// Sıra önemli: ilk eşleşen kazanır.
export const RULES = [
  ["odeme",   ["SUBE-HESAPTAN", "HESAPTAN ODEME", "ODEME-TESEKKUR", "KREDI KARTI ODEME"]],
  ["yemek",   ["UBEREATS", "UBER EATS", "YEMEK SEPET", "YEMEKSEPET", "YEMEKPAY", "GETIR", "TRENDYOL YEMEK", "MIGROS YEMEK"]],
  ["kantin",  ["EDABALI", "EDEBALI", "LUTFIYE AK"]],
  ["abonelik",["DIGITURK", "ANTHROPIC", "PRIME", "NETFLIX", "SPOTIFY", "YOUTUBE", "APPLE.COM", "ICLOUD", "DISNEY", "OPENAI", "CHATGPT", "EXXEN", "BLUTV", "GOOGLE ONE", "DUOLINGO", "CANVA", "TURKCELL", "VODAFONE", "TURK TELEKOM"]],
  ["kafe",    ["CAFE", "KAFE", "COFFEE", "KAHVE", "POPEYES", "PILAV", "LOKANTA", "DURUM", "LOUNGE", "TASHAN", "UNLU MAM", "ASTU GRUP", "PAMA ", "1401", "BURGER", "PIZZA", "RESTAURAN", "STARBUCKS", "SIMIT", "BAKLAVA", "KEBAP"]],
  ["market",  ["BIM ", "BIM A.S", "MIGROS", " MIG ", "HAKMAR", "GRATIS", "KAYI GIDA", "OZ COBAN", "ISTIKLAL CD", "A101", "SOK MARKET", "CARREFOUR", "FILE MARKET", "WATSONS", "ROSSMANN"]],
  ["giyim",   ["FLAWWEARS", "TAKEHIQ", "BERSHKA", "LEGO", "SAHA MAGAZA", "HEPSIBURA", "HEPSIPAY", "AMAZON", "TUHAFIYE", "TRENDYOL", "ZARA", "WAIKIKI", "DEFACTO", "KOTON", "H&M", "PULL&BEAR", "MAVI", "NIKE", "ADIDAS"]],
  ["eglence", ["STEAM", "EPIC GAMES", "PLAYSTATION", "XBOX", "RIOT", "VALORANT", "SINEMA", "CINEMAXIMUM", "PASSO", "BILETIX", "BILETINIAL"]],
  ["spor",    ["PROTEIN", "PILATES", "GYM", "FITNESS", "SUPPLEMENT"]],
  ["ulasim",  ["TOPLU TASIMA", "TCDD", "PETROL", "LIDIO/ASIS", "ASIS ELEKTRON", "OPET", "SHELL", " TAKSI ", "TAKSI DURAK", "OBILET", "PEGASUS", "THY ", "METRO TURIZM", "KAMIL KOC", "MARTI"]],
  ["okul",    ["BILECIK.EDU", ".EDU", "COURSERA", "UDEMY", "KIRTASIYE", "KITAP"]],
  ["saglik",  ["ECZANE", "HASTANE", "DIS KLINIGI", "OPTIK"]],
];

// Kullanıcı kuralları için tüccar anahtarı: rakamları ve taksit eklerini at
export function merchantKey(desc) {
  return fold(desc)
    .replace(/\b\d+\.?\s*TAK(SIT)?\b/g, "")
    .replace(/\bIADE\b/g, "")
    .replace(/[0-9]/g, "")
    .replace(/[^A-Z&./ ]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 28);
}

export function categorize(desc, userRules = {}) {
  const key = merchantKey(desc);
  if (userRules[key]) return userRules[key];
  const f = " " + fold(desc) + " ";
  for (const [cat, keys] of RULES) if (keys.some(k => f.includes(k))) return cat;
  return "diger";
}

const AMT = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(\+?)/g;
const DATE = /^\s*(\d{2})[./](\d{2})[./](\d{4}|\d{2})\s+(.+)$/;
const yyyy = y => y.length === 2 ? "20" + y : y;
const num = s => parseFloat(s.replace(/\./g, "").replace(",", "."));

// Ham metin satırlarından işlem listesi
export function parseLines(lines, source = "Ziraat", userRules = {}) {
  if (source === "Enpara") return parseEnpara(lines, userRules);
  const out = [];
  for (let raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    if (/DEV[İI]R/i.test(line)) continue;
    const m = line.match(DATE);
    if (!m) continue;
    const rest = m[4];
    const amts = [...rest.matchAll(AMT)].map(a => ({ v: a[1], plus: a[2] === "+", i: a.index }));
    if (!amts.length) continue;
    // Sondaki "0,00" (Bankkart Lira / USD sütunları) değerlerini at
    while (amts.length > 1 && amts[amts.length - 1].v === "0,00") amts.pop();
    const a = amts[amts.length - 1];
    let amount = num(a.v);
    if (!amount) continue;

    // Açıklama: tutar/taksit bilgisinden önceki kısım
    let desc = rest.slice(0, amts[0].i);
    desc = desc.split(/\s{2,}|\(/)[0].trim() || rest.split(/\s{2,}/)[0].trim();
    desc = desc.replace(/\s+\d[\d.]*,\d{2}\s*TL.*$/, "").trim();

    const tk = rest.match(/(?:([\d.,]+)\s*TL\s*)?[İI]şlemin\s+(\d+)\/(\d+)\s+Taksidi/i);
    const taksit = tk ? { n: +tk[2], of: +tk[3], total: tk[1] ? num(tk[1].includes(",") ? tk[1] : tk[1].replace(".", ",")) : null } : null;
    if (taksit && taksit.total == null) taksit.total = +(amount * taksit.of).toFixed(2);

    const credit = a.plus;
    let cat = categorize(desc, userRules);
    let type = "harcama";
    if (cat === "odeme") { type = "odeme"; }
    else if (credit) { type = "iade"; amount = -amount; }

    out.push({
      date: `${yyyy(m[3])}-${m[2]}-${m[1]}`,
      desc, amount: +amount.toFixed(2), type,
      cat: type === "odeme" ? "odeme" : cat,
      source, taksit,
    });
  }
  return out;
}

// ---------- Enpara vadesiz hesap özeti ----------
// Satır: "07/10/26  Diğer, Spotify P47C1AB625  Stockholm  SE  - 99,00 TL  35,63 TL"
// Uzun açıklamalar tarih satırının üstüne ve altına bölünebilir.
const ENP_ROW = /^\s*(\d{2})[./](\d{2})[./](\d{2,4})\s+(.*?)(-?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*TL\s+(-?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*TL\s*$/;
const ENP_TYPE = /^(Encard Harcaması|Diğer|Gelen Transfer|Giden Transfer|Gelen FAST|Giden FAST|Gelen EFT|Giden EFT|Fatura Ödemesi|Otomatik Ödeme|Kredi Kartı Ödemesi|Para Çekme|Para Yatırma|ATM[^,]*|[A-ZÇĞİÖŞÜ][^,]{2,30}),\s*/;

export function enparaOwner(lines) {
  for (const l of lines) { const m = l.match(/Ad soyad\s+(.+?)(\s{2,}|\s+(TC|Ekstre|Tarih)|$)/); if (m) return m[1].trim(); }
  return null;
}

export function parseEnpara(lines, userRules = {}) {
  const owner = enparaOwner(lines);
  const start = lines.findIndex(l => /Tarih\s+Açıklama\s+Tutar\s+Bakiye/i.test(l));
  const body = (start >= 0 ? lines.slice(start + 1) : lines).map(l => l.replace(/\t/g, "  "));
  const rows = [];
  let orphanBefore = [];
  for (const l of body) {
    if (/^\s*Sayfa\s+\d/i.test(l) || /Enpara Bank A\.Ş/.test(l)) { orphanBefore = []; continue; }
    if (/Tarih\s+Açıklama\s+Tutar/i.test(l)) continue;
    const m = l.match(ENP_ROW);
    if (m) {
      rows.push({ d: m[1], mo: m[2], y: yyyy(m[3]), desc: [...orphanBefore, m[4].trim()].filter(Boolean),
        amount: num(m[6]) * (m[5] ? -1 : 1), bal: num(m[8]) * (m[7] ? -1 : 1) });
      orphanBefore = [];
    } else if (l.trim() && rows.length) {
      // Tür önekiyle ("Encard Harcaması,") başlayan yetim satır bir sonraki işleme ait
      if (ENP_TYPE.test(l.trim())) orphanBefore.push(l.trim());
      else rows[rows.length - 1].desc.push(l.trim());
    } else if (l.trim()) orphanBefore.push(l.trim());
  }
  const out = [];
  for (const r of rows) {
    let full = r.desc.join(" ").replace(/\s+/g, " ").trim();
    const tm = full.match(ENP_TYPE);
    const kind = tm ? tm[1] : "";
    let desc = tm ? full.slice(tm[0].length) : full;
    let type = r.amount < 0 ? "harcama" : "gelen", cat;
    const transfer = /Transfer|FAST|EFT/i.test(kind);
    if (transfer) {
      const who = desc.split(",")[0].trim();
      desc = (r.amount < 0 ? "Giden: " : "Gelen: ") + who;
      if (owner && fold(who) === fold(owner)) type = "transfer";
    } else {
      desc = desc.replace(/\*?\b[A-Z0-9]*\d[A-Z0-9]*\b/gi, "").replace(/\s+/g, " ").trim();
    }
    if (type === "harcama") cat = categorize(desc, userRules);
    else cat = type;
    out.push({ date: `${r.y}-${r.mo}-${r.d}`, desc, amount: +Math.abs(r.amount).toFixed(2) * (type === "harcama" ? 1 : 1),
      type, cat, source: "Enpara", taksit: null, bal: r.bal, signed: r.amount });
  }
  return out;
}

// Ekstreyi bankanın kendi rakamlarıyla doğrula
export function verify(text, rows, source) {
  if (source === "Enpara") {
    if (!rows.length) return null;
    let ok = true;
    for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i - 1].bal + rows[i].signed - rows[i].bal) > 0.01) ok = false;
    const endM = text.match(/Dönem sonu bakiyesi\s+(-?[\d.]+,\d{2})/i);
    if (endM && Math.abs(num(endM[1]) - rows.at(-1).bal) > 0.01) ok = false;
    return ok ? { ok, msg: "Bakiye zinciri tutuyor, eksik işlem yok" } : { ok, msg: "Bakiyeler tutmuyor, bir işlem eksik okunmuş olabilir" };
  }
  const bank = statementTotals(text);
  if (!bank) return null;
  const gross = +rows.filter(t => t.type === "harcama").reduce((a, t) => a + t.amount, 0).toFixed(2);
  return Math.abs(bank.harcama - gross) < 0.05
    ? { ok: true, msg: `Banka toplamıyla tutuyor (${gross.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺)` }
    : { ok: false, msg: `Banka harcama toplamı ${bank.harcama.toLocaleString("tr-TR")} ₺, okunan ${gross.toLocaleString("tr-TR")} ₺` };
}

// Ekstre özetinden bankanın kendi toplamlarını oku (doğrulama için)
export function statementTotals(text) {
  const i = text.search(/Devreden Bakiye/i);
  if (i < 0) return null;
  const tl = [...text.slice(i).matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*TL/g)].map(m => num(m[1]));
  if (tl.length < 5) return null;
  return { devir: tl[0], harcama: tl[1], odeme: tl[3], borc: tl[4] };
}

export function parseText(text, source, userRules) {
  return parseLines(text.split(/\r?\n/), source, userRules);
}

// Ekstrenin hangi bankaya ait olduğunu tahmin et
export function detectSource(text) {
  const f = fold(text.slice(0, 4000));
  if (f.includes("ENPARA")) return "Enpara";
  if (f.includes("ZIRAAT") || f.includes("BANKKART")) return "Ziraat";
  return "Ziraat";
}

// Yinelenenleri ayıkla: aynı (tarih|açıklama|tutar) anahtarından mevcutta kaç tane
// varsa o kadarını atla; aynı gün aynı tutarlı iki gerçek alışveriş korunur.
export function txKey(t) { return `${t.date}|${merchantKey(t.desc)}|${t.amount}|${t.source}`; }
export function mergeNew(existing, incoming) {
  const have = {};
  for (const t of existing) have[txKey(t)] = (have[txKey(t)] || 0) + 1;
  const seen = {}, added = [];
  for (const t of incoming) {
    const k = txKey(t);
    seen[k] = (seen[k] || 0) + 1;
    if (seen[k] > (have[k] || 0)) added.push(t);
  }
  return added;
}

// Devam eden taksitler: her plan için en son görülen taksit
export function activeInstallments(txs) {
  const plans = {};
  for (const t of txs) {
    if (!t.taksit || t.type !== "harcama") continue;
    const name = t.desc.replace(/^\d{2}\/\d{2}\s+/, "").replace(/\s*\d+\.\s*Tak(sit)?\b.*$/i, "").replace(/\s+\d+\.Tak\b.*$/i, "").trim();
    const k = `${merchantKey(name)}|${t.taksit.total}|${t.taksit.of}`;
    if (!plans[k] || t.taksit.n > plans[k].n) plans[k] = { name, n: t.taksit.n, of: t.taksit.of, monthly: t.amount, total: t.taksit.total, last: t.date, cat: t.cat };
  }
  return Object.values(plans)
    .map(p => ({ ...p, left: p.of - p.n, leftAmount: +((p.of - p.n) * p.monthly).toFixed(2) }))
    .sort((a, b) => b.leftAmount - a.leftAmount);
}
