import { useRef, useCallback } from 'react';

const SCHEMA_INFO = [
  { col: 'CHANNEL',              desc: 'Filter otomatis: hanya baris "POS" yang diproses', req: true },
  { col: 'ITEM / ITEM CODE',     desc: 'Kode item untuk join dengan List Produk Kompetisi', req: true },
  { col: 'STORE / SHORT CODE',   desc: 'Kode toko — format "0001 - JKJSTT1", short code diekstrak otomatis', req: true },
  { col: 'NET SALES',            desc: 'Nominal penjualan bersih per transaksi', req: true },
  { col: 'QUANTITY SOLD / QTY',  desc: 'Jumlah unit terjual', req: true },
  { col: 'SALES PERSON',         desc: 'Nama salesperson (2+ kata). Kode toko otomatis diexclude.', req: false },
  { col: 'ITEM DESCRIPTION',     desc: 'Nama produk (fallback jika tidak ada di List Produk)', req: false },
];

function FilePickerRow({ icon, label, required, hint, fileName, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
        {label} {required && <span style={{ color: 'var(--alpro-rose)' }}>*</span>}
      </div>
      <label style={{ cursor: 'pointer', display: 'block' }}>
        <div
          className={`file-btn${fileName ? ' on' : ''}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
            border: fileName ? '1.5px solid var(--alpro-teal)' : '1.5px dashed var(--surface-3)',
            borderRadius: 10, background: fileName ? 'var(--alpro-teal-muted)' : 'var(--surface-0)',
            cursor: 'pointer', fontSize: 12, color: fileName ? 'var(--alpro-teal)' : 'var(--text-muted)',
            transition: 'all .15s', minHeight: 46,
          }}
        >
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{
            fontFamily: 'Courier New, monospace', fontSize: 11,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240,
          }}>
            {fileName || `Pilih file ${label.toLowerCase()}...`}
          </span>
        </div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={onChange}
        />
      </label>
      {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

export default function UploadPage({
  uploadedFiles,
  listProdukFile,
  masterAmFile,
  isProcessing,
  hasData,
  dragOver,
  setDragOver,
  onTxFileChange,
  onListProdukChange,
  onMasterAmChange,
  onDrop,
  onProcess,
  onGoToDashboard,
  onReset,
}) {
  const txFileRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    onDrop(e);
  }, [onDrop, setDragOver]);

  const canProcess = uploadedFiles.length > 0 && !isProcessing;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* ── UPLOAD GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* TX Files Drop Zone */}
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          style={{ gridColumn: '1 / -1' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => txFileRef.current?.click()}
        >
          <input
            ref={txFileRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            onChange={onTxFileChange}
          />
          <div className="upload-icon">📂</div>
          <div className="upload-title">Upload Template Transaksi</div>
          <div className="upload-sub">
            Drag &amp; drop file ke sini, atau klik untuk memilih. Multi-file didukung.<br />
            <strong>Filter Channel = POS otomatis aktif · Header di-detect dinamis (baris 6)</strong>
          </div>
          <div>
            {['.xlsx', '.xls', '.csv', 'Multi-file', 'Auto-detect header', 'Auto-filter POS'].map((chip) => (
              <span key={chip} className="upload-chip">{chip}</span>
            ))}
          </div>
        </div>

        {/* List Produk picker */}
        <FilePickerRow
          icon="📋"
          label="List Produk Kompetisi"
          required={false}
          hint="Kolom: ITEM CODE · KOMPETISI (opsional — sistem pakai default jika kosong)"
          fileName={listProdukFile?.name}
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) onListProdukChange(f);
            e.target.value = '';
          }}
        />

        {/* Master AM picker */}
        <FilePickerRow
          icon="👥"
          label="Master AM"
          required={false}
          hint="Kolom: Short Code · Category · AM Name · Area (opsional)"
          fileName={masterAmFile?.name}
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) onMasterAmChange(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* ── UPLOADED TX FILE LIST ── */}
      {uploadedFiles.length > 0 && (
        <div className="file-list" style={{ marginBottom: 20 }}>
          {uploadedFiles.map((entry, i) => (
            <div key={i} className="file-item">
              <span className="file-icon">📄</span>
              <span className="file-name">{entry.file?.name}</span>
              <span className="file-size">
                {entry.file ? `${(entry.file.size / 1024).toFixed(1)} KB` : ''}
              </span>
              <div className={`file-status-dot ${isProcessing && i === uploadedFiles.length - 1 ? 'processing' : 'ok'}`} />
            </div>
          ))}
        </div>
      )}

      {/* ── PROCESS BUTTON ── */}
      {uploadedFiles.length > 0 && !hasData && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ flex: 1 }}
            disabled={!canProcess}
            onClick={onProcess}
          >
            {isProcessing
              ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Memproses...</>
              : '⚙️ Proses & Tampilkan Dashboard'
            }
          </button>
        </div>
      )}

      {/* ── PROCESSING INDICATOR ── */}
      {isProcessing && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: 20, background: '#f0fdfa', borderRadius: 12, marginBottom: 20,
        }}>
          <div className="spinner dark" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--alpro-teal)' }}>
            Join List Produk Kompetisi → Join Master AM → Agregasi per Kompetisi...
          </span>
        </div>
      )}

      {/* ── CTA when data exists ── */}
      {hasData && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={onGoToDashboard}>📊 Lihat Dashboard →</button>
          <button className="btn btn-outline" onClick={onReset}>🗑 Reset Data</button>
        </div>
      )}

      {/* ── SCHEMA REFERENCE CARD ── */}
      {!hasData && !isProcessing && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">💡 Struktur Kolom Template Transaksi</div>
              <div className="card-sub">Periode dibaca dari cell D3 · Header dideteksi otomatis di baris 5–6</div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                      fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
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

            {/* Competition info */}
            <div style={{ marginTop: 20, padding: 16, background: 'var(--surface-1)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>5 Kompetisi Aktif (auto-detected dari List Produk)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { name: 'Blackmores', color: '#0F6E56' },
                  { name: 'FamilyDr Body Support', color: '#185FA5' },
                  { name: 'FamilyDr Alat Test', color: '#378ADD' },
                  { name: 'Omron Thermometer', color: '#BA7517' },
                  { name: 'Omron Alat Test', color: '#854F0B' },
                ].map((c) => (
                  <span key={c.name} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                    background: c.color + '18', color: c.color, border: `1px solid ${c.color}40`,
                  }}>{c.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
