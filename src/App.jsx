import { useState, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import { ToastContainer, useToasts } from './components/Toast.jsx';
import UploadPage from './pages/UploadPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import {
  DEFAULT_MASTER_AM,
  DEFAULT_PRODUCT_COMPETITION,
  buildProductMap,
  buildAMMap,
} from './data/masterData.js';
import { parseTransactionFile, aggregateTransactions } from './services/dataProcessor.js';
import { generateWAReport, generateBoDReport } from './services/reportGenerators.js';
import { computeMetrics } from './services/dataProcessor.js';

export default function App() {
  // ===== STATE =====
  const [page, setPage]                   = useState('upload');
  const [competitions]                    = useState(DEFAULT_PRODUCT_COMPETITION);
  const [masterAM]                        = useState(DEFAULT_MASTER_AM);
  const [allTransactions, setAllTx]       = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [period, setPeriod]               = useState('April – Juni 2026');
  const [isProcessing, setIsProcessing]   = useState(false);
  const [activeComp, setActiveComp]       = useState('BLACKMORES');
  const [waReport, setWaReport]           = useState('');
  const [bodReport, setBodReport]         = useState('');
  const [reportView, setReportView]       = useState('wa');
  const [dragOver, setDragOver]           = useState(false);

  const { toasts, toast } = useToasts();

  // ===== DERIVED DATA =====
  const productMap  = useMemo(() => buildProductMap(competitions),    [competitions]);
  const amMap       = useMemo(() => buildAMMap(masterAM),             [masterAM]);
  const aggregated  = useMemo(() => aggregateTransactions(allTransactions, competitions), [allTransactions, competitions]);
  const hasData     = allTransactions.length > 0;

  // ===== FILE PROCESSOR =====
  const processFiles = useCallback(async (files) => {
    setIsProcessing(true);
    const allNew = [];
    let detectedPeriod = null;

    for (const file of files) {
      try {
        const { transactions, period: p } = await parseTransactionFile(file, amMap, productMap, competitions);
        allNew.push(...transactions);
        if (p && !detectedPeriod) detectedPeriod = p;
      } catch (err) {
        toast(`❌ Gagal membaca ${file.name}: ${err.message}`, 'error');
      }
    }

    setAllTx((prev) => [...prev, ...allNew]);
    if (detectedPeriod) setPeriod(detectedPeriod);
    setIsProcessing(false);
    toast(`✅ ${allNew.length} transaksi POS berhasil diproses dari ${files.length} file`, 'success');
    if (allNew.length > 0) setTimeout(() => setPage('dashboard'), 600);
  }, [amMap, productMap, competitions, toast]);

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadedFiles((prev) => [...prev, ...files.map((f) => ({ file: f, status: 'processing' }))]);
    processFiles(files);
    e.target.value = '';
  }, [processFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!files.length) { toast('Format tidak didukung. Gunakan .xlsx / .csv', 'error'); return; }
    setUploadedFiles((prev) => [...prev, ...files.map((f) => ({ file: f, status: 'processing' }))]);
    processFiles(files);
  }, [processFiles, toast]);

  // ===== REPORT GENERATORS =====
  const handleGenerateWA = useCallback(() => {
    const m = computeMetrics(activeComp, aggregated, competitions);
    const rules = competitions[activeComp];
    const text = generateWAReport(m, rules, activeComp);
    setWaReport(text);
    setReportView('wa');
    setPage('report');
  }, [activeComp, aggregated, competitions]);

  const handleGenerateBoD = useCallback(() => {
    const m = computeMetrics(activeComp, aggregated, competitions);
    const rules = competitions[activeComp];
    const text = generateBoDReport(m, rules);
    setBodReport(text);
    setReportView('bod');
    setPage('report');
  }, [activeComp, aggregated, competitions]);

  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast('✅ Disalin ke clipboard!', 'success'))
      .catch(() => toast('Gagal menyalin', 'error'));
  }, [toast]);

  const handleReset = useCallback(() => {
    setAllTx([]);
    setUploadedFiles([]);
    toast('Data direset', 'info');
  }, [toast]);

  // ===== TOPBAR TITLE =====
  const topbarTitle = {
    upload:    '📤 Data Ingestion — Upload Template',
    dashboard: `📊 Dashboard Kompetisi — ${competitions[activeComp]?.name || activeComp}`,
    report:    '📋 Report Generator',
  }[page];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        page={page}
        setPage={setPage}
        uploadedFiles={uploadedFiles}
        allTransactions={allTransactions}
      />

      {/* Main */}
      <div className="main-area">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">{topbarTitle}</div>
            <div className="topbar-sub">SGM Competition Engine • Alpro Operations</div>
          </div>
          <div className="topbar-right">
            {hasData && (
              <span className="period-badge">📅 {period}</span>
            )}
            {hasData && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={handleGenerateWA}>📲 WA Report</button>
                <button className="btn btn-dark btn-sm" onClick={handleGenerateBoD}>📑 BoD Report</button>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          {page === 'upload' && (
            <UploadPage
              uploadedFiles={uploadedFiles}
              isProcessing={isProcessing}
              hasData={hasData}
              dragOver={dragOver}
              setDragOver={setDragOver}
              onFileChange={handleFileChange}
              onDrop={handleDrop}
              onGoToDashboard={() => setPage('dashboard')}
              onReset={handleReset}
            />
          )}

          {page === 'dashboard' && (
            <DashboardPage
              competitions={competitions}
              aggregated={aggregated}
              masterAM={masterAM}
              activeComp={activeComp}
              setActiveComp={setActiveComp}
              onGenerateWA={handleGenerateWA}
              onGenerateBoD={handleGenerateBoD}
              onGoToUpload={() => setPage('upload')}
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
            />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
