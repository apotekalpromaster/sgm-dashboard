import { useState, useMemo, useCallback } from 'react';
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
  processTransactions,
  buildAggregated,
  computeMetrics,
} from './services/dataProcessor.js';
import { generateWAReport, generateBoDReport } from './services/reportGenerators.js';

// ── Default list produk: fallback jika user tidak upload file List Produk ──
// Diisi dengan defaults; user BISA override via upload di UI.
// Format: { [ITEM_CODE]: { itemName, kompetisi } }
// Kompetisi key HARUS sama persis dengan COMPETITION_CFG keys.
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
  // ── Core state ────────────────────────────────────────────────
  const [page, setPage]                 = useState('upload');
  const [activeComp, setActiveComp]     = useState('BLACKMORES');
  const [period, setPeriod]             = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const [reportView, setReportView]     = useState('wa');
  const [waReport, setWaReport]         = useState('');
  const [bodReport, setBodReport]       = useState('');

  // ── File tracking ─────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles]   = useState([]);  // tx files
  const [listProdukFile, setListProdukFile] = useState(null);
  const [masterAmFile, setMasterAmFile]     = useState(null);

  // ── Processed result: { processed, matched, skipped } ────────
  const [result, setResult] = useState(null);

  const { toasts, toast } = useToasts();

  // Derived
  const hasData = result !== null && Object.keys(result.processed).length > 0;

  const aggregated = useMemo(() => {
    if (!result) return {};
    return buildAggregated(result.processed);
  }, [result]);

  // ── Main pipeline runner ──────────────────────────────────────
  const runPipeline = useCallback(async (txFiles, lpFile, amFile) => {
    setIsProcessing(true);
    try {
      // 1. Parse List Produk Kompetisi (user file or default)
      let listProduk = DEFAULT_LIST_PRODUK;
      if (lpFile) {
        toast('📋 Memuat List Produk Kompetisi...', 'info');
        listProduk = await parseListProduk(lpFile);
        const nP = Object.keys(listProduk).length;
        if (!nP) throw new Error('List Produk kosong. Kolom wajib: ITEM CODE, KOMPETISI');
      }

      // 2. Parse Master AM (optional)
      let masterAM = {};
      if (amFile) {
        toast('👥 Memuat Master AM...', 'info');
        masterAM = await parseMasterAM(amFile);
      }

      // 3. Parse all tx files
      toast('⚙️ Memproses file transaksi...', 'info');
      let allTx = [];
      let detectedPeriode = '';
      for (const f of txFiles) {
        const { rows, periode } = await parseTxFile(f);
        allTx = allTx.concat(rows);
        if (!detectedPeriode && periode) detectedPeriode = periode;
      }

      if (!allTx.length) throw new Error('Tidak ada baris POS yang ditemukan di file transaksi.');

      // 4. Join + aggregate
      const res = processTransactions(allTx, listProduk, masterAM);

      setResult(res);
      if (detectedPeriode) setPeriod(detectedPeriode);
      setActiveComp(Object.keys(res.processed)[0] || 'BLACKMORES');

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

  // ── TX file change handler ────────────────────────────────────
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

  // ── Trigger pipeline ──────────────────────────────────────────
  const handleProcess = useCallback(() => {
    const txFiles = uploadedFiles.map((e) => e.file);
    if (!txFiles.length) { toast('Upload file transaksi terlebih dahulu', 'error'); return; }
    runPipeline(txFiles, listProdukFile, masterAmFile);
  }, [uploadedFiles, listProdukFile, masterAmFile, runPipeline, toast]);

  // ── Reset ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setResult(null);
    setUploadedFiles([]);
    setListProdukFile(null);
    setMasterAmFile(null);
    setPeriod('');
    toast('Data direset', 'info');
  }, [toast]);

  // ── Report generators ─────────────────────────────────────────
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

  // ── Topbar title ──────────────────────────────────────────────
  const cfg = COMPETITION_CFG[activeComp] || {};
  const topbarTitle = {
    upload:    '📤 Data Ingestion — Upload Template',
    dashboard: `📊 Dashboard — ${cfg.label || activeComp}`,
    report:    '📋 Report Generator',
  }[page];

  // ── Total tx rows for sidebar counter ─────────────────────────
  const totalRows = useMemo(() => {
    if (!result) return 0;
    return Object.values(result.processed).reduce((s, D) => s + D.storeLeader.length, 0);
  }, [result]);

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        uploadedFiles={uploadedFiles}
        allTransactions={[...Array(totalRows)]} // for counter display
      />

      <div className="main-area">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">{topbarTitle}</div>
            <div className="topbar-sub">Powered by SGM Alpro Indonesia, 2026</div>
          </div>
          <div className="topbar-right">
            {period && <span className="period-badge">📅 {period}</span>}
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
              isProcessing={isProcessing}
              hasData={hasData}
              dragOver={dragOver}
              setDragOver={setDragOver}
              onTxFileChange={handleTxFileChange}
              onListProdukChange={(f) => setListProdukFile(f)}
              onMasterAmChange={(f) => setMasterAmFile(f)}
              onDrop={handleDrop}
              onProcess={handleProcess}
              onGoToDashboard={() => setPage('dashboard')}
              onReset={handleReset}
            />
          )}

          {page === 'dashboard' && (
            <DashboardPage
              competitions={COMPETITION_CFG}
              aggregated={aggregated}
              processed={result?.processed || {}}
              masterAM={[]}
              period={period}
              activeComp={activeComp}
              setActiveComp={setActiveComp}
              onGenerateWA={handleGenerateWA}
              onGenerateBoD={handleGenerateBoD}
              onGoToUpload={() => setPage('upload')}
            />
          )}

          {page === 'report' && (
            <ReportPage
              competitions={COMPETITION_CFG}
              activeComp={activeComp}
              setActiveComp={setActiveComp}
              reportView={reportView}
              setReportView={setReportView}
              waReport={waReport}
              bodReport={bodReport}
              onGenerateWA={handleGenerateWA}
              onGenerateBoD={handleGenerateBoD}
              onCopy={handleCopy}
            />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
