import { useMemo, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  formatRupiah, formatNum, pct, pctColor, getRankBadgeClass, getRankEmoji,
} from '../utils/formatters.js';
import {
  computeMetrics, isQualified, TIER_ORDER,
  downloadStoreCSV, downloadSPCSV, downloadAMCSV,
} from '../services/dataProcessor.js';

// ═══════════════════════════════════════════════════════════════
// COMPETITION TABS
// ═══════════════════════════════════════════════════════════════
function CompTabs({ competitions, activeComp, setActiveComp }) {
  return (
    <div className="comp-tabs">
      {Object.entries(competitions).map(([key, comp]) => (
        <button
          key={key}
          className={`comp-tab ${activeComp === key ? 'active' : ''}`}
          onClick={() => setActiveComp(key)}
        >
          {comp.label || key}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════
function KpiCard({ color, icon, label, value, sub, progress, target }) {
  const p = Number(progress);
  const c = pctColor(p);
  return (
    <div className={`kpi-card ${color}`}>
      <div className={`kpi-icon ${color}`}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {progress !== undefined && (
        <div className="kpi-sub" style={{ marginTop: 6 }}>
          <div className="progress-bar-wrap">
            <div className="progress-bar-track" style={{ height: 5 }}>
              <div className={`progress-bar-fill ${c}`} style={{ width: `${Math.min(p, 100)}%` }} />
            </div>
            <span className={`progress-pct ${c}`}>{p}%</span>
          </div>
        </div>
      )}
      {target && <div className="kpi-sub" style={{ marginTop: 2, fontSize: 10 }}>Target: {target}</div>}
      {sub && !target && <div className="kpi-sub" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════════════════
function StoresChart({ stores = [] }) {
  // Normalize: v3 uses s.name + s.ns; fallback to legacy s.storeName + s.netSales
  const data = (stores || []).slice(0, 10).map((s) => ({
    name:  (s?.name || s?.storeName || '').replace(/APOTEK ALPRO /i, '').replace(/ALPRO /i, '').slice(0, 16),
    sales: Math.round((s?.ns ?? s?.netSales ?? 0) / 1_000_000),
    ns:    s?.ns    ?? s?.netSales ?? 0,
  }));

  const colors = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#a7f3d0', '#ccfbf1'];

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <div className="empty-icon" style={{ fontSize: 28 }}>📊</div>
        <p style={{ fontSize: 13 }}>Belum ada data toko untuk kompetisi ini</p>
      </div>
    );
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 46 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : `${v}jt`}
          />
          <Tooltip
            formatter={(v, name, props) => [`Rp ${props.payload.ns.toLocaleString('id-ID')}`, 'Net Sales']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            labelStyle={{ fontWeight: 700, color: '#1e293b' }}
          />
          <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => <Cell key={i} fill={colors[Math.min(i, colors.length - 1)]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AMChart({ topAMs = [] }) {
  const data = (topAMs || []).slice(0, 8).map((a) => {
    const name = (a?.name || a?.am || 'Unknown');
    return {
      name:  name.split(' ').slice(0, 2).join(' '),  // first 2 words
      sales: Math.round((a?.ns ?? a?.netSales ?? 0) / 1_000_000),
      ns:    a?.ns ?? a?.netSales ?? 0,
    };
  });

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <div className="empty-icon" style={{ fontSize: 28 }}>📊</div>
        <p>Upload data dengan Master AM untuk melihat performa AM</p>
      </div>
    );
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 50, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <Tooltip
            formatter={(v) => [`Rp ${v}jt`, 'Net Sales']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="sales" fill="#4f46e5" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODAL "LIHAT SEMUA"
// ═══════════════════════════════════════════════════════════════
function FullListModal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px', overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 960,
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
              color: '#94a3b8', lineHeight: 1, padding: 4,
            }}
          >✕</button>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '75vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STORE LEADERBOARD TABLE
// ═══════════════════════════════════════════════════════════════
function StoreTable({ rows, rules }) {
  return (
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>#</th>
          <th>Nama Toko</th>
          <th>Tier</th>
          <th>AM</th>
          <th>Area</th>
          <th style={{ textAlign: 'right' }}>Qty</th>
          <th style={{ textAlign: 'right' }}>Min</th>
          <th style={{ textAlign: 'right' }}>Status</th>
          <th style={{ textAlign: 'right' }}>Net Sales</th>
        </tr>
      </thead>
      <tbody>
        {(rows || []).map((row, i) => {
          const tn   = rules?.tiers?.[row.category] || 0;
          const qMin = rules?.qtyMin?.[tn] || 0;
          const qual = !qMin || row.qty >= qMin;
          return (
            <tr key={`${row.code || row.storeCode}-${i}`}>
              <td><span className={`rank-badge ${getRankBadgeClass(i)}`}>{getRankEmoji(i)}</span></td>
              <td>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name || row.storeName}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.code || row.storeCode}</div>
              </td>
              <td><span className={`tier-badge tier-${row.category}`}>{row.category || '—'}</span></td>
              <td style={{ fontSize: 12 }}>{row.am || '—'}</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.area || '—'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatNum(row.qty)}</td>
              <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{qMin || '—'}</td>
              <td style={{ textAlign: 'right' }}>
                {qMin > 0 ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: qual ? '#dcfce7' : '#ffe4e6',
                    color: qual ? '#15803d' : '#e11d48',
                  }}>
                    {qual ? '✓ OK' : `✗ min ${qMin}`}
                  </span>
                ) : '—'}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(row.ns ?? row.netSales)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ═══════════════════════════════════════════════════════════════
// SALES PERSON TABLE
// ═══════════════════════════════════════════════════════════════
function SPTable({ rows, showIncentive }) {
  return (
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>#</th>
          <th>Sales Person</th>
          <th>Toko</th>
          <th>Area Manager</th>
          <th style={{ textAlign: 'right' }}>Qty</th>
          <th style={{ textAlign: 'right' }}>Net Sales</th>
          {showIncentive && <th style={{ textAlign: 'right' }}>Est. Insentif</th>}
        </tr>
      </thead>
      <tbody>
        {(rows || []).length === 0 ? (
          <tr>
            <td colSpan={showIncentive ? 7 : 6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              Tidak ada data Sales Person (kolom kosong atau semua difilter sebagai kode toko)
            </td>
          </tr>
        ) : (
          (rows || []).map((sp, i) => (
            <tr key={`${sp.name}-${i}`}>
              <td><span className={`rank-badge ${getRankBadgeClass(i)}`}>{getRankEmoji(i)}</span></td>
              <td style={{ fontWeight: 600, fontSize: 13 }}>{sp.name}</td>
              <td>
                <div style={{ fontSize: 12 }}>{sp.store || '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sp.storeCode || ''}</div>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sp.am || '—'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatNum(sp.qty)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(sp.ns)}</td>
              {showIncentive && (
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                  {sp.incentive > 0 ? formatRupiah(sp.incentive) : '—'}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION HEADER (with CSV button and "Lihat Semua")
// ═══════════════════════════════════════════════════════════════
function SectionHeader({ title, sub, count, onShowAll, onDownloadCSV }) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {onDownloadCSV && (
          <button className="btn btn-outline btn-sm" onClick={onDownloadCSV}>
            ⬇ CSV
          </button>
        )}
        {onShowAll && count > 10 && (
          <button className="btn btn-ghost btn-sm" onClick={onShowAll}>
            Lihat Semua ({count})
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════
export default function DashboardPage({
  competitions, aggregated, processed, masterAM, activeComp, setActiveComp,
  onGenerateWA, onGenerateBoD, onGoToUpload, period,
}) {
  const [tableSearch,    setTableSearch]    = useState('');
  const [tableSort,      setTableSort]      = useState({ col: 'ns', dir: 'desc' });
  const [tableFilterAM,  setTableFilterAM]  = useState('');
  const [tableFilterCat, setTableFilterCat] = useState('');

  // Modal state: null | 'store' | 'sp'
  const [modal, setModal] = useState(null);

  const hasData = !!(
    processed &&
    Object.keys(processed).length > 0 &&
    (processed[activeComp]?.storeLeader?.length > 0)
  );

  const m     = hasData ? computeMetrics(activeComp, processed) : null;
  const rules = competitions[activeComp] || {};
  const D     = processed?.[activeComp] || null;

  // All AMs from storeLeader for filter dropdown
  const allAMs = useMemo(() => {
    if (!D) return [];
    return [...new Set((D.storeLeader || []).map((s) => s.am).filter(Boolean))].sort();
  }, [D]);

  // Filtered + sorted store table data (uses storeLeader directly for proper tier-sort base)
  const tableData = useMemo(() => {
    if (!D) return [];
    let rows = (D.storeLeader || []).map((s) => {
      const tn   = rules?.tiers?.[s.category] || 0;
      const qMin = rules?.qtyMin?.[tn] || 0;
      return { ...s, qtyMin: qMin, qualified: !qMin || s.qty >= qMin };
    });

    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.am   || '').toLowerCase().includes(q) ||
        (r.area || '').toLowerCase().includes(q)
      );
    }
    if (tableFilterAM)  rows = rows.filter((r) => r.am === tableFilterAM);
    if (tableFilterCat) rows = rows.filter((r) => r.category === tableFilterCat);

    rows.sort((a, b) => {
      let va = a[tableSort.col]; let vb = b[tableSort.col];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      return tableSort.dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return rows;
  }, [D, tableSearch, tableSort, tableFilterAM, tableFilterCat, rules]);

  const handleSort = useCallback((col) => {
    setTableSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' }
    );
  }, []);

  // SP data: top-10 preview, full list in modal
  const spData     = D?.spLeader || [];
  const hasIncentive = !!(m?.incentiveTotal > 0 || spData.some((sp) => sp.incentive > 0));

  // ── CSV Handlers ──
  const handleDlStore = useCallback(() => {
    if (D) downloadStoreCSV(activeComp, D, period || '');
  }, [D, activeComp, period]);

  const handleDlSP = useCallback(() => {
    if (D) downloadSPCSV(activeComp, D, period || '');
  }, [D, activeComp, period]);

  const handleDlAM = useCallback(() => {
    if (D) downloadAMCSV(activeComp, D, period || '');
  }, [D, activeComp, period]);

  // ── Render ──
  return (
    <div>
      <CompTabs competitions={competitions} activeComp={activeComp} setActiveComp={setActiveComp} />

      {/* Modal Lihat Semua Toko */}
      {modal === 'store' && (
        <FullListModal title={`Semua Toko — ${rules.label || activeComp}`} onClose={() => setModal(null)}>
          <div style={{ padding: 4 }}>
            <StoreTable rows={D?.storeLeader || []} rules={rules} />
          </div>
        </FullListModal>
      )}

      {/* Modal Lihat Semua SP */}
      {modal === 'sp' && (
        <FullListModal title={`Semua Sales Person — ${rules.label || activeComp}`} onClose={() => setModal(null)}>
          <div style={{ padding: 4 }}>
            <SPTable rows={spData} showIncentive={hasIncentive} />
          </div>
        </FullListModal>
      )}

      {!hasData ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Belum ada data</h3>
            <p>Upload file template transaksi dan List Produk Kompetisi untuk melihat dashboard.</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onGoToUpload}>
              📤 Upload Sekarang
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI CARDS ── */}
          <div className="kpi-grid">
            <KpiCard
              color="teal" icon="💰" label="Total Net Sales"
              value={formatRupiah(m.totalSales)}
              progress={m.pctSales}
              target={m.targetSales > 0 ? formatRupiah(m.targetSales) : null}
            />
            <KpiCard
              color="indigo" icon="📦" label="Total Qty Sold"
              value={formatNum(m.totalQty)}
              progress={m.targetQty > 0 ? m.pctQty : undefined}
              target={m.targetQty > 0 ? `${formatNum(m.targetQty)} pcs` : null}
            />
            {hasIncentive ? (
              <KpiCard
                color="amber" icon="🎁" label="Est. Insentif Staf"
                value={formatRupiah(m.incentiveTotal)}
                sub={`Rp 30.000 × qty alat test`}
              />
            ) : (
              <KpiCard
                color="amber" icon="🏪" label="Top Store"
                value={(m.topStore?.name || m.topStore?.storeName || '—').replace(/ALPRO /i, '')}
                sub={m.topStore ? formatRupiah(m.topStore.ns ?? m.topStore.netSales) : '—'}
              />
            )}
            <KpiCard
              color="rose" icon="👤" label="Top Area Manager"
              value={m.topAM?.name || m.topAM?.am || '—'}
              sub={m.topAM ? `Top AM • ${formatRupiah(m.topAM.ns ?? m.topAM.netSales)}` : '—'}
            />
          </div>

          {/* ── CHARTS ROW ── */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <SectionHeader title="📊 Net Sales per Toko" sub="Top 10 toko — nilai dalam juta Rp" />
              <div className="card-body"><StoresChart data={m.chartDataStores} /></div>
            </div>
            <div className="card">
              <SectionHeader
                title="👥 Performa per Area Manager"
                sub="Net Sales (juta Rp) per AM"
                count={(D?.amLeader || []).length}
                onDownloadCSV={handleDlAM}
              />
              <div className="card-body"><AMChart data={m.chartDataAMs} /></div>
            </div>
          </div>

          {/* ── PROGRESS TARGET CARD ── */}
          {(m.targetSales > 0 || m.targetQty > 0) && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">🎯 Progress Target — {rules.label || activeComp}</div>
                  <div className="card-sub">{rules.periode || ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={onGenerateWA}>📲 WA Report</button>
                  <button className="btn btn-dark btn-sm" onClick={onGenerateBoD}>📑 BoD Report</button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${m.targetQty > 0 && m.targetSales > 0 ? 2 : 1}, 1fr)`, gap: 24 }}>
                  {m.targetQty > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Qty Sold vs Target</div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--alpro-teal)', letterSpacing: -1 }}>{formatNum(m.totalQty)}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>dari target <strong>{formatNum(m.targetQty)}</strong> pcs</div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-track" style={{ height: 10 }}>
                          <div className={`progress-bar-fill ${pctColor(m.pctQty)}`} style={{ width: `${Math.min(m.pctQty, 100)}%` }} />
                        </div>
                        <span className={`progress-pct ${pctColor(m.pctQty)}`} style={{ fontSize: 13 }}>{m.pctQty}%</span>
                      </div>
                    </div>
                  )}
                  {m.targetSales > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Net Sales vs Target</div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--alpro-indigo)', letterSpacing: -1 }}>{formatRupiah(m.totalSales)}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>dari target <strong>{formatRupiah(m.targetSales)}</strong></div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-track" style={{ height: 10 }}>
                          <div className={`progress-bar-fill ${pctColor(m.pctSales)}`} style={{ width: `${Math.min(m.pctSales, 100)}%` }} />
                        </div>
                        <span className={`progress-pct ${pctColor(m.pctSales)}`} style={{ fontSize: 13 }}>{m.pctSales}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STORE LEADERBOARD WITH FILTERS ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <SectionHeader
              title="🏆 Leaderboard Toko"
              sub={`${D?.storeLeader?.length || 0} toko aktif · urut per Tier`}
              count={D?.storeLeader?.length || 0}
              onShowAll={() => setModal('store')}
              onDownloadCSV={handleDlStore}
            />
            <div className="card-body" style={{ paddingBottom: 0 }}>
              {/* Filter toolbar */}
              <div className="toolbar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Cari toko, AM, area..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                  />
                </div>
                <select className="filter-select" value={tableFilterAM} onChange={(e) => setTableFilterAM(e.target.value)}>
                  <option value="">Semua AM</option>
                  {allAMs.map((am) => <option key={am} value={am}>{am}</option>)}
                </select>
                <select className="filter-select" value={tableFilterCat} onChange={(e) => setTableFilterCat(e.target.value)}>
                  <option value="">Semua Tier</option>
                  {TIER_ORDER.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {(tableSearch || tableFilterAM || tableFilterCat) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setTableSearch(''); setTableFilterAM(''); setTableFilterCat(''); }}>
                    ✕ Reset
                  </button>
                )}
              </div>
            </div>
            <div className="table-wrap">
              <StoreTable rows={tableData.slice(0, 15)} rules={rules} />
              {tableData.length > 15 && (
                <div style={{ textAlign: 'center', padding: '10px 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                  +{tableData.length - 15} toko lainnya —{' '}
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal('store')}>Lihat Semua</button>
                </div>
              )}
            </div>
          </div>

          {/* ── SALES PERSON HIGHLIGHT ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <SectionHeader
              title="💪 Highlight Sales Person"
              sub={`${spData.length} staf aktif · urut Net Sales · kode toko di-exclude otomatis`}
              count={spData.length}
              onShowAll={spData.length > 10 ? () => setModal('sp') : null}
              onDownloadCSV={spData.length > 0 ? handleDlSP : null}
            />
            <div className="table-wrap">
              <SPTable rows={spData.slice(0, 10)} showIncentive={hasIncentive} />
              {spData.length > 10 && (
                <div style={{ textAlign: 'center', padding: '10px 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                  +{spData.length - 10} staf lainnya —{' '}
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal('sp')}>Lihat Semua</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
