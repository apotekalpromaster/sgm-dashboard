import { useState, useCallback } from 'react';
import { computeMetrics } from '../services/dataProcessor.js';
import { generateAIReports } from '../services/groqService.js';

/**
 * Report Generator page.
 * Handles WA report, BoD report, and AI-generated report via Groq LPU.
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
  processed,
  period,
}) {
  const [aiWa,     setAiWa]     = useState('');
  const [aiBod,    setAiBod]    = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,  setAiError]  = useState('');

  const handleAIGenerate = useCallback(async () => {
    setAiLoading(true);
    setAiError('');
    setAiWa('');
    setAiBod('');
    try {
      const m = computeMetrics(activeComp, processed || {});
      if (!m) throw new Error('Tidak ada data untuk kompetisi ini. Upload dan proses data terlebih dahulu.');
      const compLabel = competitions[activeComp]?.label || activeComp;
      const { waReport: genWA, bodReport: genBoD } = await generateAIReports(m, compLabel, period);
      setAiWa(genWA);
      setAiBod(genBoD);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }, [activeComp, processed, competitions, period]);

  const compEntries = Object.entries(competitions);

  return (
    <div>
      {/* ── View toggle ─────────────────────────────────────────────── */}
      <div className="tab-strip" style={{ maxWidth: 460, marginBottom: 20 }}>
        {[
          { id: 'wa',  label: '📲 WA Report'  },
          { id: 'bod', label: '📑 BoD Report' },
          { id: 'ai',  label: '🤖 AI Generate' },
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

      {/* ── Competition selector ─────────────────────────────────────── */}
      <div className="comp-tabs" style={{ marginBottom: 20 }}>
        {compEntries.map(([key, comp]) => (
          <button
            key={key}
            className={`comp-tab ${activeComp === key ? 'active' : ''}`}
            onClick={() => setActiveComp(key)}
          >
            <span className="comp-emoji">{comp.emoji}</span>
            {comp.label || comp.name}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          WA REPORT VIEW
      ═══════════════════════════════════════════════════════════════ */}
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
                Laporan cepat dengan format bold, emoji, dan struktur poin yang dioptimalkan untuk WhatsApp.
              </p>
              <button className="btn btn-wa btn-lg w-full" onClick={onGenerateWA}>
                📲 Generate WA Report
              </button>

              {waReport && (
                <div style={{ marginTop: 20 }}>
                  <div className="report-preview">{waReport}</div>
                  <button className="btn btn-primary w-full" style={{ marginTop: 12 }} onClick={() => onCopy(waReport)}>
                    📋 Copy ke Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">💡 Panduan Penggunaan</div>
            </div>
            <div className="card-body stack">
              {[
                { emoji: '1️⃣', title: 'Generate Report', desc: 'Klik tombol Generate untuk membuat teks dari data upload terakhir.' },
                { emoji: '2️⃣', title: 'Copy ke Clipboard', desc: 'Klik "Copy" untuk menyalin teks laporan.' },
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
              <div style={{
                marginTop: 8, padding: '12px 14px',
                background: 'var(--alpro-rose-pale)', borderRadius: 12,
                border: '1px solid var(--alpro-rose-muted)',
                fontSize: 12, color: 'var(--alpro-rose-dark)', lineHeight: 1.6,
              }}>
                💡 Kompetisi aktif: <strong>{competitions[activeComp]?.label || activeComp}</strong>.
                Ganti tab kompetisi di atas untuk generate laporan kompetisi lain.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          BOD REPORT VIEW
      ═══════════════════════════════════════════════════════════════ */}
      {reportView === 'bod' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">📑 Board of Directors Report</div>
                <div className="card-sub">Laporan komprehensif untuk direksi</div>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Laporan lengkap mencakup performa nasional, leaderboard, highlight AM & SP,
                dan analisis berbasis data untuk direksi.
              </p>
              <button className="btn btn-dark btn-lg w-full" onClick={onGenerateBoD}>
                📑 Generate BoD Report
              </button>

              {bodReport && (
                <div style={{ marginTop: 20 }}>
                  <div className="report-preview">{bodReport}</div>
                  <button className="btn btn-primary w-full" style={{ marginTop: 12 }} onClick={() => onCopy(bodReport)}>
                    📋 Copy Laporan BoD
                  </button>
                </div>
              )}
            </div>
          </div>

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
                { t: 'Highlight Performa Salesperson', d: 'Top SP per nilai penjualan + estimasi insentif' },
                { t: 'Highlight Performa Area Manager', d: 'Ranking AM berdasarkan total net sales' },
                { t: '🤖 Rekomendasi AI', d: 'Analisis otomatis & saran strategi berbasis data' },
              ].map((item) => (
                <div key={item.t} style={{
                  display: 'flex', gap: 10, padding: '6px 0',
                  borderBottom: '1px solid var(--border)',
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

      {/* ═══════════════════════════════════════════════════════════════
          AI GENERATE VIEW
      ═══════════════════════════════════════════════════════════════ */}
      {reportView === 'ai' && (
        <div>
          {/* Header Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #fff1f2, #fff8f9)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 22,
                  background: 'linear-gradient(135deg, var(--alpro-rose-pale), var(--alpro-rose-muted))',
                }}>🤖</div>
                <div>
                  <div className="card-title">AI Report Generator</div>
                  <div className="card-sub">
                    Powered by Groq LPU · Model: Llama 3 70B ·
                    Kompetisi: <strong>{competitions[activeComp]?.label || activeComp}</strong>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAIGenerate}
                disabled={aiLoading}
                style={{ minWidth: 160 }}
              >
                {aiLoading
                  ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Generating...</>
                  : '✨ Generate with AI'
                }
              </button>
            </div>
          </div>

          {/* Error */}
          {aiError && (
            <div style={{
              padding: '14px 18px', background: '#fff1f2', border: '1px solid var(--alpro-rose-muted)',
              borderRadius: 12, color: 'var(--alpro-rose)', fontSize: 13, marginBottom: 16,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span>⚠️</span>
              <div>
                <strong>Gagal generate:</strong> {aiError}
                {aiError.includes('VITE_GROQ_API_KEY') && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--alpro-rose-dark)' }}>
                    Tambahkan <code style={{ background: '#fecdd3', padding: '1px 5px', borderRadius: 4 }}>
                      VITE_GROQ_API_KEY=gsk_xxx
                    </code> ke file <code>.env</code> lalu restart dev server.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Grid */}
          {(aiWa || aiBod) && (
            <div className="grid-2">
              {aiWa && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">📲 AI — WhatsApp Report</div>
                    <button className="btn btn-outline btn-sm" onClick={() => onCopy(aiWa)}>📋 Copy</button>
                  </div>
                  <div className="card-body">
                    <div className="report-preview">{aiWa}</div>
                  </div>
                </div>
              )}
              {aiBod && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">📑 AI — BoD Report</div>
                    <button className="btn btn-outline btn-sm" onClick={() => onCopy(aiBod)}>📋 Copy</button>
                  </div>
                  <div className="card-body">
                    <div className="report-preview">{aiBod}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips when no result */}
          {!aiWa && !aiBod && !aiLoading && !aiError && (
            <div className="card">
              <div className="card-body">
                <div className="empty-state" style={{ padding: 40 }}>
                  <img src="/assets/sticker_jj2.webp" alt="" style={{ width: 90, opacity: 0.9, marginBottom: 12 }} />
                  <h3 style={{ marginBottom: 8 }}>Siap Generate Laporan AI!</h3>
                  <p>Klik "<strong>Generate with AI</strong>" dan biarkan Groq LPU yang bekerja.<br />
                    Laporan WA + BoD akan dihasilkan secara bersamaan dalam waktu ~5 detik.
                  </p>
                  <div style={{
                    marginTop: 20, padding: '12px 16px', background: 'var(--alpro-rose-pale)',
                    borderRadius: 12, border: '1px solid var(--alpro-rose-muted)',
                    fontSize: 12, color: 'var(--alpro-rose-dark)', textAlign: 'left',
                  }}>
                    <strong>📋 Setup Groq API Key:</strong><br />
                    1. Daftar di <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: 'var(--alpro-rose)' }}>console.groq.com</a> (gratis)<br />
                    2. Buat API Key baru<br />
                    3. Tambahkan ke file <code>.env</code>: <code>VITE_GROQ_API_KEY=gsk_xxx</code><br />
                    4. Untuk Vercel: tambahkan di Project Settings → Environment Variables<br />
                    5. Restart dev server / Redeploy Vercel
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
