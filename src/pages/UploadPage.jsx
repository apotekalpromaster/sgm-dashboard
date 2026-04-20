import { useRef, useCallback } from 'react';

const SCHEMA_INFO = [
  { col: 'CHANNEL',        desc: 'Filter otomatis: hanya baris "POS" yang diproses', req: true },
  { col: 'ITEM / ITEM CODE', desc: 'Kode item untuk join dengan List Produk Kompetisi', req: true },
  { col: 'STORE / SHORT CODE', desc: 'Kode toko untuk join dengan Master AM', req: true },
  { col: 'NET SALES',      desc: 'Nominal penjualan bersih per transaksi', req: true },
  { col: 'QTY / QUANTITY', desc: 'Jumlah unit terjual', req: true },
  { col: 'SALESPERSON',    desc: 'Nama salesperson (opsional, untuk highlight SP)', req: false },
  { col: 'DATE / TANGGAL', desc: 'Tanggal transaksi (opsional)', req: false },
];

export default function UploadPage({
  uploadedFiles,
  isProcessing,
  hasData,
  dragOver,
  setDragOver,
  onFileChange,
  onDrop,
  onGoToDashboard,
  onReset,
}) {
  const fileInputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    onDrop(e);
  }, [onDrop, setDragOver]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Drop Zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          onChange={onFileChange}
        />
        <div className="upload-icon">📂</div>
        <div className="upload-title">Upload Template Transaksi</div>
        <div className="upload-sub">
          Drag &amp; drop file ke sini, atau klik untuk memilih.<br />
          Mendukung multiple file sekaligus. Filter POS otomatis aktif.
        </div>
        <div>
          {['.xlsx', '.xls', '.csv', 'Multi-file', 'Auto-filter POS'].map((chip) => (
            <span key={chip} className="upload-chip">{chip}</span>
          ))}
        </div>
      </div>

      {/* Uploaded File List */}
      {uploadedFiles.length > 0 && (
        <div className="file-list">
          {uploadedFiles.map((entry, i) => (
            <div key={i} className="file-item">
              <span className="file-icon">📄</span>
              <span className="file-name">{entry.file?.name || entry.name}</span>
              <span className="file-size">
                {entry.file ? `${(entry.file.size / 1024).toFixed(1)} KB` : ''}
              </span>
              <div
                className={`file-status-dot ${
                  isProcessing && i === uploadedFiles.length - 1 ? 'processing' : 'ok'
                }`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          marginTop: 24, padding: 20, background: '#f0fdfa', borderRadius: 12,
        }}>
          <div className="spinner dark" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--alpro-teal)' }}>
            Memproses: filter POS → join produk kompetisi → join Master AM...
          </span>
        </div>
      )}

      {/* Schema info card (shown when no data yet) */}
      {!hasData && !isProcessing && (
        <div className="card mt-20">
          <div className="card-header">
            <div>
              <div className="card-title">💡 Struktur Data yang Diharapkan</div>
              <div className="card-sub">Template .xlsx harus memiliki kolom-kolom berikut</div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {SCHEMA_INFO.map((item) => (
                <div key={item.col} style={{
                  display: 'flex', gap: 10, padding: '10px 0',
                  borderBottom: '1px solid var(--surface-2)',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: item.req ? 'var(--alpro-teal)' : 'var(--text-muted)',
                    marginTop: 5, flexShrink: 0,
                  }} />
                  <div>
                    <code style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                      background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4,
                    }}>
                      {item.col}
                    </code>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA buttons when data exists */}
      {hasData && (
        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={onGoToDashboard}>
            📊 Lihat Dashboard →
          </button>
          <button className="btn btn-outline" onClick={onReset}>
            🗑 Reset Data
          </button>
        </div>
      )}
    </div>
  );
}
