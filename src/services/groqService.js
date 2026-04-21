/**
 * Groq LPU AI Service
 * Model: llama-3.3-70b-versatile (aktif — pengganti llama3-70b-8192 yang sudah decommissioned)
 * Setup: Add VITE_GROQ_API_KEY=gsk_xxx to your .env file
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Anda adalah analis operasional senior untuk jaringan apotek ritel Indonesia. 
Tugas Anda adalah mengolah data penjualan kompetisi produk farmasi menjadi dua jenis laporan profesional:
1. Laporan WhatsApp (singkat, informatif, gunakan emoji relevan, format poin-poin, bahasa Indonesia kasual-profesional, max 300 kata)
2. Laporan BoD (formal, analitis, struktur eksekutif, bahasa Indonesia formal, sertakan rekomendasi strategis, max 500 kata)

Fokus pada DATA STORYTELLING: ceritakan tren, soroti pencapaian, identifikasi risiko, dan berikan rekomendasi konkret.
Jangan hanya merangkum angka — interpretasikan maknanya bagi bisnis.`;

/**
 * Generate both WA and BoD reports using Groq AI from dashboard metrics.
 * @param {object} metricsSnapshot — output from computeMetrics()
 * @param {string} compLabel — nama kompetisi aktif
 * @param {string} period — periode laporan
 * @returns {{ waReport: string, bodReport: string }}
 */
export async function generateAIReports(metricsSnapshot, compLabel, period) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY belum diset di file .env');

  // Lightweight snapshot — kirim hanya data yang relevan, bukan raw rows
  const snapshot = {
    kompetisi:    compLabel,
    periode:      period || 'N/A',
    totalNetSales: metricsSnapshot.totalSales,
    totalQty:     metricsSnapshot.totalQty,
    targetSales:  metricsSnapshot.targetSales || 0,
    targetQty:    metricsSnapshot.targetQty   || 0,
    pctSales:     metricsSnapshot.pctSales    || 0,
    pctQty:       metricsSnapshot.pctQty      || 0,
    totalInsentif: metricsSnapshot.totalInsentif || 0,
    jumlahToko:   metricsSnapshot.storeLeader?.length || 0,
    top5Toko: (metricsSnapshot.storeLeader || []).slice(0, 5).map((s) => ({
      nama:  s.name || s.storeName,
      tier:  s.category,
      am:    s.am   || '–',
      area:  s.area || '–',
      sales: s.ns   || 0,
      qty:   s.qty  || 0,
    })),
    top5SP: (metricsSnapshot.spLeader || []).slice(0, 5).map((sp) => ({
      nama:  sp.name || sp.sp,
      toko:  sp.store,
      sales: sp.ns   || 0,
      qty:   sp.qty  || 0,
      insentif: sp.insentif || 0,
    })),
    top3AM: (metricsSnapshot.amLeader || []).slice(0, 3).map((a) => ({
      nama:  a.name || a.am,
      area:  a.area || '–',
      sales: a.ns   || 0,
      qty:   a.qty  || 0,
    })),
  };

  const userPrompt = `Berikut data mentah kompetisi produk "${compLabel}" periode ${period || 'terkini'}:

${JSON.stringify(snapshot, null, 2)}

Buatlah:
1. LAPORAN WHATSAPP: Mulai dengan header "📊 *LAPORAN KOMPETISI ${compLabel.toUpperCase()}*", format poin singkat, emoji relevan.
2. LAPORAN BoD: Mulai dengan "LAPORAN EKSEKUTIF — PROGRAM KOMPETISI ${compLabel.toUpperCase()}", format formal dengan section: Ringkasan Eksekutif, Analisis Kinerja, Leaderboard, Rekomendasi Strategis.

Pisahkan kedua laporan dengan garis: "---BOD_SEPARATOR---"`;

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:  2048,
      temperature: 0.6,
      stream:      false,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText);
    throw new Error(`Groq API error ${res.status}: ${errBody}`);
  }

  const json  = await res.json();
  const full  = json.choices?.[0]?.message?.content || '';
  const parts = full.split('---BOD_SEPARATOR---');

  return {
    waReport:  parts[0]?.trim() || full,
    bodReport: parts[1]?.trim() || '(Laporan BoD tidak dihasilkan. Coba generate ulang.)',
  };
}
