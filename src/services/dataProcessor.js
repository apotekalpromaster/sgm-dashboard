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

  // ── MK COMPETITION ────────────────────────────────────────────────────
  // mkQtyTarget = target qty per store (Status column in leaderboard)
  // mkTopN      = berapa toko teratas mendapat medali per grup
  'MK GRUP 1 (PERNAFASAN & PENCERNAAN)': {
    label:          'MK Grup 1',
    color:          '#7c3aed',
    periode:        '1 Mei–3 Mei 2026',
    targetNetSales: 0,
    targetQty:      null,
    mkQtyTarget:    100,
    mkTopN:         5,
    isMK:           true,
  },
  'MK GRUP 2 (DEMAM & NYERI)': {
    label:          'MK Grup 2',
    color:          '#d97706',
    periode:        '1 Mei–3 Mei 2026',
    targetNetSales: 0,
    targetQty:      null,
    mkQtyTarget:    80,
    mkTopN:         5,
    isMK:           true,
  },
  'MK GRUP 3 (KULIT)': {
    label:          'MK Grup 3',
    color:          '#db2777',
    periode:        '1 Mei–3 Mei 2026',
    targetNetSales: 0,
    targetQty:      null,
    mkQtyTarget:    60,
    mkTopN:         5,
    isMK:           true,
  },
  'MK GRUP 4 (MATA)': {
    label:          'MK Grup 4',
    color:          '#0891b2',
    periode:        '1 Mei–3 Mei 2026',
    targetNetSales: 0,
    targetQty:      null,
    mkQtyTarget:    60,
    mkTopN:         5,
    isMK:           true,
  },
  'MK TOTAL SALES': {
    label:          'Total Sales MK',
    color:          '#16a34a',
    periode:        '1 Mei–3 Mei 2026',
    targetNetSales: 0,
    targetQty:      null,
    isMK:           true,
    isMKTotal:      true,
    // Target qty per toko berdasarkan tier
    mkTierTarget:   { BRONZE: 100, SILVER: 150, GOLD: 200, PLATINUM: 200, TITANIUM: 200 },
    // Top-N medali per tier bucket (GOLD bucket = GOLD + PLATINUM + TITANIUM)
    mkTierTopN:     { BRONZE: 8, SILVER: 10, GOLD: 2 },
  },
};

export const TIER_ORDER = ['TITANIUM', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', ''];

// ═══════════════════════════════════════════════════════════════
// MK ITEM CODE → GROUP MAPPING
// Source: MK Competition rules. All item codes from actual MK STORE REPORT.
// ═══════════════════════════════════════════════════════════════
export const MK_ITEM_GROUP = {
  // GRUP 1 — Pernafasan & Pencernaan
  '100005107': 'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',  // MK FLU
  '100005115': 'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',  // MK BATUK BERDAHAK
  '100008440': 'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',  // MK BATUK KERING (TABLET)
  '100008390': 'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',  // MK SAKIT TENGGOROKAN
  '100005131': 'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',  // MK DIARE
  '100008424': 'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',  // MK SAKIT MAAG AKUT
  '100008432': 'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',  // MK SAKIT MAAG KRONIS
  // GRUP 2 — Demam & Nyeri
  '100005099': 'MK GRUP 2 (DEMAM & NYERI)',            // MK DEMAM
  '100008408': 'MK GRUP 2 (DEMAM & NYERI)',            // MK NYERI HAID
  '100008416': 'MK GRUP 2 (DEMAM & NYERI)',            // MK MIGRAIN
  '100008473': 'MK GRUP 2 (DEMAM & NYERI)',            // MK NYERI SENDI
  // GRUP 3 — Kulit
  '100005123': 'MK GRUP 3 (KULIT)',                    // MK KULIT GATAL ALERGI
  '100006436': 'MK GRUP 3 (KULIT)',                    // MK EKSIM BASAH (TANPA LUKA)
  '100006444': 'MK GRUP 3 (KULIT)',                    // MK EKSIM BASAH (LUKA)
  '100006451': 'MK GRUP 3 (KULIT)',                    // MK EKSIM KERING
  '100006469': 'MK GRUP 3 (KULIT)',                    // MK INFEKSI KULIT VIRUS
  '100006477': 'MK GRUP 3 (KULIT)',                    // MK PANU (TINEA VERSICOLOR)
  '100006485': 'MK GRUP 3 (KULIT)',                    // MK KADAS (TINEA CRURIS)
  '100006493': 'MK GRUP 3 (KULIT)',                    // MK KURAP (TINEA CORPORIS)
  '100006501': 'MK GRUP 3 (KULIT)',                    // MK LUKA INFEKSI RINGAN
  '100008465': 'MK GRUP 3 (KULIT)',                    // MK JERAWAT
  // GRUP 4 — Mata
  '100008481': 'MK GRUP 4 (MATA)',                     // MK MATA IRITASI
  '100008499': 'MK GRUP 4 (MATA)',                     // MK MATA ALERGI
  '100008507': 'MK GRUP 4 (MATA)',                     // MK MATA KERING
};

// ═══════════════════════════════════════════════════════════════
// MK FILE PARSER — Forward Fill + Subtotal filter
// ═══════════════════════════════════════════════════════════════

/**
 * Parse MK STORE REPORT Excel file.
 *
 * Format quirks:
 *   - Row 0-20: header/metadata (skip until we find "Date" column header)
 *   - Date col (0) and Store col (1) use merged cells → appear as "" in SheetJS
 *   - Rows where Store contains "Total" are subtotal rows → discard
 *   - Last rows: "Grand Total" row → discard
 *   - Col indices (0-based): Date=0, Store=1, SalesNo=2, SP=3, ItemCode=4, ItemName=5, Qty=6, NetSales=7
 *
 * @param {File} file
 * @returns {Promise<MKRow[]>}  clean transaction rows with storeCode, storeFull, itemCode, qty, netSales
 */
export async function parseMKFile(file) {
  const raw = await parseFileRaw(file);

  // Find header row — look for row containing "Date" AND "Store"
  let hi = 0;
  for (let i = 0; i < Math.min(raw.length, 30); i++) {
    const cells = raw[i].map((c) => String(c || '').trim().toLowerCase());
    if (cells.includes('date') && cells.includes('store')) { hi = i; break; }
  }

  const rows  = [];
  let lastDate  = '';
  let lastStore = '';  // "0001-JKJSTT1" — the raw store string

  for (let i = hi + 1; i < raw.length; i++) {
    const r = raw[i];

    // Forward fill: carry over last non-empty Date / Store
    if (String(r[0] || '').trim()) lastDate  = String(r[0]).trim();
    if (String(r[1] || '').trim()) lastStore = String(r[1]).trim();

    const store = lastStore;

    // Filter 1: discard subtotal rows (store contains "Total")
    if (store.toLowerCase().includes('total')) continue;

    // Filter 2: discard rows without a SalesNo (not real transactions)
    const salesNo = String(r[2] || '').trim();
    if (!salesNo) continue;

    const itemCode = String(r[4] || '').trim();
    if (!itemCode) continue;

    const qty      = parseFloat(r[6]) || 0;
    const netSales = parseFloat(r[7]) || 0;

    // Extract short code: "0001-JKJSTT1" → "JKJSTT1"
    const storeCode = extractCode(store);

    rows.push({
      date:      lastDate,
      storeFull: store,
      storeCode,
      salesNo,
      salesperson: String(r[3] || '').trim(),
      itemCode,
      itemName:  String(r[5] || '').trim(),
      qty,
      netSales,
    });
  }

  return rows;
}

/**
 * Aggregate MK rows into processed entries for 4 groups + 1 total.
 * Injects directly into result.processed — no new DB table needed.
 *
 * @param {MKRow[]} mkRows          — output of parseMKFile
 * @param {Object}  masterAM        — { [storeCode]: { storeName, category, amName, area } }
 * @returns {Object}                — { [MK_KEY]: CompetitionData }
 */
export function buildMKProcessed(mkRows, masterAM = {}) {
  const byGroup = {};
  const MK_KEYS = [
    'MK GRUP 1 (PERNAFASAN & PENCERNAAN)',
    'MK GRUP 2 (DEMAM & NYERI)',
    'MK GRUP 3 (KULIT)',
    'MK GRUP 4 (MATA)',
  ];
  MK_KEYS.forEach((k) => {
    byGroup[k] = {
      stores: {},   // storeCode → { code, name, category, am, area, qty, ns }
      sps:    {},   // spName → { name, store, storeCode, am, area, qty, ns }
      ams:    {},   // amName → { name, area, qty, ns }
    };
  });

  const totalByStore = {};
  const totalBySP    = {};
  const totalByAM    = {};

  // Build a set of all store codes for isStoreCodeSP filter
  const storeCodesSet = new Set(Object.keys(masterAM));

  mkRows.forEach((r) => {
    const grp = MK_ITEM_GROUP[r.itemCode];
    if (!grp) return;

    // Sanitized lookup: try exact storeCode first, then space-stripped, then shortCode
    const master = masterAM[r.storeCode]
      || masterAM[r.storeCode.replace(/\s+/g, '').toUpperCase()]
      || {};

    const storeName = master.storeName || r.storeFull;
    const category  = (master.category || '').toUpperCase();
    const amName    = master.amName || '';
    const area      = master.area   || '';
    const grpData   = byGroup[grp];

    // ── Store accumulation ──────────────────────────────────
    if (!grpData.stores[r.storeCode]) {
      grpData.stores[r.storeCode] = { code: r.storeCode, name: storeName, category, am: amName, area, qty: 0, ns: 0 };
    }
    grpData.stores[r.storeCode].qty += r.qty;
    grpData.stores[r.storeCode].ns  += r.netSales;

    // ── Total store accumulation ────────────────────────────
    if (!totalByStore[r.storeCode]) {
      totalByStore[r.storeCode] = { code: r.storeCode, name: storeName, category, am: amName, area, qty: 0, ns: 0 };
    }
    totalByStore[r.storeCode].qty += r.qty;
    totalByStore[r.storeCode].ns  += r.netSales;

    // ── Sales Person accumulation ───────────────────────────
    const sp = r.salesperson || '';
    // Exclude if SP looks like a store code (e.g. "JKJSTT1")
    const isStoreLike = !sp || isStoreCodeSP(sp, storeCodesSet);
    if (!isStoreLike) {
      const spKey = sp.trim().toUpperCase();

      if (!grpData.sps[spKey]) {
        grpData.sps[spKey] = { name: sp.trim(), store: storeName, storeCode: r.storeCode, am: amName, area, qty: 0, ns: 0, incentive: 0 };
      }
      grpData.sps[spKey].qty += r.qty;
      grpData.sps[spKey].ns  += r.netSales;

      if (!totalBySP[spKey]) {
        totalBySP[spKey] = { name: sp.trim(), store: storeName, storeCode: r.storeCode, am: amName, area, qty: 0, ns: 0, incentive: 0 };
      }
      totalBySP[spKey].qty += r.qty;
      totalBySP[spKey].ns  += r.netSales;
    }

    // ── AM accumulation ─────────────────────────────────────
    if (amName) {
      const amKey = amName.trim().toUpperCase();
      if (!grpData.ams[amKey]) {
        grpData.ams[amKey] = { name: amName, area, qty: 0, ns: 0 };
      }
      grpData.ams[amKey].qty += r.qty;
      grpData.ams[amKey].ns  += r.netSales;

      if (!totalByAM[amKey]) {
        totalByAM[amKey] = { name: amName, area, qty: 0, ns: 0 };
      }
      totalByAM[amKey].qty += r.qty;
      totalByAM[amKey].ns  += r.netSales;
    }
  });

  const mkProcessed = {};

  MK_KEYS.forEach((key) => {
    const g = byGroup[key];
    const storeLeader = Object.values(g.stores).sort((a, b) => b.qty - a.qty);
    const spLeader    = Object.values(g.sps).sort((a, b) => b.qty - a.qty);
    const amLeader    = Object.values(g.ams).sort((a, b) => b.qty - a.qty);
    mkProcessed[key] = {
      cfg:           COMPETITION_CFG[key] || {},
      totalNS:       storeLeader.reduce((s, r) => s + r.ns,  0),
      totalQty:      storeLeader.reduce((s, r) => s + r.qty, 0),
      storeLeader,
      spLeader,
      amLeader,
      ceLeaderboard:  [],
      itemBreakdown:  [],
      incentiveTotal: 0,
    };
  });

  const totalStoreLeader = Object.values(totalByStore).sort((a, b) => b.qty - a.qty);
  const totalSPLeader    = Object.values(totalBySP).sort((a, b) => b.qty - a.qty);
  const totalAMLeader    = Object.values(totalByAM).sort((a, b) => b.qty - a.qty);
  mkProcessed['MK TOTAL SALES'] = {
    cfg:           COMPETITION_CFG['MK TOTAL SALES'] || {},
    totalNS:       totalStoreLeader.reduce((s, r) => s + r.ns,  0),
    totalQty:      totalStoreLeader.reduce((s, r) => s + r.qty, 0),
    storeLeader:   totalStoreLeader,
    spLeader:      totalSPLeader,
    amLeader:      totalAMLeader,
    ceLeaderboard:  [],
    itemBreakdown:  [],
    incentiveTotal: 0,
  };

  return mkProcessed;
}


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
 * Returns map: { [ITEM_CODE]: { itemName, kompetisi, group } }
 * Required columns: ITEM CODE, KOMPETISI
 * Optional column:  GROUP DASHBOARD (col C) — used for nested tabs Level 1
 */
export async function parseListProduk(file) {
  const raw = await parseFileRaw(file);
  const hi  = findHdr(raw, 'ITEM CODE', 'item_code', 'KOMPETISI', 'Kompetisi');
  const hdrs = raw[hi].map((h) => String(h || '').trim());

  const iC = ci(hdrs, 'ITEM CODE', 'Item Code', 'ITEMCODE', 'code');
  const iN = ci(hdrs, 'ITEM NAME', 'Item Name', 'DESKRIPSI', 'Description', 'Name');
  const iK = ci(hdrs, 'KOMPETISI', 'Kompetisi', 'Competition');
  // GROUP DASHBOARD — optional col, gracefully missing
  const iG = ci(hdrs, 'GROUP DASHBOARD', 'GROUP', 'Group Dashboard', 'Group');

  const map = {};
  for (let i = hi + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const code = N(r[iC]);
    if (!code) continue;
    map[code] = {
      itemName:  String(r[iN] || '').trim(),
      kompetisi: N(r[iK]),
      group:     iG >= 0 ? String(r[iG] || '').trim().toUpperCase() || 'UMUM' : 'UMUM',
    };
  }
  return map;
}

/**
 * Build a 2-level hierarchy from listProduk for nested tabs.
 * Returns { [GROUP]: [kompetisiKey, ...] } — ordered by first appearance.
 * Falls back gracefully when group is missing (all items in 'UMUM').
 *
 * @param {Object} listProduk — result of parseListProduk
 * @returns {Object} groupedCompetitions
 */
export function buildGroupedCompetitions(listProduk) {
  const grouped = {};
  Object.values(listProduk).forEach(({ kompetisi, group }) => {
    if (!kompetisi) return;
    const g = group || 'UMUM';
    if (!grouped[g]) grouped[g] = [];
    if (!grouped[g].includes(kompetisi)) grouped[g].push(kompetisi);
  });
  return Object.keys(grouped).length ? grouped : null;
}

/**
 * Parse Master AM file.
 * Returns map: { [SHORT_CODE]: { storeName, category, amName, area } }
 * Required columns: Short Code, Category, AM Name, Area
 *
 * ANTI-DIRTY-DATA: Uses dual-key strategy.
 * Both "0001 - JKJSTT1" and "JKJSTT1" are stored → join never fails due to spacing.
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
    const rawCode = String(r[iC] || '').trim();
    if (!rawCode) continue;

    const entry = {
      storeName: String(r[iN]   || '').trim(),
      category:  N(r[iCat]),
      amName:    String(r[iAM]  || '').trim(),
      area:      String(r[iAr]  || '').trim(),
    };

    // Key 1: Normalized (spaces stripped) — catches "0001 - JKJSTT1" → "0001-JKJSTT1"
    const normalizedKey = rawCode.replace(/\s+/g, '').toUpperCase();
    map[normalizedKey] = entry;

    // Key 2: Short code extracted — catches "JKJSTT1" (what MK storeCode produces)
    const shortKey = extractCode(rawCode);
    if (shortKey && shortKey !== normalizedKey) {
      map[shortKey] = entry;
    }

    // Key 3: Original UPPER — belt-and-suspenders for exact match
    const upperKey = rawCode.toUpperCase();
    if (upperKey !== normalizedKey && upperKey !== shortKey) {
      map[upperKey] = entry;
    }
  }
  return map;
}

/**
 * Parse Master CE file.
 * Returns map: { [STORE_CODE_UPPER]: { ceName, team, outlet, am } }
 * Required columns: Store Code, Nama CE, Team
 * Optional: Outlet, Area Manager
 */
export async function parseMasterCE(file) {
  const raw  = await parseFileRaw(file);
  const hi   = findHdr(raw, 'Store Code', 'Nama CE', 'Team', 'CE');
  const hdrs = raw[hi].map((h) => String(h || '').trim());

  const iCode   = ci(hdrs, 'Store Code', 'StoreCode', 'Short Code', 'Kode Toko');
  const iCE     = ci(hdrs, 'Nama CE', 'CE Name', 'CE', 'Nama');
  const iTeam   = ci(hdrs, 'Team', 'Tim');
  const iOutlet = ci(hdrs, 'Outlet', 'Store', 'Toko');
  const iAM     = ci(hdrs, 'Area Manager', 'AM Name', 'AM');

  const map = {};
  for (let i = hi + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const code = N(r[iCode]);
    if (!code) continue;
    map[code] = {
      ceName:  String(r[iCE]     || '').trim(),
      team:    String(r[iTeam]   || '').trim(),
      outlet:  String(r[iOutlet] || '').trim(),
      am:      String(r[iAM]     || '').trim(),
    };
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════
// AGGREGATE ENGINE — pure, filter-safe, reusable
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregate one competition's enriched rows into leaderboard data.
 * Pure function — no side-effects. Safe to call from useMemo with filtered rows.
 *
 * @param {EnrichedRow[]} rows       — enriched rows for ONE competition (possibly pre-filtered)
 * @param {Object}        masterCE   — { [STORE_CODE]: { ceName, team } }
 * @param {Set}           storeCodesSet — set of store codes (for SP dedup)
 * @param {Object}        cfg        — COMPETITION_CFG[kompetisiKey]
 */
export function aggregateOneCompetition(rows, masterCE, storeCodesSet, cfg = {}) {
  const sc = storeCodesSet instanceof Set ? storeCodesSet
    : new Set(rows.map((r) => r.storeCode).filter(Boolean));

  const totalNS  = rows.reduce((s, r) => s + r.netSales, 0);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  // Store leaderboard
  const stM = {};
  rows.forEach((r) => {
    if (!stM[r.storeCode]) stM[r.storeCode] = {
      code: r.storeCode, name: r.storeName, category: r.category,
      am: r.amName, area: r.area, qty: 0, ns: 0,
    };
    stM[r.storeCode].qty += r.qty;
    stM[r.storeCode].ns  += r.netSales;
  });
  const storeLeader = Object.values(stM).sort((a, b) => {
    const ta = TIER_ORDER.indexOf(a.category) < 0 ? 99 : TIER_ORDER.indexOf(a.category);
    const tb = TIER_ORDER.indexOf(b.category) < 0 ? 99 : TIER_ORDER.indexOf(b.category);
    return ta !== tb ? ta - tb : b.ns - a.ns;
  });

  // Sales Person leaderboard
  const spM = {};
  rows.forEach((r) => {
    const sp = r.salesperson;
    if (isStoreCodeSP(sp, sc)) return;
    if (!spM[sp]) spM[sp] = {
      name: sp, qty: 0, ns: 0,
      store: r.storeName, storeCode: r.storeCode,
      am: r.amName, area: r.area, incentive: 0,
    };
    spM[sp].qty += r.qty;
    spM[sp].ns  += r.netSales;
    if (cfg.incentivePerQty && cfg.incentiveItems?.includes(r.item))
      spM[sp].incentive += r.qty * cfg.incentivePerQty;
  });
  const spLeader = Object.values(spM).sort((a, b) => b.ns - a.ns);

  // Area Manager leaderboard
  const amM = {};
  rows.forEach((r) => {
    if (!r.amName) return;
    if (!amM[r.amName]) amM[r.amName] = { name: r.amName, area: r.area, qty: 0, ns: 0 };
    amM[r.amName].qty += r.qty;
    amM[r.amName].ns  += r.netSales;
  });
  const amLeader = Object.values(amM).sort((a, b) => b.ns - a.ns);

  // CE leaderboard — reads ceName & team directly from enrichedRows
  // (tagged at ingest time, no external masterCE map needed)
  const ceM = {};
  rows.forEach((r) => {
    if (!r.ceName) return;
    const key = r.ceName.trim().toUpperCase();
    if (!ceM[key]) ceM[key] = { name: r.ceName.trim(), team: r.team || '—', qty: 0, ns: 0 };
    ceM[key].qty += r.qty;
    ceM[key].ns  += r.netSales;
  });
  const ceLeaderboard = Object.values(ceM).sort((a, b) => b.ns - a.ns);

  // Item breakdown
  const itM = {};
  rows.forEach((r) => {
    if (!itM[r.item]) itM[r.item] = { item: r.item, desc: r.itemName || r.itemDesc, qty: 0, ns: 0 };
    itM[r.item].qty += r.qty;
    itM[r.item].ns  += r.netSales;
  });
  const itemBreakdown = Object.values(itM).sort((a, b) => b.qty - a.qty);

  // Incentive total
  let incentiveTotal = 0;
  if (cfg.incentivePerQty && cfg.incentiveItems) {
    rows.forEach((r) => {
      if (cfg.incentiveItems.includes(r.item)) incentiveTotal += r.qty * cfg.incentivePerQty;
    });
  }

  return { cfg, totalNS, totalQty, storeLeader, spLeader, amLeader, ceLeaderboard, itemBreakdown, incentiveTotal };
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE — processTransactions
// ═══════════════════════════════════════════════════════════════

/**
 * Main pipeline. Enriches raw tx rows with amName & teamName, then
 * aggregates per competition for the initial (unfiltered) payload.
 *
 * @returns {{ processed, enrichedRows, availableAMs, availableTeams, matched, skipped }}
 *   - processed:     initial aggregation (unfiltered) — keyed by kompetisi
 *   - enrichedRows:  tagged rows — feed to DashboardPage for client-side re-aggregation
 *   - availableAMs:  sorted unique AM names for filter dropdown
 *   - availableTeams: sorted unique team names for filter dropdown
 */
export function processTransactions(allTx, listProduk, masterAM, masterCE = {}) {
  // Store-code set for SP dedup
  const storeCodesSet = new Set(allTx.map((r) => r.storeCode).filter(Boolean));
  allTx.forEach((r) => {
    const parts = r.storeRaw.split('-');
    if (parts.length >= 2) storeCodesSet.add(parts[parts.length - 1].trim().toUpperCase());
  });

  // Build SP name → { ceName, team } lookup from masterCE
  // Join key: salesperson name (TX) matches ceName (Master CE) — trim + uppercase
  const spCEMap = {};
  Object.values(masterCE).forEach(({ ceName, team }) => {
    if (ceName) spCEMap[ceName.trim().toUpperCase()] = { ceName: ceName.trim(), team: team || '' };
  });

  // JOIN: enrich + tag each row with amName, teamName, ceName, team
  let matched = 0, skipped = 0;
  const enrichedRows = [];

  allTx.forEach((r) => {
    const produk = listProduk[r.item];
    if (!produk) { skipped++; return; }

    const master  = masterAM[r.storeCode] || {};
    const spKey   = (r.salesperson || '').trim().toUpperCase();
    const ceEntry = spCEMap[spKey] || {};

    enrichedRows.push({
      ...r,
      storeName:  master.storeName || r.storeRaw,
      category:   master.category  || '',
      amName:     master.amName    || '',
      area:       master.area      || '',
      kompetisi:  produk.kompetisi,
      itemName:   produk.itemName  || r.itemDesc,
      teamName:   ceEntry.team  || '',   // ← global Team filter tag
      ceName:     ceEntry.ceName || '',  // ← CE leaderboard grouping key
      team:       ceEntry.team  || '',   // ← CE team label
    });
    matched++;
  });

  if (!enrichedRows.length) {
    throw new Error(
      `0 transaksi cocok kompetisi.\nBaris POS: ${allTx.length} · Produk terdaftar: ${Object.keys(listProduk).length}\n` +
      `Periksa apakah ITEM CODE di List Produk sesuai dengan kolom Item di template transaksi.`
    );
  }

  // Available filter options — derived from actual data, not static config
  const availableAMs   = [...new Set(enrichedRows.map((r) => r.amName).filter(Boolean))].sort();
  const availableTeams = [...new Set(enrichedRows.map((r) => r.teamName).filter(Boolean))].sort();

  // Initial aggregation (no filter) — group by kompetisi
  const byK = {};
  enrichedRows.forEach((r) => { (byK[r.kompetisi] = byK[r.kompetisi] || []).push(r); });

  const processed = {};
  Object.entries(byK).forEach(([k, rows]) => {
    const baseCfg = COMPETITION_CFG[k] || {};

    // Inject cfg.group from listProduk so nested tab hierarchy survives Supabase pull.
    // Find the first row's kompetisi entry in listProduk to get its group.
    const sampleItem = rows[0]?.item;
    const produkGroup = sampleItem ? listProduk[sampleItem]?.group : null;
    const cfg = produkGroup ? { ...baseCfg, group: produkGroup } : baseCfg;

    processed[k] = {
      ...aggregateOneCompetition(rows, masterCE, storeCodesSet, cfg),
      matchedCount: matched,
      skippedCount: skipped,
    };
  });

  return { processed, enrichedRows, availableAMs, availableTeams, matched, skipped };
}


// ═══════════════════════════════════════════════════════════════
// DYNAMIC COMPETITION CATALOG — derives tabs from actual data
// ═══════════════════════════════════════════════════════════════

/**
 * Build a dynamic competition catalog from processed data keys.
 * - Primary source: keys present in `processed` object (what's actually in the data).
 * - Metadata (label, color, periode, targets) pulled from COMPETITION_CFG when available.
 * - Unknown competitions get safe neutral defaults — never crashes.
 *
 * @param {Object} processed — result.processed from processTransactions
 * @returns {Object} competitionCatalog — same shape as COMPETITION_CFG, keyed by kompetisi name
 */
export function buildDynamicCompetitions(processed) {
  if (!processed || !Object.keys(processed).length) return COMPETITION_CFG;

  const FALLBACK_COLORS = [
    '#e11d48', '#0d9488', '#7c3aed', '#d97706', '#185FA5',
    '#378ADD', '#854F0B', '#16a34a', '#db2777', '#0891b2',
  ];

  const catalog = {};
  Object.keys(processed).forEach((key, idx) => {
    const existing = COMPETITION_CFG[key];
    catalog[key] = existing
      ? { ...existing }
      : {
          // Safe defaults for any new/unknown competition
          label:          key,
          color:          FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
          periode:        '',
          targetNetSales: 0,
          targetQty:      null,
        };
  });
  return catalog;
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
  return computeMetricsFromD(D);
}

/**
 * Compute KPI metrics directly from a (possibly filtered) competition data object.
 * Used by DashboardPage so all KPI cards, charts, progress bars, topStore, topAM
 * always reflect the active global filter (AM / Team).
 *
 * @param {CompetitionData} D — result of aggregateOneCompetition() or processed[k]
 * @returns {MetricsObject}
 */
export function computeMetricsFromD(D) {
  if (!D) return null;

  const { cfg = {}, totalNS, totalQty, storeLeader = [], amLeader = [], spLeader = [], itemBreakdown = [], incentiveTotal = 0 } = D;

  const targetSales = cfg.targetNetSales || 0;
  const targetQty   = cfg.targetQty      || 0;

  const pctSales = targetSales > 0
    ? +((totalNS  / targetSales) * 100).toFixed(1)
    : 0;
  const pctQty = targetQty > 0
    ? +((totalQty / targetQty)   * 100).toFixed(1)
    : 0;

  // Chart data — built from current D (respects filter)
  const storeChartData = [...storeLeader]
    .sort((a, b) => (b.ns || 0) - (a.ns || 0))
    .slice(0, 10)
    .map((s) => ({
      name:  (s.name || s.storeName || '').replace(/APOTEK ALPRO /i, '').replace(/ALPRO /i, '').slice(0, 16),
      sales: s.ns || 0,
    }));

  const amChartData = [...amLeader]
    .sort((a, b) => (b.ns || 0) - (a.ns || 0))
    .slice(0, 8)
    .map((a) => ({
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
    stores:        storeLeader,
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

/**
 * Download CE Leaderboard CSV
 */
export function downloadCECSV(compKey, D, periode = '') {
  const fname = `leaderboard_ce_${compKey.replace(/[^A-Z0-9]/gi, '_')}_${periode.replace(/[^A-Z0-9]/gi, '_') || 'all'}.csv`;
  const rows  = [['Rank', 'Nama CE', 'Team', 'Qty', 'Net Sales (Rp)']];
  (D.ceLeaderboard || []).forEach((ce, i) => {
    rows.push([i + 1, ce.name, ce.team || '—', Math.round(ce.qty), Math.round(ce.ns)]);
  });
  downloadCSV(rows, fname);
}
