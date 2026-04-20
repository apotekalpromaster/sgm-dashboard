import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { formatRupiah, formatNum, pct, pctColor, getRankBadgeClass, getRankEmoji } from '../utils/formatters.js';
import { computeMetrics } from '../services/dataProcessor.js';

function CompTabs({ competitions, activeComp, setActiveComp }) {
  return (
    <div className="comp-tabs">
      {Object.entries(competitions).map(([key, comp]) => (
        <button
          key={key}
          className={`comp-tab ${activeComp === key ? 'active' : ''}`}
          onClick={() => setActiveComp(key)}
        >
          <span className="comp-emoji">{comp.emoji}</span>
          {comp.name}
        </button>
      ))}
    </div>
  );
}

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

function StoresChart({ stores }) {
  const data = stores.slice(0, 8).map((s) => ({
    name: s.storeName.replace('ALPRO ', '').slice(0, 14),
    sales: Math.round(s.netSales / 1_000_000),
  }));
  const colors = ['#0d9488', '#14b8a6', '#5eead4', '#a7f3d0', '#ccfbf1'];

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip
            formatter={(v) => [`Rp ${v}jt`, 'Net Sales']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={colors[Math.min(i, colors.length - 1)]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AMChart({ topAMs }) {
  const data = topAMs.slice(0, 6).map((a) => ({
    name: a.am.split(' ')[0],
    sales: Math.round(a.netSales / 1_000_000),
  }));

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <div className="empty-icon" style={{ fontSize: 32 }}>📊</div>
        <p>Upload data untuk melihat performa AM</p>
      </div>
    );
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={70} />
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

function LeaderboardTable({ tableData, tableSearch, setTableSearch, tableSort, handleSort, tableFilterAM, setTableFilterAM, tableFilterCat, setTableFilterCat, allAMs, competitions, activeComp }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">🏆 Leaderboard Pencapaian Toko</div>
          <div className="card-sub">{tableData.length} toko aktif · klik header untuk sort</div>
        </div>
      </div>
      <div className="card-body" style={{ paddingBottom: 0 }}>
        <div className="toolbar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Cari toko, AM, region..."
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
            {['TITANIUM', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'REGULER'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {(tableSearch || tableFilterAM || tableFilterCat) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setTableSearch(''); setTableFilterAM(''); setTableFilterCat(''); }}>
              ✕ Reset
            </button>
          )}
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th onClick={() => handleSort('storeName')}>Nama Toko {tableSort.col === 'storeName' ? (tableSort.dir === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('category')}>Tier</th>
              <th onClick={() => handleSort('am')}>Area Manager</th>
              <th onClick={() => handleSort('region')}>Region</th>
              <th onClick={() => handleSort('qty')} style={{ textAlign: 'right' }}>Qty {tableSort.col === 'qty' ? (tableSort.dir === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ textAlign: 'right' }}>Target</th>
              <th onClick={() => handleSort('achievement')} style={{ textAlign: 'right' }}>Progress</th>
              <th onClick={() => handleSort('netSales')} style={{ textAlign: 'right' }}>Net Sales {tableSort.col === 'netSales' ? (tableSort.dir === 'asc' ? '↑' : '↓') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="empty-icon">🔍</div>
                    <h3>Tidak ada data</h3>
                    <p>Upload file transaksi atau ubah filter</p>
                  </div>
                </td>
              </tr>
            ) : (
              tableData.map((row, i) => {
                const achColor = pctColor(row.achievement);
                return (
                  <tr key={`${row.storeCode}-${i}`}>
                    <td><span className={`rank-badge ${getRankBadgeClass(i)}`}>{getRankEmoji(i)}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.storeName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.storeCode}</div>
                    </td>
                    <td><span className={`tier-badge tier-${row.category}`}>{row.category}</span></td>
                    <td style={{ fontSize: 13 }}>{row.am}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.region}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatNum(row.qty)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{row.target}</td>
                    <td style={{ textAlign: 'right', minWidth: 120 }}>
                      <div className="progress-bar-wrap" style={{ justifyContent: 'flex-end' }}>
                        <div className="progress-bar-track" style={{ width: 60 }}>
                          <div className={`progress-bar-fill ${achColor}`} style={{ width: `${Math.min(row.achievement, 100)}%` }} />
                        </div>
                        <span className={`progress-pct ${achColor}`}>{row.achievement}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(row.netSales)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage({
  competitions, aggregated, masterAM, activeComp, setActiveComp,
  onGenerateWA, onGenerateBoD,
  onGoToUpload,
}) {
  const [tableSearch, setTableSearch]     = useState('');
  const [tableSort, setTableSort]         = useState({ col: 'netSales', dir: 'desc' });
  const [tableFilterAM, setTableFilterAM] = useState('');
  const [tableFilterCat, setTableFilterCat] = useState('');

  const hasData = Object.values(aggregated[activeComp] || {}).length > 0;
  const m       = computeMetrics(activeComp, aggregated, competitions);
  const rules   = competitions[activeComp];

  const allAMs  = useMemo(() => [...new Set(masterAM.map((a) => a.am))].sort(), [masterAM]);

  const tableData = useMemo(() => {
    let rows = Object.values(aggregated[activeComp] || {}).map((r) => ({
      ...r,
      target: rules?.tiers[r.category] || 0,
      achievement: pct(r.qty, rules?.tiers[r.category] || 1),
    }));

    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter((r) =>
        r.storeName.toLowerCase().includes(q) ||
        r.am.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
      );
    }
    if (tableFilterAM)  rows = rows.filter((r) => r.am === tableFilterAM);
    if (tableFilterCat) rows = rows.filter((r) => r.category === tableFilterCat);

    rows.sort((a, b) => {
      let va = a[tableSort.col];
      let vb = b[tableSort.col];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      return tableSort.dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return rows;
  }, [aggregated, activeComp, tableSearch, tableSort, tableFilterAM, tableFilterCat, rules]);

  const handleSort = (col) => {
    setTableSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    );
  };

  return (
    <div>
      <CompTabs competitions={competitions} activeComp={activeComp} setActiveComp={setActiveComp} />

      {!hasData ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Belum ada data</h3>
            <p>Upload file template transaksi terlebih dahulu untuk melihat dashboard monitoring.</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onGoToUpload}>
              📤 Upload Sekarang
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="kpi-grid">
            <KpiCard
              color="teal" icon="💰" label="Total Net Sales"
              value={formatRupiah(m.totalSales)}
              progress={m.pctSales}
              target={formatRupiah(m.targetSales)}
            />
            <KpiCard
              color="indigo" icon="📦" label="Total Qty Sold"
              value={formatNum(m.totalQty)}
              progress={m.pctQty}
              target={`${formatNum(m.targetQty)} pcs`}
            />
            <KpiCard
              color="amber" icon="🏪" label="Top Store"
              value={m.topStore?.storeName?.replace('ALPRO ', '') || '—'}
              sub={m.topStore ? formatRupiah(m.topStore.netSales) : '—'}
            />
            <KpiCard
              color="rose" icon="👤" label="Top Area Manager"
              value={m.topAM?.am || '—'}
              sub={m.topAM ? `${m.topAM.stores} toko • ${formatRupiah(m.topAM.netSales)}` : '—'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">📊 Net Sales per Toko</div>
                  <div className="card-sub">Top 8 toko — nilai dalam juta Rp</div>
                </div>
              </div>
              <div className="card-body">
                <StoresChart stores={m.stores} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">👥 Performa per Area Manager</div>
                  <div className="card-sub">Net Sales (juta Rp) per AM</div>
                </div>
              </div>
              <div className="card-body">
                <AMChart topAMs={m.topAMs} />
              </div>
            </div>
          </div>

          {/* Progress Target Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div>
                <div className="card-title">🎯 Progress Target Volume — {rules?.name}</div>
                <div className="card-sub">Pencapaian qty vs syarat qty minimum kompetisi</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={onGenerateWA}>📲 WA Report</button>
                <button className="btn btn-dark btn-sm" onClick={onGenerateBoD}>📑 BoD Report</button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Qty progress */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Qty Sold vs Target
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--alpro-teal)', letterSpacing: -1 }}>
                    {formatNum(m.totalQty)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                    dari target <strong>{formatNum(m.targetQty)}</strong> pcs
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-track" style={{ height: 10 }}>
                      <div className={`progress-bar-fill ${pctColor(m.pctQty)}`} style={{ width: `${Math.min(m.pctQty, 100)}%` }} />
                    </div>
                    <span className={`progress-pct ${pctColor(m.pctQty)}`} style={{ fontSize: 13 }}>{m.pctQty}%</span>
                  </div>
                </div>

                {/* Net Sales progress */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Net Sales vs Target
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--alpro-indigo)', letterSpacing: -1 }}>
                    {formatRupiah(m.totalSales)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                    dari target <strong>{formatRupiah(m.targetSales)}</strong>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-track" style={{ height: 10 }}>
                      <div
                        className={`progress-bar-fill ${pctColor(m.pctSales)}`}
                        style={{ width: `${Math.min(m.pctSales, 100)}%`, background: 'linear-gradient(90deg, var(--alpro-indigo), var(--alpro-indigo-light))' }}
                      />
                    </div>
                    <span className={`progress-pct ${pctColor(m.pctSales)}`} style={{ fontSize: 13 }}>{m.pctSales}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <LeaderboardTable
            tableData={tableData}
            tableSearch={tableSearch} setTableSearch={setTableSearch}
            tableSort={tableSort} handleSort={handleSort}
            tableFilterAM={tableFilterAM} setTableFilterAM={setTableFilterAM}
            tableFilterCat={tableFilterCat} setTableFilterCat={setTableFilterCat}
            allAMs={allAMs}
            competitions={competitions}
            activeComp={activeComp}
          />
        </>
      )}
    </div>
  );
}
