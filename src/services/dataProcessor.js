import * as XLSX from 'xlsx';
import { parseExcelDate } from '../utils/formatters.js';

/**
 * Parse a POS transaction XLSX/CSV file.
 * Returns { transactions: [], period: string|null }
 *
 * Filtering rules:
 *   1. Only rows where CHANNEL column contains "POS"
 *   2. Only rows where ITEM CODE is in productMap (competition list)
 *   3. Joins with amMap to enrich store data (AM name, tier, region)
 */
export const parseTransactionFile = (file, amMap, productMap, competitions) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // Try to extract period from D3 (per spec: "Lihat kolom D3 untuk periode")
        const periodCell = ws['D3'] || ws['C3'] || ws['D2'];
        const period = periodCell ? parseExcelDate(periodCell.v) : null;

        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

        // ---- Auto-detect header row (scan first 15 rows) ----
        let headerIdx = -1;
        let headers = [];

        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i].map((c) => String(c || '').trim().toUpperCase());
          if (row.some((c) => c === 'CHANNEL' || c === 'ITEM' || c === 'STORE' || c === 'NET SALES')) {
            headerIdx = i;
            headers = row;
            break;
          }
        }

        // Fallback: row 7 (common Alpro POS template layout)
        if (headerIdx === -1) {
          headerIdx = 7;
          headers = rows[7] ? rows[7].map((c) => String(c || '').trim().toUpperCase()) : [];
        }

        // ---- Map column names to indices ----
        const col = {
          channel:    headers.findIndex((h) => h.includes('CHANNEL')),
          item:       headers.findIndex((h) => h === 'ITEM' || h === 'ITEM CODE' || h.includes('ITEM CODE') || h === 'KODE ITEM'),
          store:      headers.findIndex((h) => h === 'STORE' || h === 'SHORT CODE' || h === 'KODE TOKO' || h.includes('STORE CODE')),
          storeName:  headers.findIndex((h) => h.includes('STORE NAME') || h.includes('NAMA TOKO')),
          netSales:   headers.findIndex((h) => h.includes('NET SALES') || h.includes('NETSALES') || h.includes('PENJUALAN')),
          qty:        headers.findIndex((h) => h === 'QTY' || h === 'QUANTITY' || h.includes('QTY') || h.includes('JUMLAH')),
          salesperson:headers.findIndex((h) => (h.includes('SALES') && !h.includes('NET SALES')) || h.includes('SP ')),
          date:       headers.findIndex((h) => h.includes('DATE') || h.includes('TANGGAL')),
        };

        const transactions = [];

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every((c) => !c)) continue;

          // ---- Step 1 Filter: CHANNEL must contain "POS" ----
          const channel = col.channel >= 0 ? String(row[col.channel] || '').trim().toUpperCase() : '';
          if (!channel.includes('POS')) continue;

          const itemCode   = col.item      >= 0 ? String(row[col.item] || '').trim() : '';
          const storeCode  = col.store     >= 0 ? String(row[col.store] || '').trim().toUpperCase() : '';
          const netSales   = col.netSales  >= 0 ? parseFloat(String(row[col.netSales] || '0').replace(/[^0-9.-]/g, '')) : 0;
          const qty        = col.qty       >= 0 ? parseFloat(String(row[col.qty] || '0').replace(/[^0-9.-]/g, '')) : 0;
          const salesperson= col.salesperson >= 0 ? String(row[col.salesperson] || '').trim() : '';
          const txDate     = col.date      >= 0 ? String(row[col.date] || '').trim() : '';

          // ---- Step 2 Filter: Item must be in competition list ----
          const compKey = productMap[itemCode];
          if (!compKey) continue;

          // ---- Step 2 Join: Enrich with Master AM data ----
          const storeMaster =
            amMap[storeCode] ||
            amMap[Object.keys(amMap).find((k) => k.startsWith(storeCode.slice(0, 3))) || ''];

          const fallbackStoreName =
            col.storeName >= 0 ? String(row[col.storeName] || '').trim() : storeCode;

          const compItems = competitions[compKey]?.items || [];
          const product   = compItems.find((p) => p.itemCode === itemCode);

          transactions.push({
            competition: compKey,
            itemCode,
            itemName:    product?.itemName || itemCode,
            storeCode,
            storeName:   storeMaster?.storeName || fallbackStoreName,
            category:    storeMaster?.category  || 'BRONZE',
            am:          storeMaster?.am        || 'Unassigned',
            region:      storeMaster?.region    || '-',
            netSales:    isNaN(netSales) ? 0 : netSales,
            qty:         isNaN(qty) ? 0 : qty,
            salesperson,
            date:        txDate,
          });
        }

        resolve({ transactions, period });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// ==================== AGGREGATION ENGINE ====================
/**
 * Groups transactions by [competition][storeCode] and computes totals.
 * Returns a nested object: { [compKey]: { [storeCode]: StoreAggregate } }
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
        storeCode:   tx.storeCode,
        storeName:   tx.storeName,
        category:    tx.category,
        am:          tx.am,
        region:      tx.region,
        netSales:    0,
        qty:         0,
        txCount:     0,
        salespersons:{},
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
  const stores   = Object.values(aggregated[compKey] || {});
  const rules    = competitions[compKey];
  const totalSales = stores.reduce((s, r) => s + r.netSales, 0);
  const totalQty   = stores.reduce((s, r) => s + r.qty, 0);
  const sorted     = [...stores].sort((a, b) => b.netSales - a.netSales);
  const topStore   = sorted[0] || null;

  // Area Manager aggregation
  const amAgg = stores.reduce((acc, s) => {
    if (!acc[s.am]) acc[s.am] = { am: s.am, netSales: 0, qty: 0, stores: 0 };
    acc[s.am].netSales += s.netSales;
    acc[s.am].qty      += s.qty;
    acc[s.am].stores   += 1;
    return acc;
  }, {});

  const topAMs = Object.values(amAgg).sort((a, b) => b.netSales - a.netSales);
  const topAM  = topAMs[0] || null;

  // Salesperson aggregation
  const spAgg = {};
  stores.forEach((s) => {
    Object.entries(s.salespersons || {}).forEach(([sp, sales]) => {
      spAgg[sp] = (spAgg[sp] || 0) + sales;
    });
  });
  const topSPs = Object.entries(spAgg)
    .sort((a, b) => b[1] - a[1])
    .map(([name, sales]) => ({ name, sales }));

  const targetQty   = rules?.target_qty || 0;
  const targetSales = rules?.target_net_sales || 0;

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
