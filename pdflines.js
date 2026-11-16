// pdf.js metin öğelerini satırlara dönüştürür (y koordinatına göre gruplar)
export async function pdfToLines(pdfjsLib, data) {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const lines = [];
  const isTx = l => /^\s*\d{2}[./]\d{2}[./]\d{4}\s/.test(l);
  const norm = l => l.replace(/\s+/g, " ").trim();
  let prevTx = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const rows = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      let row = rows.find(r => Math.abs(r.y - y) < 2.5);
      if (!row) rows.push(row = { y, parts: [] });
      row.parts.push({ x, w: it.width || 0, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    const pageLines = [];
    for (const r of rows) {
      r.parts.sort((a, b) => a.x - b.x);
      let line = "", end = null;
      for (const pt of r.parts) {
        if (end !== null) line += (pt.x - end > 4 ? "   " : (line.endsWith(" ") || pt.s.startsWith(" ") ? "" : " "));
        line += pt.s; end = pt.x + pt.w;
      }
      pageLines.push(line);
    }
    // Bazı bankalar sayfa sonundaki satırları bir sonraki sayfanın başında (gizli) tekrarlar
    const tx = pageLines.filter(isTx).map(norm);
    let k = 0;
    for (let n = Math.min(prevTx.length, tx.length, 8); n >= 2; n--) {
      if (prevTx.slice(-n).every((l, i) => l === tx[i])) { k = n; break; }
    }
    let skip = k;
    for (const l of pageLines) {
      if (skip && isTx(l)) { skip--; continue; }
      lines.push(l);
    }
    prevTx = tx;
  }
  return lines;
}
