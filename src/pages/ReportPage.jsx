/**
 * Report Generator page.
 * Handles both WhatsApp report and Board of Directors report views.
 */
export default function ReportPage({
  competitions,
  activeComp,
  setActiveComp,
  reportView,
  setReportView,
  waReport,
  bodReport,
  onGenerateWA,
  onGenerateBoD,
  onCopy,
}) {
  return (
    <div>
      {/* View toggle */}
      <div className="tab-strip" style={{ maxWidth: 420 }}>
        {[
          { id: 'wa',  label: '📲 WhatsApp Report' },
          { id: 'bod', label: '📑 BoD Report' },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${reportView === t.id ? 'active' : ''}`}
            onClick={() => setReportView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Competition selector */}
      <div className="comp-tabs" style={{ marginBottom: 20 }}>
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

      {/* ===== WA REPORT VIEW ===== */}
      {reportView === 'wa' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📲 WhatsApp Report</div>
                <div className="card-sub">Teks siap kirim ke grup WhatsApp operasional</div>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Klik tombol di bawah untuk menghasilkan teks laporan yang sudah diformat untuk WhatsApp,
                lengkap dengan emoji dan struktur yang ramah dibaca Admin.
              </p>
              <button className="btn btn-wa btn-lg w-full" onClick={onGenerateWA}>
                📲 Generate WA Report
              </button>

              {waReport && (
                <div style={{ marginTop: 20 }}>
                  <div className="report-preview">{waReport}</div>
                  <button
                    className="btn btn-primary w-full"
                    style={{ marginTop: 12 }}
                    onClick={() => onCopy(waReport)}
                  >
                    📋 Copy ke Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panduan */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">💡 Panduan Penggunaan</div>
            </div>
            <div className="card-body stack">
              {[
                { emoji: '1️⃣', title: 'Generate Report', desc: 'Klik tombol Generate untuk membuat teks laporan dari data upload terakhir.' },
                { emoji: '2️⃣', title: 'Copy ke Clipboard', desc: 'Klik "Copy" untuk menyalin teks ke clipboard.' },
                { emoji: '3️⃣', title: 'Paste ke WhatsApp', desc: 'Buka grup WA, paste, dan kirim. Format *bold* aktif otomatis.' },
              ].map((s) => (
                <div key={s.title} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}

              <div className="ai-panel">
                <div className="ai-panel-header">🤖 AI Note</div>
                <div className="ai-panel-content">
                  Format WA report otomatis menyesuaikan kompetisi yang aktif ({competitions[activeComp]?.name}).
                  Data real-time dari upload terakhir selalu digunakan.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== BOD REPORT VIEW ===== */}
      {reportView === 'bod' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📑 Board of Directors Report</div>
                <div className="card-sub">Laporan lengkap untuk direksi dengan analisis AI</div>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Laporan komprehensif mencakup performa nasional, leaderboard, highlight AM & SP,
                dan rekomendasi strategi berbasis AI untuk direksi.
              </p>
              <button className="btn btn-dark btn-lg w-full" onClick={onGenerateBoD}>
                📑 Generate BoD Report
              </button>

              {bodReport && (
                <div style={{ marginTop: 20 }}>
                  <div className="report-preview">{bodReport}</div>
                  <button
                    className="btn btn-primary w-full"
                    style={{ marginTop: 12 }}
                    onClick={() => onCopy(bodReport)}
                  >
                    📋 Copy Laporan BoD
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Konten checklist */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📋 Konten Laporan BoD</div>
            </div>
            <div className="card-body stack">
              {[
                { t: 'Update Capaian Kompetisi', d: 'Nama kompetisi aktif + periode laporan' },
                { t: 'Performa Penjualan Nasional', d: 'Total Net Sales & Qty vs target' },
                { t: 'Progress Target Volume', d: 'Actual qty + % pencapaian vs syarat minimum' },
                { t: 'Leaderboard Toko (Top 10)', d: 'Ranking berdasarkan total penjualan' },
                { t: 'Highlight Performa Salesperson', d: 'Top salesperson per nilai penjualan' },
                { t: 'Highlight Performa Area Manager', d: 'Ranking AM berdasarkan total net sales' },
                { t: '🤖 Rekomendasi AI', d: 'Analisis otomatis & saran strategi berbasis data' },
              ].map((item) => (
                <div key={item.t} style={{
                  display: 'flex', gap: 10, padding: '6px 0',
                  borderBottom: '1px solid var(--surface-2)',
                }}>
                  <span style={{ fontSize: 14, marginTop: 1 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{item.t}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
