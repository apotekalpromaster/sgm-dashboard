// ═══════════════════════════════════════════════════════════════
// SGM COMPETITION ENGINE — dataProcessor.js
// Ported 1:1 from sgm_competition_dashboard_v3.html (approved logic)
// ═══════════════════════════════════════════════════════════════

import * as XLSX from 'xlsx';

// ── COMPETITION CONFIG ─────────────────────────────────────────
// Business rules yang sudah di-approve. Sumber: sgm_competition_dashboard_v3.html § CFG
// tierN maps: TITANIUM=1, PLATINUM=1, GOLD=1, SILVER=2, BRONZE=3
// qtyMin[tierN] = minimum qty agar toko "Qualified"
// incentivePerQty = Rp per unit (untuk model alat test)
// incentiveItems  = item codes yang mendapat insentif
export const COMPETITION_CFG = {
  'BLACKMORES': {
    label:          'Blackmores',
    color:          '#0F6E56',
    periode:        '1 Apr–30 Jun 2026',
    targetNetSales: 300_000_000,
    targetQty:      750,
    // qtyMin per tier number: tierN(TITANIUM/PLATINUM/GOLD)=1→20, SILVER=2→12, BRONZE=3→8
    tiers:          { TITANIUM: 1, PLATINUM: 1, GOLD: 1, SILVER: 2, BRONZE: 3 },
    qtyMin:         { 1: 20, 2: 12, 3: 8 },
  },
  'FAMILY DR (BODY SUPPORT)': {
    label:          'FamilyDr Body Support',
    color:          '#185FA5',
    periode:        '1 Apr–31 Mei 2026',
    targetNetSales: 100_000_000,
    targetQty:      null,
    tiers:          { TITANIUM: 1, PLATINUM: 1, GOLD: 1, SILVER: 2, BRONZE: 3 },
    qtyMin:         { 1: 6, 2: 4, 3: 2 },
  },
  'FAMILYDR (ALAT TEST)': {
    label:             'FamilyDr Alat Test',
    color:             '#378ADD',
    periode:           '1 Apr–31 Mei 2026',
    targetNetSales:    100_000_000,
    targetQty:         null,
    // Model insentif per qty (Rp 30.000 × qty untuk item tertentu)
    incentivePerQty:   30_000,
    incentiveItems:    ['100000736', '100000769'],
  },
  'OMRON (THERMOMETER)': {
    label:          'Omron Thermometer',
    color:          '#BA7517',
    periode:        '1 Apr–31 Mei 2026',
    targetNetSales: 100_000_000,
    targetQty:      null,
    tiers:          { TITANIUM: 1, PLATINUM: 1, GOLD: 1, SILVER: 2, BRONZE: 3 },
    qtyMin:         { 1: 10, 2: 6, 3: 3 },
  },
  'OMRON (ALAT TEST)': {
    label:           'Omron Alat Test',
    color:           '#854F0B',
    periode:         '1 Apr–31 Mei 2026',
    targetNetSales:  100_000_000,
    targetQty:       null,
    incentivePerQty: 30_000,
    incentiveItems:  ['0404405', '0403318'],
  },
};

export const TIER_ORDER = ['TITANIUM', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', ''];

// ── TIER NUMBER LOOKUP ─────────────────────────────────────────
// Maps tier name → tier number used as qtyMin key
export function tierN(cat) {
  const m = { TITANIUM: 1, PLATINUM: 1, GOLD: 1, SILVER: 2, BRONZE: 3 };
  return m[String(cat || '').toUpperCase()] || 0;
}

// ── Is store qualified for incentive? ─────────────────────────
export function isQualified(cfg, category, qty) {
  const tn = tierN(category);
  const qMin = cfg.qtyMin?.[tn] || 0;
  return !qMin || qty >= qMin;
}

// ═══════════════════════════════════════════════════════════════
// LOW-LEVEL PARSE HELPERS (ported from HTML)
// ═══════════════════════════════════════════════════════════════

/** Read a File into raw array-of-arrays */
function parseFileRaw(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}

/** Find first row index whose cells contain any of the given keys (case-insensitive) */
function findHdr(raw, ...keys) {
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const r = raw[i].map((c) => String(c || '').trim().toLowerCase());
    if (keys.some((k) => r.includes(k.toLowerCase()))) return i;
  }
  return 0;
}

/** Find column index by exact lowercase match, trying each name in order */
function ci(hdrs, ...names) {
  const lo = hdrs.map((h) => String(h || '').trim().toLowerCase());
  for (const n of names) {
    const i = lo.indexOf(n.toLowerCase());
    if (i !== -1) return i;
  }
  return -1;
}

/** Uppercase + trim helper */
function N(s) { return String(s || '').trim().toUpperCase(); }

/**
 * Extract short code from "0001 - JKJSTT1" → "JKJSTT1"
 * Regex: last occurrence of digits-space-dash-space-ALPHANUM
 */
function extractCode(s) {
  const m = String(s || '').trim().match(/\d+\s*-\s*([A-Z0-9]+)\s*$/i);
  return m ? m[1].toUpperCase() : String(s || '').trim().toUpperCase();
}

/**
 * Detect if a Sales Person value is actually a store code fragment.
 * Store code = alphanumeric, no spaces, ≤12 chars → exclude from SP leaderboard
 */
function isStoreCodeSP(sp, storeCodesSet) {
  if (!sp) return true;
  const s = sp.trim();
  if (storeCodesSet.has(s.toUpperCase())) return true;
  if (!s.includes(' ') && s.length <= 12 && /^[A-Z0-9\-_]+$/i.test(s)) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════
// FILE PARSERS — exported for use in App.jsx / upload flow
// ═══════════════════════════════════════════════════════════════

/**
 * Parse template transaksi POS.
 * Returns { rows: TxRow[], periode: string }
 *
 * Real format (CONTOH TEMPLATE.xlsx):
 *   - Row 3 (index 2), col D (index 3): periode string "2026-04-01 to 2026-04-16"
 *   - Header at row 6 (index 5), detected dynamically
 *   - Filter: Channel === 'POS' only
 */
export async function parseTxFile(file) {
  const raw = await parseFileRaw(file);

  // Periode from row index 2, col index 3 (D3)
  let periode = '';
  if (raw[2] && raw[2][3]) periode = String(raw[2][3]).trim();

  // Header detection
  const hi = findHdr(raw, 'No.', 'Store', 'Channel', 'Item', 'Quantity Sold');
  const hdrs = raw[hi].map((h) => String(h || '').trim());

  const iSt  = ci(hdrs, 'Store');
  const iCh  = ci(hdrs, 'Channel');
  const iSP  = ci(hdrs, 'Sales Person', 'Salesperson');
  const iIt  = ci(hdrs, 'Item', 'Item Code');
  const iQty = ci(hdrs, 'Quantity Sold', 'Qty', 'Quantity');
  const iNS  = ci(hdrs, 'Net Sales', 'NetSales');
  const iDsc = ci(hdrs, 'Item Description', 'Description');

  const rows = [];
  for (let i = hi + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[iCh]) continue;
    // Filter: POS channel only
    if (!N(r[iCh]).includes('POS')) continue;
    const item = N(r[iIt]);
    if (!item) continue;

    rows.push({
      storeRaw:    String(r[iSt]  || '').trim(),
      storeCode:   extractCode(r[iSt]),
      salesperson: String(r[iSP]  || '').trim(),
      item,
      itemDesc:    String(r[iDsc] || '').trim(),
      qty:         parseFloat(r[iQty]) || 0,
      netSales:    parseFloat(r[iNS])  || 0,
    });
  }
  return { rows, periode };
}

/**
 * Parse List Produk Kompetisi file.
 * Returns map: { [ITEM_CODE]: { itemName, kompetisi } }
 * Required columns: ITEM CODE, KOMPETISI
 */
export async function parseListProduk(file) {
  const raw = await parseFileRaw(file);
  const hi  = findHdr(raw, 'ITEM CODE', 'item_code', 'KOMPETISI', 'Kompetisi');
  const hdrs = raw[hi].map((h) => String(h || '').trim());

  const iC = ci(hdrs, 'ITEM CODE', 'Item Code', 'ITEMCODE', 'code');
  const iN = ci(hdrs, 'ITEM NAME', 'Item Name', 'DESKRIPSI', 'Description', 'Name');
  const iK = ci(hdrs, 'KOMPETISI', 'Kompetisi', 'Competition');

  const map = {};
  for (let i = hi + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const code = N(r[iC]);
    if (!code) continue;
    map[code] = {
      itemName:  String(r[iN] || '').trim(),
      kompetisi: N(r[iK]),
    };
  }
  return map;
}

/**
 * Parse Master AM file.
 * Returns map: { [SHORT_CODE]: { storeName, category, amName, area } }
 * Required columns: Short Code, Category, AM Name, Area
 */
export async function parseMasterAM(file) {
  const raw = await parseFileRaw(file);
  const hi  = findHdr(raw, 'Short Code', 'SHORT CODE', 'Category', 'AM Name', 'AM', 'Area');
  const hdrs = raw[hi].map((h) => String(h || '').trim());

  const iC   = ci(hdrs, 'Short Code', 'SHORT CODE', 'Store Code', 'Code', 'Kode Toko');
  const iN   = ci(hdrs, 'Store Name', 'StoreName', 'Nama Toko', 'Name');
  const iCat = ci(hdrs, 'Category', 'Category Store', 'Tier', 'Kategori');
  const iAM  = ci(hdrs, 'AM Name', 'AM', 'Area Manager', 'Nama AM');
  const iAr  = ci(hdrs, 'Area', 'Region', 'Wilayah');

  const map = {};
  for (let i = hi + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const code = N(r[iC]);
    if (!code) continue;
    map[code] = {
      storeName: String(r[iN]   || '').trim(),
      category:  N(r[iCat]),
      amName:    String(r[iAM]  || '').trim(),
      area:      String(r[iAr]  || '').trim(),
    };
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE — processTransactions
// ═══════════════════════════════════════════════════════════════

/**
 * Main pipeline. Joins tx rows with listProduk + masterAM, aggregates
 * per competition, and computes all leaderboards + incentives.
 *
 * @param {TxRow[]}   allTx      — output of parseTxFile (multiple files merged)
 * @param {Object}    listProduk — output of parseListProduk
 * @param {Object}    masterAM   — output of parseMasterAM (can be {})
 * @returns {ProcessedResult}    — keyed by kompetisi name
 */
export function processTransactions(allTx, listProduk, masterAM) {
  // Build set of all store codes for SP filtering
  const storeCodesSet = new Set(allTx.map((r) => r.storeCode).filter(Boolean));
  allTx.forEach((r) => {
    const parts = r.storeRaw.split('-');
    if (parts.length >= 2) storeCodesSet.add(parts[parts.length - 1].trim().toUpperCase());
  });

  // ── JOIN: enrich each tx row ──────────────────────────────────
  let matched = 0, skipped = 0;
  const enriched = [];

  allTx.forEach((r) => {
    const produk = listProduk[r.item];
    if (!produk) { skipped++; return; }

    const master = masterAM[r.storeCode] || {};
    enriched.push({
      ...r,
      storeName:  master.storeName || r.storeRaw,
      category:   master.category  || '',
      amName:     master.amName    || '',
      area:       master.area      || '',
      kompetisi:  produk.kompetisi,
      itemName:   produk.itemName  || r.itemDesc,
    });
    matched++;
  });

  if (!enriched.length) {
    throw new Error(
      `0 transaksi cocok kompetisi.\nBaris POS: ${allTx.length} · Produk terdaftar: ${Object.keys(listProduk).length}\n` +
      `Periksa apakah ITEM CODE di List Produk sesuai dengan kolom Item di template transaksi.`
    );
  }

  // ── GROUP BY KOMPETISI ────────────────────────────────────────
  const byK = {};
  enriched.forEach((r) => { (byK[r.kompetisi] = byK[r.kompetisi] || []).push(r); });

  // ── AGGREGATE PER KOMPETISI ───────────────────────────────────
  const processed = {};

  Object.entries(byK).forEach(([k, rows]) => {
    const cfg = COMPETITION_CFG[k] || {};

    const totalNS  = rows.reduce((s, r) => s + r.netSales, 0);
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);

    // ── Store map ──
    const stM = {};
    rows.forEach((r) => {
      if (!stM[r.storeCode]) {
        stM[r.storeCode] = {
          code:     r.storeCode,
          name:     r.storeName,
          category: r.category,
          am:       r.amName,
          area:     r.area,
          qty:      0,
          ns:       0,
        };
      }
      stM[r.storeCode].qty += r.qty;
      stM[r.storeCode].ns  += r.netSales;
    });

    // Sort: by TIER_ORDER first, then by ns desc within tier
    const storeLeader = Object.values(stM).sort((a, b) => {
      const ta = TIER_ORDER.indexOf(a.category) < 0 ? 99 : TIER_ORDER.indexOf(a.category);
      const tb = TIER_ORDER.indexOf(b.category) < 0 ? 99 : TIER_ORDER.indexOf(b.category);
      if (ta !== tb) return ta - tb;
      return b.ns - a.ns;
    });

    // ── Salesperson map (exclude store-code-like entries) — attach per-SP incentive ──
    const spM = {};
    rows.forEach((r) => {
      const sp = r.salesperson;
      if (isStoreCodeSP(sp, storeCodesSet)) return;
      if (!spM[sp]) spM[sp] = {
        name:      sp,
        qty:       0,
        ns:        0,
        store:     r.storeName,
        storeCode: r.storeCode,
        am:        r.amName,
        area:      r.area,
        incentive: 0,
      };
      spM[sp].qty += r.qty;
      spM[sp].ns  += r.netSales;
      // Per-SP incentive for alat-test model
      if (cfg.incentivePerQty && cfg.incentiveItems?.includes(r.item)) {
        spM[sp].incentive += r.qty * cfg.incentivePerQty;
      }
    });
    const spLeader = Object.values(spM).sort((a, b) => b.ns - a.ns);

    // ── Area Manager map ──
    const amM = {};
    rows.forEach((r) => {
      if (!r.amName) return;
      if (!amM[r.amName]) amM[r.amName] = { name: r.amName, area: r.area, qty: 0, ns: 0 };
      amM[r.amName].qty += r.qty;
      amM[r.amName].ns  += r.netSales;
    });
    const amLeader = Object.values(amM).sort((a, b) => b.ns - a.ns);

    // ── Item breakdown ──
    const itM = {};
    rows.forEach((r) => {
      if (!itM[r.item]) itM[r.item] = { item: r.item, desc: r.itemName || r.itemDesc, qty: 0, ns: 0 };
      itM[r.item].qty += r.qty;
      itM[r.item].ns  += r.netSales;
    });
    const itemBreakdown = Object.values(itM).sort((a, b) => b.qty - a.qty);

    // ── Incentive calculation ──
    // Model 1: incentivePerQty × qty for specific items (FamilyDr Alat Test, Omron Alat Test)
    let incentiveTotal = 0;
    if (cfg.incentivePerQty && cfg.incentiveItems) {
      rows.forEach((r) => {
        if (cfg.incentiveItems.includes(r.item)) {
          incentiveTotal += r.qty * cfg.incentivePerQty;
        }
      });
    }

    processed[k] = {
      cfg,
      totalNS,
      totalQty,
      storeLeader,
      spLeader,
      amLeader,
      itemBreakdown,
      incentiveTotal,
      matchedCount: matched,
      skippedCount: skipped,
    };
  });

  return { processed, matched, skipped };
}

// ═══════════════════════════════════════════════════════════════
// METRICS HELPER — for Dashboard KPI cards
// ═══════════════════════════════════════════════════════════════

/**
 * Computes summary KPI metrics for a single competition.
 * Compatible with DashboardPage.jsx component interface.
 */
export function computeMetrics(compKey, processed) {
  const D = processed[compKey];
  if (!D) return null;

  const { cfg, totalNS, totalQty, storeLeader, amLeader, spLeader, itemBreakdown, incentiveTotal } = D;

  const targetSales = cfg.targetNetSales || 0;
  const targetQty   = cfg.targetQty      || 0;

  const pctSales = targetSales > 0
    ? Math.min(((totalNS / targetSales) * 100).toFixed(1), 9999)
    : 0;
  const pctQty = targetQty > 0
    ? Math.min(((totalQty / targetQty) * 100).toFixed(1), 9999)
    : 0;

  // Pre-calculate strictly formatted chart data arrays as requested
  const storeChartData = storeLeader.slice(0, 10).map((s) => ({
    name:  (s.name || s.storeName || '').replace(/APOTEK ALPRO /i, '').replace(/ALPRO /i, '').slice(0, 16),
    sales: s.ns || 0,
  }));

  const amChartData = amLeader.slice(0, 8).map((a) => ({
    name:  (a.name || a.am || 'Unknown').split(' ').slice(0, 2).join(' '),
    sales: a.ns || 0,
  }));

  return {
    totalSales:    totalNS,
    totalQty,
    targetSales,
    targetQty,
    pctSales,
    pctQty,
    storeChartData,
    amChartData,
    stores:        storeLeader,   // sorted by tier+ns
    topStore:      storeLeader[0] || null,
    topAM:         amLeader[0]    || null,
    topAMs:        amLeader,
    topSPs:        spLeader,
    itemBreakdown,
    incentiveTotal,
    storeCount:    storeLeader.length,
    amCount:       amLeader.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// AGGREGATION FOR BACKWARD COMPAT (used by App.jsx aggregated state)
// ═══════════════════════════════════════════════════════════════

/**
 * Thin wrapper: converts processed[compKey].storeLeader into the nested
 * { [compKey]: { [storeCode]: store } } shape used by DashboardPage filters/table.
 */
export function buildAggregated(processed) {
  const aggregated = {};
  Object.entries(processed).forEach(([compKey, D]) => {
    aggregated[compKey] = {};
    D.storeLeader.forEach((s) => {
      aggregated[compKey][s.code] = {
        storeCode: s.code,
        storeName: s.name,
        category:  s.category,
        am:        s.am,
        region:    s.area,
        netSales:  s.ns,
        qty:       s.qty,
        txCount:   0,            // not tracked at store level in v3 logic
        salespersons: {},
      };
    });
  });
  return aggregated;
}

// ═══════════════════════════════════════════════════════════════
// CSV DOWNLOAD UTILITIES
// ═══════════════════════════════════════════════════════════════

/** Escape a CSV cell value */
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/** Convert array-of-arrays to UTF-8 CSV Blob and trigger download */
function downloadCSV(rows2d, filename) {
  const csv = rows2d.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/**
 * Download Store Leaderboard CSV for a competition
 * @param {string} compKey  — e.g. 'BLACKMORES'
 * @param {object} D        — processed[compKey]
 * @param {string} periode  — display period label
 */
export function downloadStoreCSV(compKey, D, periode = '') {
  const cfg   = D.cfg || {};
  const fname = `leaderboard_toko_${compKey.replace(/[^A-Z0-9]/gi, '_')}_${periode.replace(/[^A-Z0-9]/gi, '_') || 'all'}.csv`;
  const rows  = [['Rank dalam Tier', 'Nama Toko', 'Kode Toko', 'Tier', 'AM', 'Area', 'Qty', 'Min Qty', 'Net Sales (Rp)', 'Status Qualified']];

  // Group by tier
  const tierGroups = {};
  D.storeLeader.forEach((s) => {
    const t = s.category || '—';
    (tierGroups[t] = tierGroups[t] || []).push(s);
  });

  Object.entries(tierGroups).forEach(([tier, stores]) => {
    stores.forEach((s, i) => {
      const tn   = tierN(s.category);
      const qMin = cfg.qtyMin?.[tn] || 0;
      const qual = isQualified(cfg, s.category, s.qty);
      rows.push([
        i + 1,
        s.name  || s.code,
        s.code,
        tier,
        s.am    || '—',
        s.area  || '—',
        Math.round(s.qty),
        qMin || '—',
        Math.round(s.ns),
        qMin ? (qual ? 'Qualified' : `Belum (min ${qMin})`) : '—',
      ]);
    });
  });

  downloadCSV(rows, fname);
}

/**
 * Download Sales Person Leaderboard CSV
 */
export function downloadSPCSV(compKey, D, periode = '') {
  const fname = `leaderboard_sp_${compKey.replace(/[^A-Z0-9]/gi, '_')}_${periode.replace(/[^A-Z0-9]/gi, '_') || 'all'}.csv`;
  const rows  = [['Rank', 'Sales Person', 'Toko', 'Kode Toko', 'Area Manager', 'Area', 'Qty', 'Net Sales (Rp)', 'Est. Insentif (Rp)']];

  D.spLeader.forEach((sp, i) => {
    rows.push([
      i + 1,
      sp.name,
      sp.store       || '—',
      sp.storeCode   || '—',
      sp.am          || '—',
      sp.area        || '—',
      Math.round(sp.qty),
      Math.round(sp.ns),
      Math.round(sp.incentive || 0),
    ]);
  });

  downloadCSV(rows, fname);
}

/**
 * Download AM Leaderboard CSV
 */
export function downloadAMCSV(compKey, D, periode = '') {
  const fname = `leaderboard_am_${compKey.replace(/[^A-Z0-9]/gi, '_')}_${periode.replace(/[^A-Z0-9]/gi, '_') || 'all'}.csv`;
  const rows  = [['Rank', 'Area Manager', 'Area', 'Qty', 'Net Sales (Rp)']];
  D.amLeader.forEach((a, i) => {
    rows.push([i + 1, a.name, a.area || '—', Math.round(a.qty), Math.round(a.ns)]);
  });
  downloadCSV(rows, fname);
}

