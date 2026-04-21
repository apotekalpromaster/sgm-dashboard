import { formatRupiah, formatNum, getRankEmoji } from '../utils/formatters.js';

// ── Safe accessors for v3 data structure ──────────────────────
const storeName  = (s) => (s?.name  || s?.storeName  || '').replace(/ALPRO /i, '') || '—';
const storeNS    = (s) =>  s?.ns    ?? s?.netSales   ?? 0;
const storeCat   = (s) =>  s?.category || '—';
const storeAM    = (s) =>  s?.am    || '—';
const storeQty   = (s) =>  s?.qty   || 0;
const amName     = (a) =>  a?.name  || a?.am         || '—';
const amNS       = (a) =>  a?.ns    ?? a?.netSales   ?? 0;
const amQty      = (a) =>  a?.qty   || 0;
const spName     = (sp) => sp?.name || '—';
const spNS       = (sp) => sp?.ns   ?? sp?.netSales  ?? 0;
const spInc      = (sp) => sp?.incentive || 0;

// ═══════════════════════════════════════════════════════════════
// WA REPORT — identik logika genWA() dari v3 HTML
// ═══════════════════════════════════════════════════════════════
export const generateWAReport = (metrics, cfg, activeComp) => {
  const now = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const lbl  = cfg.label || activeComp;
  const per  = cfg.periode || '—';
  const tNS  = cfg.targetNetSales || 0;
  const tQ   = cfg.targetQty      || 0;
  const pNS  = tNS > 0 ? Math.round((metrics.totalSales / tNS) * 100) : null;
  const pQ   = tQ  > 0 ? Math.round((metrics.totalQty  / tQ ) * 100) : null;

  const stores = (metrics.stores || []);
  const ams    = (metrics.topAMs || []);
  const sps    = (metrics.topSPs || []);

  const stLn = stores.slice(0, 3).map((s, i) =>
    `   ${['🥇', '🥈', '🥉'][i]} ${storeName(s)} (${storeCat(s)}) — ${formatRupiah(storeNS(s))}`
  ).join('\n');

  const spLn = sps.slice(0, 3).map((sp, i) =>
    `   ${['🥇', '🥈', '🥉'][i]} ${spName(sp)} — ${formatRupiah(spNS(sp))}`
  ).join('\n');

  const amLn = ams.slice(0, 3).map((a, i) =>
    `   ${['🥇', '🥈', '🥉'][i]} ${amName(a)} (${a?.area || '—'}) — ${formatRupiah(amNS(a))}`
  ).join('\n');

  const note =
    metrics.totalSales < tNS * 0.5
      ? '⚠️ Progress masih di bawah 50%. Fokus push produk utama dan edukasi customer!'
    : metrics.totalSales >= tNS * 0.8
      ? '✅ Progress sangat baik! Pertahankan dan pastikan semua toko lolos qty minimum!'
      : '🔥 Momentum bagus! Pastikan setiap store amankan BASELINE qty minimum!';

  const incentiveLine =
    metrics.incentiveTotal > 0
      ? `\n• Est. Insentif Staf : *${formatRupiah(metrics.incentiveTotal)}*`
      : '';

  return `🚀 *[UPDATE PROGRESS] KOMPETISI ${lbl.toUpperCase()} (${per})* 🚀

Halo Alproeans! 🔥 Update klasemen sementara kompetisi *${lbl}*!

📊 *PERFORMA PENJUALAN NASIONAL*
• Total Net Sales  : *${formatRupiah(metrics.totalSales)}*${pNS !== null ? ` (${pNS}% dari target ${formatRupiah(tNS)})` : ''}
• Total Qty Terjual: *${formatNum(metrics.totalQty)} pcs*${pQ !== null ? ` (${pQ}% dari target ${formatNum(tQ)} pcs)` : ''}${incentiveLine}

🏪 *LEADERBOARD TOKO SEMENTARA*
${stLn || '   (Belum ada data)'}

💪 *HIGHLIGHT SALES PERSON*
${spLn || '   (Belum ada data)'}

${ams.length ? `👔 *HIGHLIGHT AREA MANAGER*\n${amLn}\n\n` : ''}${note}

*"Yang menang bukan cuma yang ikut, tapi yang PUSH lebih dari minimum!"* 💪
Ayo gas terus dan raih reward jutaan rupiah! Semangat Alproeans! ✊💊

_Powered by SGM Alpro Indonesia, 2026_
_Per tanggal: ${now}_`;
};

// ═══════════════════════════════════════════════════════════════
// BOD REPORT — formal direksi format
// ═══════════════════════════════════════════════════════════════
export const generateBoDReport = (metrics, cfg) => {
  const now = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const lbl     = cfg.label    || '—';
  const per     = cfg.periode  || '—';
  const tNS     = cfg.targetNetSales || 0;
  const tQ      = cfg.targetQty      || 0;
  const pNS     = tNS > 0 ? Math.round((metrics.totalSales / tNS) * 100) : null;
  const pQ      = tQ  > 0 ? Math.round((metrics.totalQty  / tQ ) * 100) : null;
  const topAMn  = amName(metrics.topAM);

  const stores = (metrics.stores || []).slice(0, 10);
  const ams    = (metrics.topAMs || []).slice(0, 8);
  const sps    = (metrics.topSPs || []).slice(0, 5);

  const aiInsights = [
    `• Konsentrasi penjualan masih terpusat di toko-toko TITANIUM & PLATINUM. Rekomendasi: lakukan program PUSH khusus untuk toko kategori SILVER & BRONZE yang memiliki potensi volume signifikan.`,
    `• Area ${topAMn} menunjukkan konsistensi performa tertinggi. Jadikan strategi dan execution di area ini sebagai template best practice yang dapat direplikasi ke area lain.`,
    `• Progress ${pQ !== null ? pQ + '%' : '—'} dari target qty menunjukkan ${
      (pQ ?? 0) >= 70
        ? 'laju yang sehat. Pertahankan momentum dengan aktivasi promotion point-of-sale di toko-toko tertinggal.'
        : 'perlunya akselerasi segera. Rekomendasikan flash promo / bundling campaign dalam 2 minggu ke depan untuk menutup gap.'
    }`,
    `• Pantau aktivasi display produk secara berkala. Pastikan produk mudah dijangkau dan terlihat oleh pelanggan di semua gerai aktif kompetisi.`,
  ];

  if (metrics.incentiveTotal > 0) {
    aiInsights.push(
      `• Est. total insentif staf Rp ${formatRupiah(metrics.incentiveTotal)} — pastikan distribusi insentif dimonitor untuk menjaga motivasi tim sales.`
    );
  }

  const sep = '━'.repeat(54);
  const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);

  const lines = [
    sep,
    `  📋 LAPORAN CAPAIAN KOMPETISI — DIREKSI`,
    sep,
    ``,
    `  Kompetisi  : ${lbl}`,
    `  Periode    : ${per}`,
    `  Per tanggal: ${now}`,
    ``,
    sep,
    `  I. PERFORMA PENJUALAN NASIONAL`,
    sep,
    ``,
    `  Metrik           Aktual               Target               Progress`,
    `  ───────────────  ───────────────────  ───────────────────  ──────────`,
    `  Net Sales        ${pad(formatRupiah(metrics.totalSales), 21)}${pad(tNS > 0 ? formatRupiah(tNS) : '—', 21)}${pNS !== null ? pNS + '%' : '—'}`,
    `  Qty Terjual      ${pad(formatNum(metrics.totalQty) + ' pcs', 21)}${pad(tQ > 0 ? formatNum(tQ) + ' pcs' : '—', 21)}${pQ !== null ? pQ + '%' : '—'}`,
    `  Toko Aktif       ${metrics.storeCount || (metrics.stores || []).length}`,
    `  AM Aktif         ${metrics.amCount || (metrics.topAMs || []).length}`,
    ...(metrics.incentiveTotal > 0
      ? [`  Est. Insentif    ${formatRupiah(metrics.incentiveTotal)}`]
      : []),
    ``,
    sep,
    `  II. LEADERBOARD TOKO SEMENTARA (TOP 10)`,
    sep,
    ``,
    `  #   Nama Toko                          Tier         Qty     Net Sales               AM`,
    `  ─── ─────────────────────────────────  ──────────── ─────── ──────────────────────  ──────────────────`,
    ...stores.map((s, i) =>
      `  ${pad(i + 1, 3)} ${pad(storeName(s), 35)} ${pad(storeCat(s), 12)} ${pad(Math.round(storeQty(s)), 7)} ${pad(formatRupiah(storeNS(s)), 22)}  ${storeAM(s)}`
    ),
    ``,
    sep,
    `  III. HIGHLIGHT PERFORMA AREA MANAGER`,
    sep,
    ``,
    `  #   Area Manager                   Qty Total    Net Sales`,
    `  ─── ─────────────────────────────  ───────────  ───────────────────`,
    ...ams.map((a, i) =>
      `  ${pad(i + 1, 3)} ${pad(amName(a), 31)}  ${pad(Math.round(amQty(a)), 11)}  ${formatRupiah(amNS(a))}`
    ),
    ``,
    ...(sps.length > 0
      ? [
          sep,
          `  IV. HIGHLIGHT PERFORMA SALESPERSON`,
          sep,
          ``,
          `  #   Sales Person                       Net Sales              Est. Insentif`,
          `  ─── ─────────────────────────────────  ─────────────────────  ───────────────────`,
          ...sps.map((sp, i) =>
            `  ${pad(i + 1, 3)} ${pad(spName(sp), 35)}  ${pad(formatRupiah(spNS(sp)), 21)}  ${spInc(sp) > 0 ? formatRupiah(spInc(sp)) : '—'}`
          ),
          ``,
        ]
      : []),
    sep,
    `  V. CATATAN PENTING & REKOMENDASI STRATEGI`,
    sep,
    ``,
    ...aiInsights.map((l) => `  ${l}`),
    ``,
    sep,
    `  Disiapkan oleh : Sistem SGM Competition Engine | Alpro`,
    `  Tanggal Laporan: ${now}`,
    sep,
  ];

  return lines.join('\n');
};
