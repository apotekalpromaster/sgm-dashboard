import * as XLSX from 'xlsx';
import { parseExcelDate } from '../utils/formatters.js';

/**
 * Parse a POS transaction XLSX/CSV file.
 * Returns { transactions: [], period: string|null }
 *
 * Tested against actual Alpro POS export (CONTOH TEMPLATE.xlsx):
 *   - Rows 0–4  : metadata (report title, company, date range, etc.)
 *   - Row 5     : header — No. | Company | (blank) | Store | Channel | Sales Person |
 *                           IC No. | Incentive Model | Item | Item Description |
 *                           Quantity Sold | Net Sales
 *   - Row 6+    : data rows
 *
 * Key quirks handled:
 *   - Store column: "0001 - JKJSTT1" → short code extracted after last " - "
 *   - Qty column  : "Quantity Sold" (not just "QTY")
 *   - Net Sales   : " Net Sales " (leading/trailing spaces)
 *   - Period D3   : "2026-04-01 to 2026-04-16" (date range string, not Excel serial)
 *   - Salesperson : "Sales Person" (two words with space)
 */
export const parseTransactionFile = (file, amMap, productMap, competitions) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // ---- Extract period from D3 ----
        const periodCell = ws['D3'] || ws['C3'] || ws['D2'] || ws['B3'];
        let period = null;
        if (periodCell) {
          const raw = String(periodCell.v || '').trim();
          period = (typeof periodCell.v === 'number') ? parseExcelDate(periodCell.v) : raw || null;
        }

        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

        // ---- Robust header detection: scan up to first 25 rows ----
        // Match row that contains at least 3 of these 5 canonical header keywords
        const HEADER_KEYWORDS = ['CHANNEL', 'ITEM', 'STORE', 'NET SALES', 'QUANTITY'];
        let headerIdx = -1;
        let headers   = [];

        for (let i = 0; i < Math.min(rows.length, 25); i++) {
          const normalized = rows[i].map((c) => String(c || '').trim().toUpperCase());
          const matchCount = HEADER_KEYWORDS.filter((kw) =>
            normalized.some((cell) => cell.includes(kw))
          ).length;

          if (matchCount >= 3) {
            headerIdx = i;
            headers   = normalized;
            break;
          }
        }

        if (headerIdx === -1) {
          throw new Error(
            'Baris header tidak ditemukan dalam 25 baris pertama. ' +
            'Pastikan file memiliki kolom: Channel, Item, Store, Net Sales, Quantity Sold.'
          );
        }

        // ---- Map header names to column indices ----
        const col = {
          channel:    headers.findIndex((h) => h.includes('CHANNEL')),
          // "ITEM" col = item code; exclude "ITEM DESCRIPTION"
          item:       headers.findIndex((h) => h === 'ITEM' || h === 'ITEM CODE' || (h.includes('ITEM') && !h.includes('DESCRIPTION') && !h.includes('DESC'))),
          itemDesc:   headers.findIndex((h) => h.includes('ITEM DESCRIPTION') || h.includes('DESCRIPTION')),
          // "STORE" col = "0001 - JKJSTT1" format
          store:      headers.findIndex((h) => h === 'STORE' || h === 'SHORT CODE' || (h.includes('STORE') && !h.includes('NAME'))),
          storeName:  headers.findIndex((h) => h.includes('STORE NAME') || h.includes('NAMA TOKO')),
          netSales:   headers.findIndex((h) => h.includes('NET SALES') || h.includes('NETSALES') || h.includes('PENJUALAN')),
          // "QUANTITY SOLD" — broader match than old "QTY"
          qty:        headers.findIndex((h) => h.includes('QUANTITY') || h === 'QTY' || (h.includes('QTY') && !h.includes('RETURN'))),
          // "SALES PERSON" (two words) — careful to exclude "NET SALES"
          salesperson:headers.findIndex((h) => h.includes('SALES PERSON') || h.includes('SALESPERSON') || (h.includes('SALES') && !h.includes('NET SALES'))),
          date:       headers.findIndex((h) => h.includes('DATE') || h.includes('TANGGAL')),
        };

        const transactions = [];
        let skippedNoChannel = 0;
        let skippedNoComp    = 0;

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every((c) => String(c).trim() === '')) continue;

          // ---- Filter 1: CHANNEL must be "POS" ----
          const channel = col.channel >= 0 ? String(row[col.channel] || '').trim().toUpperCase() : '';
          if (!channel.includes('POS')) { skippedNoChannel++; continue; }

          // ---- Extract fields ----
          const itemCode    = col.item       >= 0 ? String(row[col.item] || '').trim() : '';
          const storeRaw    = col.store      >= 0 ? String(row[col.store] || '').trim() : '';
          const storeCode   = extractShortCode(storeRaw);
          const netSales    = col.netSales   >= 0 ? parseNumeric(row[col.netSales])   : 0;
          const qty         = col.qty        >= 0 ? parseNumeric(row[col.qty])        : 0;
          const salesperson = col.salesperson >= 0 ? String(row[col.salesperson] || '').trim() : '';
          const txDate      = col.date       >= 0 ? String(row[col.date] || '').trim() : '';
          const itemDescRaw = col.itemDesc   >= 0 ? String(row[col.itemDesc] || '').trim() : '';

          // ---- Filter 2: Item must be in competition list ----
          const compKey = productMap[itemCode];
          if (!compKey) { skippedNoComp++; continue; }

          // ---- Join: Enrich with Master AM ----
          const storeMaster = amMap[storeCode] || fuzzyAmLookup(amMap, storeCode, storeRaw);

          // ---- Join: Item name ----
          const compItems = competitions[compKey]?.items || [];
          const product   = compItems.find((p) => p.itemCode === itemCode);

          transactions.push({
            competition: compKey,
            itemCode,
            itemName:    product?.itemName || itemDescRaw || itemCode,
            storeCode,
            storeName:   storeMaster?.storeName || storeRaw || storeCode,
            category:    storeMaster?.category  || 'UNKNOWN',
            am:          storeMaster?.am        || 'Unassigned',
            region:      storeMaster?.region    || '-',
            netSales:    isNaN(netSales) ? 0 : netSales,
            qty:         isNaN(qty)      ? 0 : qty,
            salesperson,
            date:        txDate,
          });
        }

        console.info(
          `[Parser] "${file.name}" | header@row${headerIdx} | ` +
          `data rows: ${rows.length - headerIdx - 1} | ` +
          `POS matches: ${transactions.length} | ` +
          `skipped (non-POS): ${skippedNoChannel} | skipped (not in complist): ${skippedNoComp}`
        );

        resolve({ transactions, period });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// ==================== INTERNAL HELPERS ====================

/**
 * Extracts short code from "0001 - JKJSTT1" → "JKJSTT1"
 * Falls back to full uppercased string if no " - " separator found.
 */
function extractShortCode(raw) {
  const upper = String(raw || '').trim().toUpperCase();
  const dashIdx = upper.lastIndexOf(' - ');
  if (dashIdx !== -1) return upper.slice(dashIdx + 3).trim();
  const parts = upper.split('-');
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return upper;
}

/**
 * Fuzzy AM map lookup when exact shortCode match fails.
 * Tries prefix match (first 4 chars) then company number match.
 */
function fuzzyAmLookup(amMap, shortCode, storeRaw) {
  if (!shortCode) return null;
  const prefix = shortCode.slice(0, 4);
  const matchKey = Object.keys(amMap).find((k) => k.startsWith(prefix));
  if (matchKey) return amMap[matchKey];

  const compCode = String(storeRaw || '').split('-')[0].trim();
  if (compCode) {
    const byComp = Object.keys(amMap).find((k) => k.includes(compCode));
    if (byComp) return amMap[byComp];
  }
  return null;
}

/**
 * Parse numeric string with thousand separators or spaces.
 * " 186,396.40 " → 186396.40  |  " 1.000000 " → 1.0
 */
function parseNumeric(raw) {
  return parseFloat(String(raw || '0').trim().replace(/[^0-9.-]/g, '')) || 0;
}

// ==================== AGGREGATION ENGINE ====================
/**
 * Groups transactions by [competition][storeCode] and computes totals.
 * Returns: { [compKey]: { [storeCode]: StoreAggregate } }
 */
export const aggregateTransactions = (transactions, competitions) => {
  const result = {};
  Object.keys(competitions).forEach((cKey) => { result[cKey] = {}; });

  transactions.forEach((tx) => {
    const cKey = tx.competition;
    if (!cKey || !result[cKey]) return;

    const sKey = tx.storeCode;
    if (!result[cKey][sKey]) {
      result[cKey][sKey] = {
        storeCode:    tx.storeCode,
        storeName:    tx.storeName,
        category:     tx.category,
        am:           tx.am,
        region:       tx.region,
        netSales:     0,
        qty:          0,
        txCount:      0,
        salespersons: {},
      };
    }

    result[cKey][sKey].netSales += tx.netSales;
    result[cKey][sKey].qty     += tx.qty;
    result[cKey][sKey].txCount += 1;

    if (tx.salesperson) {
      result[cKey][sKey].salespersons[tx.salesperson] =
        (result[cKey][sKey].salespersons[tx.salesperson] || 0) + tx.netSales;
    }
  });

  return result;
};

// ==================== METRICS CALCULATOR ====================
/**
 * Computes KPI metrics for a single competition from its aggregated data.
 */
export const computeMetrics = (compKey, aggregated, competitions) => {
  const stores     = Object.values(aggregated[compKey] || {});
  const rules      = competitions[compKey];
  const totalSales = stores.reduce((s, r) => s + r.netSales, 0);
  const totalQty   = stores.reduce((s, r) => s + r.qty, 0);
  const sorted     = [...stores].sort((a, b) => b.netSales - a.netSales);
  const topStore   = sorted[0] || null;

  const amAgg = stores.reduce((acc, s) => {
    if (!acc[s.am]) acc[s.am] = { am: s.am, netSales: 0, qty: 0, stores: 0 };
    acc[s.am].netSales += s.netSales;
    acc[s.am].qty      += s.qty;
    acc[s.am].stores   += 1;
    return acc;
  }, {});

  const topAMs = Object.values(amAgg).sort((a, b) => b.netSales - a.netSales);
  const topAM  = topAMs[0] || null;

  const spAgg = {};
  stores.forEach((s) => {
    Object.entries(s.salespersons || {}).forEach(([sp, sales]) => {
      spAgg[sp] = (spAgg[sp] || 0) + sales;
    });
  });
  const topSPs = Object.entries(spAgg)
    .sort((a, b) => b[1] - a[1])
    .map(([name, sales]) => ({ name, sales }));

  const targetQty   = rules?.target_qty       || 0;
  const targetSales = rules?.target_net_sales  || 0;

  return {
    totalSales,
    totalQty,
    stores: sorted,
    topStore,
    topAM,
    topAMs,
    topSPs,
    targetQty,
    targetSales,
    pctQty:   targetQty   > 0 ? Math.min(((totalQty   / targetQty)   * 100).toFixed(1), 9999) : 0,
    pctSales: targetSales > 0 ? Math.min(((totalSales / targetSales) * 100).toFixed(1), 9999) : 0,
  };
};
