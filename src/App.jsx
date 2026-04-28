import { useState, useMemo, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import { ToastContainer, useToasts } from './components/Toast.jsx';
import UploadPage from './pages/UploadPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import {
  COMPETITION_CFG,
  parseTxFile,
  parseListProduk,
  parseMasterAM,
  parseMasterCE,
  processTransactions,
  aggregateOneCompetition,
  buildAggregated,
  computeMetrics,
  buildDynamicCompetitions,
  downloadCECSV,
} from './services/dataProcessor.js';
import { generateWAReport, generateBoDReport } from './services/reportGenerators.js';
import {
  fetchDashboardData,
  pushDashboardData,
  resetDashboardData,
} from './utils/supabaseClient.js';

// ── Password Admin ─────────────────────────────────────────────
const ADMIN_PASSWORD = 'SGM2026';

// ── Default list produk fallback ───────────────────────────────
const DEFAULT_LIST_PRODUK = {
  // BLACKMORES
  '100008671': { itemName: 'Blackmores Vitamin C 500mg',   kompetisi: 'BLACKMORES' },
  '100008672': { itemName: 'Blackmores Bio Calcium',        kompetisi: 'BLACKMORES' },
  '100008673': { itemName: 'Blackmores Omega Women',        kompetisi: 'BLACKMORES' },
  '100008674': { itemName: "Blackmores Men's Vitality",     kompetisi: 'BLACKMORES' },
  '100008675': { itemName: 'Blackmores Probiotics Daily',   kompetisi: 'BLACKMORES' },
  '100008676': { itemName: 'Blackmores Executive B',        kompetisi: 'BLACKMORES' },
  '100008677': { itemName: 'Blackmores Glucosamine',        kompetisi: 'BLACKMORES' },
  '100008678': { itemName: 'Blackmores Nature C',           kompetisi: 'BLACKMORES' },
  // FAMILY DR BODY SUPPORT
  '100000736': { itemName: 'Family Dr Baby Oil',            kompetisi: 'FAMILY DR (BODY SUPPORT)' },
  '100000737': { itemName: 'Family Dr Gentle Wash',         kompetisi: 'FAMILY DR (BODY SUPPORT)' },
  '100000738': { itemName: 'Family Dr Powder',              kompetisi: 'FAMILY DR (BODY SUPPORT)' },
  '100000739': { itemName: 'Family Dr Lotion',              kompetisi: 'FAMILY DR (BODY SUPPORT)' },
  // FAMILYDR ALAT TEST
  '100000769': { itemName: 'Family Dr Blood Glucose Strip', kompetisi: 'FAMILYDR (ALAT TEST)' },
  // OMRON THERMOMETER
  '100000302': { itemName: 'Omron Blood Pressure Monitor',  kompetisi: 'OMRON (THERMOMETER)' },
  '100000303': { itemName: 'Omron Nebulizer',               kompetisi: 'OMRON (THERMOMETER)' },
  '100000304': { itemName: 'Omron Digital Thermometer',     kompetisi: 'OMRON (THERMOMETER)' },
  // OMRON ALAT TEST
  '0404405':   { itemName: 'Omron Blood Glucose Monitor',   kompetisi: 'OMRON (ALAT TEST)' },
  '0403318':   { itemName: 'Omron Lancet',                  kompetisi: 'OMRON (ALAT TEST)' },
};

export default function App() {
  // ── Core state ─────────────────────────────────────────────
  const [page, setPage]                 = useState('dashboard'); // default halaman = dashboard
  const [activeComp, setActiveComp]     = useState('BLACKMORES');
  const [period, setPeriod]             = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading]       = useState(true); // initial pull state
  const [dragOver, setDragOver]         = useState(false);
  const [reportView, setReportView]     = useState('wa');
  const [waReport, setWaReport]         = useState('');
  const [bodReport, setBodReport]       = useState('');
  const [isAdmin, setIsAdmin]           = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  // ── File tracking ───────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles]   = useState([]);
  const [listProdukFile, setListProdukFile] = useState(null);
  const [masterAmFile, setMasterAmFile]     = useState(null);
  const [masterCeFile, setMasterCeFile]     = useState(null);

  // ── Processed result ────────────────────────────────────────────
  const [result, setResult] = useState(null);

  // ── Global Filter state (persists across comp tab changes) ────────
  const [filterAM,   setFilterAM]   = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  const { toasts, toast } = useToasts();

  const hasData = result !== null && Object.keys(result.processed).length > 0;

  // ── Dynamic competition catalog — derived from actual processed data ──
  // Always reflects what's really in the upload, not a hardcoded enum.
  const competitions = useMemo(() => {
    if (!result?.processed || !Object.keys(result.processed).length) return COMPETITION_CFG;
    return buildDynamicCompetitions(result.processed);
  }, [result]);

  const aggregated = useMemo(() => {
    if (!result) return {};
    return buildAggregated(result.processed);
  }, [result]);

  // ── Sync activeComp whenever competitions catalog changes ──────
  // Prevents stale tab selection when user uploads a different List Produk
  useEffect(() => {
    const keys = Object.keys(competitions);
    if (keys.length && !competitions[activeComp]) {
      setActiveComp(keys[0]);
    }
  }, [competitions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PULL from Supabase on mount ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const saved = await fetchDashboardData();
        if (saved) {
          setResult({
            processed:     saved.processed,
            enrichedRows:  saved.enrichedRows  || [],
            availableAMs:  saved.availableAMs  || [],
            availableTeams: saved.availableTeams || [],
            matched: saved.matched,
            skipped: saved.skipped,
          });
          if (saved.period) setPeriod(saved.period);
          if (saved.activeComp) setActiveComp(saved.activeComp);
          toast('☁️ Data terakhir dimuat dari cloud', 'info');
        }
      } catch (e) {
        // Supabase belum dikonfigurasi / offline — biarkan UI kosong
        console.warn('[SGM] Supabase fetch skipped:', e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Password-gated navigation ───────────────────────────────
  const navigateLocked = useCallback((targetPage) => {
    if (isAdmin) { setPage(targetPage); return; }
    const pw = window.prompt('🔐 Masukkan Password Admin untuk mengakses fitur ini:');
    if (pw === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPage(targetPage);
    } else if (pw !== null) {
      alert('❌ Password salah. Akses ditolak.');
    }
  }, [isAdmin]);

  const handleSetPage = useCallback((p) => {
    if (p === 'upload' || p === 'report') return navigateLocked(p);
    setPage(p);
  }, [navigateLocked]);

  // ── Main pipeline ───────────────────────────────────────────
  const runPipeline = useCallback(async (txFiles, lpFile, amFile, ceFile) => {
    setIsProcessing(true);
    try {
      let listProduk = DEFAULT_LIST_PRODUK;
      if (lpFile) {
        toast('📋 Memuat List Produk Kompetisi...', 'info');
        listProduk = await parseListProduk(lpFile);
        if (!Object.keys(listProduk).length) throw new Error('List Produk kosong. Kolom wajib: ITEM CODE, KOMPETISI');
      }

      let masterAM = {};
      if (amFile) {
        toast('👥 Memuat Master AM...', 'info');
        masterAM = await parseMasterAM(amFile);
      }

      let masterCE = {};
      if (ceFile) {
        toast('🏅 Memuat Master CE...', 'info');
        masterCE = await parseMasterCE(ceFile);
      }

      toast('⚙️ Memproses file transaksi...', 'info');
      let allTx = []; let detectedPeriode = '';
      for (const f of txFiles) {
        const { rows, periode } = await parseTxFile(f);
        allTx = allTx.concat(rows);
        if (!detectedPeriode && periode) detectedPeriode = periode;
      }
      if (!allTx.length) throw new Error('Tidak ada baris POS yang ditemukan di file transaksi.');

      const res = processTransactions(allTx, listProduk, masterAM, masterCE);
      const firstComp = Object.keys(res.processed)[0] || 'BLACKMORES';

      setResult(res);
      if (detectedPeriode) setPeriod(detectedPeriode);
      setActiveComp(firstComp);
      // Reset filters when new data is loaded
      setFilterAM('');
      setFilterTeam('');

      // ── PUSH ke Supabase ──────────────────────────────────
      try {
        toast('☁️ Menyimpan ke cloud...', 'info');
        await pushDashboardData({
          processed:    res.processed,
          enrichedRows: res.enrichedRows,
          availableAMs: res.availableAMs,
          availableTeams: res.availableTeams,
          matched:    res.matched,
          skipped:    res.skipped,
          period:     detectedPeriode,
          activeComp: firstComp,
          savedAt:    new Date().toISOString(),
        });
        toast('✅ Data tersimpan ke cloud!', 'success');
      } catch (pushErr) {
        toast(`⚠️ Lokal OK, cloud gagal: ${pushErr.message}`, 'error');
      }

      toast(
        `✅ ${res.matched} transaksi POS cocok · ${res.skipped} non-kompetisi dilewati · ` +
        `${Object.keys(res.processed).length} kompetisi aktif`,
        'success'
      );
      setTimeout(() => setPage('dashboard'), 600);
    } catch (err) {
      toast(`❌ ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // ── File handlers ───────────────────────────────────────────
  const handleTxFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadedFiles((prev) => [...prev, ...files.map((f) => ({ file: f }))]);
    e.target.value = '';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!files.length) { toast('Format tidak didukung. Gunakan .xlsx / .csv', 'error'); return; }
    setUploadedFiles((prev) => [...prev, ...files.map((f) => ({ file: f }))]);
  }, [toast]);

  const handleProcess = useCallback(() => {
    const txFiles = uploadedFiles.map((e) => e.file);
    if (!txFiles.length) { toast('Upload file transaksi terlebih dahulu', 'error'); return; }
    runPipeline(txFiles, listProdukFile, masterAmFile, masterCeFile);
  }, [uploadedFiles, listProdukFile, masterAmFile, masterCeFile, runPipeline, toast]);

  // ── Local reset ─────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setResult(null);
    setUploadedFiles([]);
    setListProdukFile(null);
    setMasterAmFile(null);
    setMasterCeFile(null);
    setPeriod('');
    toast('Data lokal direset', 'info');
  }, [toast]);

  // ── Cloud reset (Supabase) ──────────────────────────────────
  const handleResetCloud = useCallback(async () => {
    if (!window.confirm('Yakin ingin menghapus data dari cloud? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await resetDashboardData();
      handleReset();
      toast('✅ Database cloud berhasil di-reset!', 'success');
    } catch (e) {
      toast(`❌ Gagal reset cloud: ${e.message}`, 'error');
    }
  }, [handleReset, toast]);

  // ── Report handlers ─────────────────────────────────────────
  const handleGenerateWA = useCallback(() => {
    if (!result) return;
    const m   = computeMetrics(activeComp, result.processed);
    const cfg = COMPETITION_CFG[activeComp] || {};
    if (!m) { toast('Tidak ada data untuk kompetisi ini', 'error'); return; }
    setWaReport(generateWAReport(m, cfg, activeComp));
    setReportView('wa');
    setPage('report');
  }, [activeComp, result, toast]);

  const handleGenerateBoD = useCallback(() => {
    if (!result) return;
    const m   = computeMetrics(activeComp, result.processed);
    const cfg = COMPETITION_CFG[activeComp] || {};
    if (!m) { toast('Tidak ada data untuk kompetisi ini', 'error'); return; }
    setBodReport(generateBoDReport(m, cfg));
    setReportView('bod');
    setPage('report');
  }, [activeComp, result, toast]);

  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast('✅ Disalin ke clipboard!', 'success'))
      .catch(() => toast('Gagal menyalin', 'error'));
  }, [toast]);

  // ── Topbar title ─────────────────────────────────────────────
  const cfg = COMPETITION_CFG[activeComp] || {};
  const topbarTitle = {
    upload:    '📤 Data Ingestion — Upload Template',
    dashboard: `📊 Dashboard — ${cfg.label || activeComp}`,
    report:    '📋 Report Generator',
  }[page];

  const totalRows = useMemo(() => {
    if (!result) return 0;
    return Object.values(result.processed).reduce((s, D) => s + D.storeLeader.length, 0);
  }, [result]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 16, background: '#f8fafc',
      }}>
        <div className="spinner dark" style={{ width: 32, height: 32 }} />
        <div style={{ fontSize: 14, color: '#64748b' }}>Memuat data dari cloud...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={handleSetPage}
        isAdmin={isAdmin}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        uploadedFiles={uploadedFiles}
        allTransactions={[...Array(totalRows)]}
      />

      <div className="main-area">
        {/* Topbar */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <div>
              <div className="topbar-title">{topbarTitle}</div>
              <div className="topbar-sub">Powered by SGM Alpro Indonesia, 2026</div>
            </div>
          </div>
          <div className="topbar-right">
            {period && <span className="period-badge">📅 {period}</span>}
            {isAdmin && (
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 99,
                background: '#dcfce7', color: '#15803d', fontWeight: 700,
              }}>🔓 Admin</span>
            )}
            {hasData && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={handleGenerateWA}>📲 WA Report</button>
                <button className="btn btn-dark btn-sm" onClick={handleGenerateBoD}>📑 BoD Report</button>
              </div>
            )}
          </div>
        </div>

        {/* Pages */}
        <div className="page-content">
          {page === 'upload' && (
            <UploadPage
              uploadedFiles={uploadedFiles}
              listProdukFile={listProdukFile}
              masterAmFile={masterAmFile}
              masterCeFile={masterCeFile}
              isProcessing={isProcessing}
              hasData={hasData}
              dragOver={dragOver}
              setDragOver={setDragOver}
              onTxFileChange={handleTxFileChange}
              onListProdukChange={(f) => setListProdukFile(f)}
              onMasterAmChange={(f) => setMasterAmFile(f)}
              onMasterCeChange={(f) => setMasterCeFile(f)}
              onDrop={handleDrop}
              onProcess={handleProcess}
              onGoToDashboard={() => setPage('dashboard')}
              onReset={handleReset}
              onResetCloud={handleResetCloud}
            />
          )}

          {page === 'dashboard' && (
            <DashboardPage
              competitions={competitions}
              aggregated={aggregated}
              processed={result?.processed || {}}
              enrichedRows={result?.enrichedRows || []}
              availableAMs={result?.availableAMs || []}
              availableTeams={result?.availableTeams || []}
              filterAM={filterAM}
              setFilterAM={setFilterAM}
              filterTeam={filterTeam}
              setFilterTeam={setFilterTeam}
              masterAM={[]}
              period={period}
              activeComp={activeComp}
              setActiveComp={setActiveComp}
              onGenerateWA={handleGenerateWA}
              onGenerateBoD={handleGenerateBoD}
              onGoToUpload={() => handleSetPage('upload')}
            />
          )}

          {page === 'report' && (
            <ReportPage
              competitions={competitions}
              activeComp={activeComp}
              setActiveComp={setActiveComp}
              reportView={reportView}
              setReportView={setReportView}
              waReport={waReport}
              bodReport={bodReport}
              onGenerateWA={handleGenerateWA}
              onGenerateBoD={handleGenerateBoD}
              onCopy={handleCopy}
              processed={result?.processed || {}}
              period={period}
            />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
