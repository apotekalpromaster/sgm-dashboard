// ==================== FORMATTING ====================
export const formatRupiah = (n) => {
  if (n === undefined || n === null || isNaN(n)) return 'Rp 0';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  return `Rp ${Number(n).toLocaleString('id-ID')}`;
};

export const formatNum = (n) => Number(n || 0).toLocaleString('id-ID');

// ==================== PERCENTAGE HELPERS ====================
export const pct = (v, t) => (t > 0 ? Math.min(((v / t) * 100).toFixed(1), 9999) : 0);

export const pctColor = (p) => {
  if (p >= 100) return 'green';
  if (p >= 60) return 'amber';
  return 'red';
};

// ==================== RANK HELPERS ====================
export const getRankBadgeClass = (i) => {
  if (i === 0) return 'rank-1';
  if (i === 1) return 'rank-2';
  if (i === 2) return 'rank-3';
  return 'rank-n';
};

export const getRankEmoji = (i) => {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return String(i + 1);
};

// ==================== DATE HELPERS ====================
export const parseExcelDate = (s) => {
  if (!s) return null;
  if (typeof s === 'number') {
    const d = new Date((s - 25569) * 86400 * 1000);
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
  }
  return String(s);
};
