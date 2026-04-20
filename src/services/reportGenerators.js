import { formatRupiah, formatNum, getRankEmoji } from '../utils/formatters.js';

/**
 * Generates a WhatsApp-ready report string for the active competition.
 * Format: bold markers (*text*), emoji, clean structure.
 */
export const generateWAReport = (metrics, rules, activeComp) => {
  const now = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const topStores = metrics.stores.slice(0, 5);

  const lines = [
    `*🏆 UPDATE CAPAIAN KOMPETISI ${rules.name.toUpperCase()}*`,
    `📅 Periode: ${rules.period}`,
    `🗓 Per tanggal: ${now}`,
    ``,
    `*📊 PERFORMA NASIONAL*`,
    `• Total Net Sales: *${formatRupiah(metrics.totalSales)}* (${metrics.pctSales}% dari target)`,
    `• Total Qty: *${formatNum(metrics.totalQty)} pcs* (${metrics.pctQty}% dari target ${formatNum(metrics.targetQty)} pcs)`,
    ``,
    `*🥇 TOP 5 TOKO*`,
    ...topStores.map((s, i) =>
      `${getRankEmoji(i)} ${s.storeName} — ${formatRupiah(s.netSales)} (${s.qty} pcs)`
    ),
    ``,
    `*👤 TOP AREA MANAGER*`,
    ...metrics.topAMs.slice(0, 3).map((a, i) =>
      `${getRankEmoji(i)} ${a.am} ${formatRupiah(a.netSales)}`
    ),
    ``,
    `_Yuk semangat kejar target! Ada yang butuh support? DM Admin. 💪_`,
    ``,
    `#AlproOperation #SGMReport`,
  ];

  return lines.join('\n');
};

/**
 * Generates a formal Board of Directors report string.
 * Includes AI-generated strategic recommendations.
 */
export const generateBoDReport = (metrics, rules) => {
  const now = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const topStores = metrics.stores.slice(0, 10);

  const aiInsights = [
    `• Konsentrasi penjualan masih terpusat di toko-toko TITANIUM & PLATINUM. Rekomendasi: lakukan program PUSH khusus untuk toko kategori SILVER & BRONZE yang memiliki potensi volume signifikan.`,
    `• Area ${metrics.topAM?.am || '-'} menunjukkan konsistensi performa tertinggi. Jadikan strategi dan execution di area ini sebagai template best practice yang dapat direplikasi ke area lain.`,
    `• Progress ${metrics.pctQty}% dari target qty menunjukkan ${
      metrics.pctQty >= 70
        ? 'laju yang sehat. Pertahankan momentum dengan aktivasi promotion point-of-sale di toko-toko tertinggal.'
        : 'perlunya akselerasi segera. Rekomendasikan flash promo / bundling campaign dalam 2 minggu ke depan untuk menutup gap.'
    }`,
    `• Pantau aktivasi display produk secara berkala. Pastikan produk mudah dijangkau dan terlihat oleh pelanggan di semua gerai aktif kompetisi.`,
  ];

  const sep = '━'.repeat(42);

  const lines = [
    sep,
    `📋 LAPORAN CAPAIAN KOMPETISI — DIREKSI`,
    sep,
    ``,
    `Update Capaian Kompetisi : ${rules.name}`,
    `Periode                  : ${rules.period}`,
    `Per Tanggal              : ${now}`,
    ``,
    sep,
    `I. PERFORMA PENJUALAN NASIONAL`,
    sep,
    ``,
    `  Metrik               Actual             Target             Progress`,
    `  Net Sales        ${formatRupiah(metrics.totalSales).padEnd(19)} ${formatRupiah(metrics.targetSales).padEnd(19)} ${metrics.pctSales}%`,
    `  Qty Terjual      ${formatNum(metrics.totalQty).padEnd(19)} ${formatNum(metrics.targetQty).padEnd(19)} ${metrics.pctQty}%`,
    `  Toko Aktif       ${metrics.stores.length}`,
    ``,
    sep,
    `II. LEADERBOARD TOKO SEMENTARA (TOP 10)`,
    sep,
    ``,
    `  #   Nama Toko                       Tier        Qty    Net Sales           AM`,
    `  ─── ──────────────────────────── ─────────── ────── ─────────────────── ──────────────`,
    ...topStores.map((s, i) =>
      `  ${String(i + 1).padStart(2)}  ${s.storeName.slice(0, 30).padEnd(30)} ${s.category.padEnd(11)} ${String(s.qty).padEnd(6)} ${formatRupiah(s.netSales).padEnd(19)} ${s.am}`
    ),
    ``,
    sep,
    `III. HIGHLIGHT PERFORMA AREA MANAGER`,
    sep,
    ``,
    `  #   Area Manager           Toko Aktif   Qty Total   Net Sales`,
    `  ─── ─────────────────────── ──────────── ─────────── ───────────────`,
    ...metrics.topAMs.slice(0, 8).map((a, i) =>
      `  ${String(i + 1).padStart(2)}  ${a.am.padEnd(23)} ${String(a.stores).padEnd(12)} ${String(a.qty).padEnd(11)} ${formatRupiah(a.netSales)}`
    ),
    ``,
    ...(metrics.topSPs.length > 0
      ? [
          sep,
          `IV. HIGHLIGHT PERFORMA SALESPERSON`,
          sep,
          ``,
          ...metrics.topSPs.slice(0, 5).map((s, i) =>
            `  ${getRankEmoji(i)} ${s.name.padEnd(26)} ${formatRupiah(s.sales)}`
          ),
          ``,
        ]
      : []),
    sep,
    `V. CATATAN PENTING & REKOMENDASI STRATEGI`,
    sep,
    ``,
    ...aiInsights.map((l) => `  ${l}`),
    ``,
    sep,
    `Disiapkan oleh : Sistem SGM Competition Engine | Alpro`,
    `Tanggal Laporan: ${now}`,
    sep,
  ];

  return lines.join('\n');
};
