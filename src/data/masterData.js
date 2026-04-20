// ==================== MASTER AM ====================
// Default data. Can be overridden via xlsx upload in future.
export const DEFAULT_MASTER_AM = [
  { shortCode: 'JKJSGH1',   storeName: 'ALPRO GEDUNG HIJAU 1',        category: 'TITANIUM', am: 'HANNA DOLI',      region: 'JAKARTA' },
  { shortCode: 'JKJSGH2',   storeName: 'ALPRO GEDUNG HIJAU 2',        category: 'PLATINUM', am: 'HANNA DOLI',      region: 'JAKARTA' },
  { shortCode: 'JKSTN01',   storeName: 'ALPRO SENAYAN',                category: 'GOLD',     am: 'RIZKY PRATAMA',   region: 'JAKARTA' },
  { shortCode: 'JKGDC01',   storeName: 'ALPRO GANDARIA CITY',          category: 'PLATINUM', am: 'RIZKY PRATAMA',   region: 'JAKARTA' },
  { shortCode: 'BDGDG01',   storeName: 'ALPRO DAGO',                   category: 'GOLD',     am: 'SINTA DEWI',      region: 'BANDUNG' },
  { shortCode: 'BDGPCT01',  storeName: 'ALPRO BUAH BATU',              category: 'SILVER',   am: 'SINTA DEWI',      region: 'BANDUNG' },
  { shortCode: 'SMRGDR01',  storeName: 'ALPRO GAJAHMADA SMG',          category: 'GOLD',     am: 'BUDI SETIAWAN',   region: 'SEMARANG' },
  { shortCode: 'SBYBGJ01',  storeName: 'ALPRO BASUKI RAHMAT',          category: 'TITANIUM', am: 'FITRI HANDAYANI', region: 'SURABAYA' },
  { shortCode: 'SBYTGP01',  storeName: 'ALPRO TUNJUNGAN',              category: 'PLATINUM', am: 'FITRI HANDAYANI', region: 'SURABAYA' },
  { shortCode: 'MKSPMK01',  storeName: 'ALPRO PANAKUKANG',             category: 'GOLD',     am: 'ARIEF RAHMAN',    region: 'MAKASSAR' },
  { shortCode: 'MKSRGS01',  storeName: 'ALPRO RAYA GOWA SELATAN',      category: 'SILVER',   am: 'ARIEF RAHMAN',    region: 'MAKASSAR' },
  { shortCode: 'MEDNRTK01', storeName: 'ALPRO NIBUNG RAYA',            category: 'BRONZE',   am: 'DAVID LUMBAN',    region: 'MEDAN' },
  { shortCode: 'BKSBDR01',  storeName: 'ALPRO BALIKPAPAN BARU',        category: 'SILVER',   am: 'YULI ASTUTI',     region: 'BALIKPAPAN' },
  { shortCode: 'MTRMBLD01', storeName: 'ALPRO MATARAM',                category: 'BRONZE',   am: 'YULI ASTUTI',     region: 'MATARAM' },
  { shortCode: 'PNKPML01',  storeName: 'ALPRO PALANGKARAYA MALL',      category: 'BRONZE',   am: 'DAVID LUMBAN',    region: 'PALANGKARAYA' },
];

// ==================== LIST PRODUK KOMPETISI ====================
export const DEFAULT_PRODUCT_COMPETITION = {
  BLACKMORES: {
    name: 'Blackmores',
    emoji: '💊',
    period: 'April – Juni 2026',
    target_qty: 750,
    target_net_sales: 300_000_000,
    tiers: { TITANIUM: 20, PLATINUM: 20, GOLD: 20, SILVER: 12, BRONZE: 8, REGULER: 5 },
    items: [
      { itemCode: '100008671', itemName: 'Blackmores Vitamin C 500mg' },
      { itemCode: '100008672', itemName: 'Blackmores Bio Calcium' },
      { itemCode: '100008673', itemName: 'Blackmores Omega Women' },
      { itemCode: '100008674', itemName: "Blackmores Men's Vitality" },
      { itemCode: '100008675', itemName: 'Blackmores Probiotics Daily' },
      { itemCode: '100008676', itemName: 'Blackmores Executive B' },
      { itemCode: '100008677', itemName: 'Blackmores Glucosamine' },
      { itemCode: '100008678', itemName: 'Blackmores Nature C' },
    ],
  },
  FAMILY_DR: {
    name: 'Family Dr',
    emoji: '🩺',
    period: 'April – Mei 2026',
    target_qty: 300,
    target_net_sales: 100_000_000,
    tiers: { TITANIUM: 6, PLATINUM: 6, GOLD: 6, SILVER: 4, BRONZE: 2, REGULER: 1 },
    items: [
      { itemCode: '100000736', itemName: 'Family Dr Baby Oil' },
      { itemCode: '100000737', itemName: 'Family Dr Gentle Wash' },
      { itemCode: '100000738', itemName: 'Family Dr Powder' },
      { itemCode: '100000739', itemName: 'Family Dr Lotion' },
    ],
  },
  OMRON: {
    name: 'Omron',
    emoji: '🩸',
    period: 'April – Mei 2026',
    target_qty: 200,
    target_net_sales: 100_000_000,
    tiers: { TITANIUM: 10, PLATINUM: 10, GOLD: 10, SILVER: 6, BRONZE: 3, REGULER: 2 },
    items: [
      { itemCode: '100000302', itemName: 'Omron Blood Pressure Monitor HEM' },
      { itemCode: '100000303', itemName: 'Omron Nebulizer' },
      { itemCode: '100000304', itemName: 'Omron Digital Thermometer' },
    ],
  },
};

// ==================== LOOKUP MAP BUILDERS ====================
export const buildProductMap = (comps) => {
  const map = {};
  Object.entries(comps).forEach(([compKey, compData]) => {
    compData.items.forEach((item) => { map[item.itemCode] = compKey; });
  });
  return map;
};

export const buildAMMap = (masterList) => {
  const map = {};
  masterList.forEach((row) => { map[row.shortCode.toUpperCase()] = row; });
  return map;
};
