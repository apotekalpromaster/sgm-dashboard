/**
 * Sidebar — Rose/Pearl White design with Alpro logo + JJ sticker.
 */
export default function Sidebar({ page, setPage, isAdmin, isOpen, onClose, uploadedFiles, allTransactions }) {
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
    { id: 'upload',    icon: '📤', label: 'Upload Data',      badge: uploadedFiles.length || null, locked: true  },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'report',    icon: '📋', label: 'Report Generator',                                      locked: true  },
  ];

  return (
    <>
      {/* Overlay — click to close sidebar on mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* ── Brand + Logo ───────────────────────────────────── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <img
            src="/assets/alpro_logo.png"
            alt="Alpro Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }}
          />
        </div>
        <div>
          <div className="sidebar-brand-name">SGM Competition</div>
          <div className="sidebar-brand-sub">Report System</div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <div className="nav-section-label">Menu Utama</div>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${page === item.id ? 'active' : ''}`}
          onClick={() => { setPage(item.id); onClose?.(); }}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
          {item.locked && !isAdmin && (
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.4 }}>🔒</span>
          )}
          {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
        </button>
      ))}

      {/* ── Pipeline Status ─────────────────────────────────── */}
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

      {/* ── Live counters ───────────────────────────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div className="nav-section-label">Data Aktif</div>
        <div style={{
          padding: '8px 12px', background: 'var(--alpro-rose-pale)',
          borderRadius: 12, marginTop: 4, border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Transaksi POS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--alpro-rose)' }}>
            {allTransactions.length.toLocaleString()}
          </div>
        </div>
        <div style={{
          padding: '8px 12px', background: 'var(--alpro-rose-pale)',
          borderRadius: 12, marginTop: 8, border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>File Diproses</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--alpro-rose)' }}>
            {uploadedFiles.length}
          </div>
        </div>
      </div>

      {/* ── JJ Sticker 1 (Welcoming) ───────────────────────── */}
      <div style={{
        textAlign: 'center',
        paddingTop: 12,
        paddingBottom: 4,
        marginTop: 8,
        borderTop: '1px solid var(--border)',
      }}>
        <img
          src="/assets/sticker_jj1.webp"
          alt="Hai, Alproeans! 👋"
          title="Hai, Alproeans! Semangat yasss! 💪"
          style={{ width: 90, height: 90, objectFit: 'contain' }}
        />
        <div style={{
          fontSize: 10, color: 'var(--alpro-rose)', fontWeight: 600,
          marginTop: 2, letterSpacing: 0.2,
        }}>
          Semangat Alproeans! 🌸
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
          Powered by SGM Alpro Indonesia, 2026
        </div>
      </div>
    </aside>
    </>
  );
}
