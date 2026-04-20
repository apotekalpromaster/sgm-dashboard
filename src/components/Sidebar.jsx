/**
 * App sidebar with navigation items, pipeline step indicator, and live data counters.
 */
export default function Sidebar({ page, setPage, uploadedFiles, allTransactions }) {
  const hasData = allTransactions.length > 0;

  const stepStatus = (s) => {
    if (s === 1) return uploadedFiles.length > 0 ? 'done' : page === 'upload' ? 'active' : 'todo';
    if (s === 2) return hasData ? 'done' : uploadedFiles.length > 0 ? 'active' : 'todo';
    if (s === 3) return hasData && page === 'dashboard' ? 'active' : hasData ? 'done' : 'todo';
    if (s === 4) return page === 'report' ? 'active' : hasData ? 'done' : 'todo';
    return 'todo';
  };

  const steps = [
    { n: 1, label: 'Upload File' },
    { n: 2, label: 'Proses Data' },
    { n: 3, label: 'Dashboard' },
    { n: 4, label: 'Generate Report' },
  ];

  const navItems = [
    { id: 'upload',    icon: '📤', label: 'Upload Data', badge: uploadedFiles.length || null },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'report',    icon: '📋', label: 'Report Generator' },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">💊</div>
        <div>
          <div className="sidebar-brand-name">SGM Engine</div>
          <div className="sidebar-brand-sub">ALPRO COMPETITION</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="nav-section-label">Menu Utama</div>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${page === item.id ? 'active' : ''}`}
          onClick={() => setPage(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
          {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
        </button>
      ))}

      {/* Pipeline steps */}
      <div className="nav-section-label" style={{ marginTop: 16 }}>Pipeline Status</div>
      <div className="step-indicator">
        {steps.map((s, i) => {
          const status = stepStatus(s.n);
          return (
            <div key={s.n} className="step-item">
              <div className="step-dot-wrap">
                <div className={`step-dot ${status}`}>
                  {status === 'done' ? '✓' : s.n}
                </div>
                {i < steps.length - 1 && (
                  <div className={`step-line ${status === 'done' ? 'done' : ''}`} />
                )}
              </div>
              <span className={`step-label ${status}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Live counters */}
      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <div className="nav-section-label">Data Aktif</div>
        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Transaksi POS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{allTransactions.length.toLocaleString()}</div>
        </div>
        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>File Diproses</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{uploadedFiles.length}</div>
        </div>
      </div>
    </aside>
  );
}
