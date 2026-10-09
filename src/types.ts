/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'Aktiva' | 'Kewajiban' | 'Modal' | 'Pendapatan' | 'Beban';
export type NormalBalance = 'Debit' | 'Kredit';

export interface Account {
  code: string; // Kode Akun, e.g., "1-1001"
  name: string; // Nama Akun, e.g., "Kas dan Bank"
  type: AccountType; // Tipe Akun
  normalBalance: NormalBalance; // Saldo Normal
  initialBalance: number; // Saldo Awal
  description?: string; // Deskripsi
}

export interface Transaction {
  id: string; // ID unik transaksi
  date: string; // Tanggal transaksi YYYY-MM-DD
  refNum: string; // Nomor referensi transaksi, e.g., "TRX-1001"
  description: string; // Keterangan transaksi
  debitAccount: string; // Kode akun debit
  creditAccount: string; // Kode akun kredit
  amount: number; // Jumlah nominal (Rupiah)
  createdAt: string; // Timestamp pembuatan
}

export interface JournalEntry {
  id: string;
  date: string;
  refNum: string;
  description: string;
  code: string; // Kode akun
  accountName: string; // Nama akun
  type: AccountType;
  debit: number;
  credit: number;
}

export interface TrialBalanceItem {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface ProfitLossReport {
  revenue: { code: string; name: string; amount: number }[];
  expenses: { code: string; name: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  assets: { code: string; name: string; amount: number }[];
  liabilities: { code: string; name: string; amount: number }[];
  equity: { code: string; name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netProfitCurrentPeriod: number; // Laba bersih periode berjalan untuk penyeimbang
}

export interface CashFlowReport {
  operatingIn: { code: string; name: string; amount: number }[];
  operatingOut: { code: string; name: string; amount: number }[];
  investingIn: { code: string; name: string; amount: number }[];
  investingOut: { code: string; name: string; amount: number }[];
  financingIn: { code: string; name: string; amount: number }[];
  financingOut: { code: string; name: string; amount: number }[];
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export interface FinanceNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  isRead: boolean;
}

export interface SavedCalculation {
  id: string;
  productName: string;
  qty: number;
  rawMaterialType?: 'baju_jadi' | 'kain' | 'both';
  blankApparelName?: string;
  blankApparelQty?: number;
  blankApparelPrice?: number;
  blankApparelTotal?: number;
  fabricUnit?: string;
  fabricQty?: number;
  fabricPrice?: number;
  fabricRibQty?: number;
  fabricRibPrice?: number;
  fabricCost: number;
  printCostPerPiece?: number;
  printCost: number;
  cmtCostPerPiece?: number;
  cmtCost: number;
  wovenLabelPrice?: number;
  hangtagPrice?: number;
  washingLabelPrice?: number;
  accessoriesCost: number;
  bagPrice?: number;
  stickerPrice?: number;
  boxPrice?: number;
  packagingCost: number;
  otherCost: number;
  otherCostTotal?: number;
  totalCost: number;
  hppPerPiece: number;
  targetMargin: number;
  wholesaleMargin?: number;
  retailPrice: number;
  wholesalePrice: number;
  isBenchmark?: boolean;
  notes?: string;
  createdAt: string;
}

export interface FinancialSummaryData {
  totalRevenue: number;
  totalHPP: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalCash: number;
  totalReceivables: number;
  totalInventory: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isTrialBalanced: boolean;
  trialBalanceDiff: number;
  lastUpdated: string;
  // Additional feature metrics automatically synced to RINGKASAN_KEUANGAN
  totalInventoryForSaleValue?: number;
  totalInventoryInternalValue?: number;
  totalStockAvailableProducts?: number;
  totalStockUnavailableProducts?: number;
  totalStockNotForSaleProducts?: number;
  totalStockCountedPcs?: number;
  totalStockUncountedPcs?: number;
  totalPendingSalesCount?: number;
  totalPendingSalesNet?: number;
  totalSettledSalesCount?: number;
  totalSettledSalesNet?: number;
}

export interface MarketplacePricingHistory {
  id: string;
  productName: string;
  hpp: number;
  mode: 'target' | 'simulate';
  targetProfit: number;
  sellingPrice: number;
  date: string;
}

export type SaleChannel =
  | 'Shopee'
  | 'TikTok Shop'
  | 'Lazada'
  | 'Tokopedia'
  | 'WhatsApp / Direct'
  | 'Offline / Toko'
  | 'Reseller / Grosir';

export type SaleStatus = 'pending' | 'settled';

export interface SaleOrder {
  id: string;
  orderDate: string; // YYYY-MM-DD (tanggal pesanan dibuat)
  settledDate?: string; // YYYY-MM-DD (tanggal dana cair / dilepas dari pending)
  invoiceNum: string; // Nomor pesanan / invoice, e.g., "SHP-261008-01"
  channel: SaleChannel;
  customerName: string;
  productName: string;
  qty: number;
  unitPrice: number; // Harga jual etalase per pcs
  discountAmount: number; // Total potongan diskon toko (Rp)
  grossTransacted: number; // Total yang dibayar pembeli = (qty * unitPrice) - discountAmount
  marketplaceFee: number; // Potongan admin/komisi marketplace (Rp)
  netPayout: number; // Dana bersih yang akan/sudah cair = grossTransacted - marketplaceFee
  hppPerPiece: number; // HPP per pcs
  totalHpp: number; // Total HPP = qty * hppPerPiece
  estimatedNetProfit: number; // Laba bersih pesanan = netPayout - totalHpp
  status: SaleStatus; // 'pending' (tertahan di marketplace) | 'settled' (sudah cair & masuk transaksi/jurnal)
  targetAccountCode: string; // Kode akun Kas/Bank penerima (misal '1-1003' Sea Bank / '1-1002' BCA)
  revenueAccountCode: string; // Kode akun Pendapatan (misal '4-1001')
  feeAccountCode?: string; // Kode akun Beban Admin/Pemasaran (misal '5-1008')
  recordFeeSeparately?: boolean; // Apakah potongan marketplace dicatat terpisah sebagai beban
  recordHppAuto?: boolean; // Apakah HPP dicatat otomatis ke jurnal saat cair
  hppDebitAccountCode?: string; // '5-1001'
  hppCreditAccountCode?: string; // '1-1005'
  linkedTransactionIds?: string[]; // ID transaksi di Pencatatan Transaksi Keuangan setelah dilepas
  notes?: string;
  createdAt: string;
}

export type InventoryCategory = 'for_sale' | 'internal_use';

export type ProductAvailabilityStatus = 'available' | 'unavailable' | 'not_for_sale';

export interface InventoryVariantStock {
  id: string;
  variantName: string; // e.g., "Size S", "Size M", "Size L", "Size XL", "Size XXL", "All Size"
  skuCode: string; // Kode SKU spesifik varian, otomatis dari SKU produk induk (misal "TM-TS24-BLK-S")
  totalQty: number; // Stok masuk varian ini
  usedOrSoldQty: number; // Sudah terjual / terpakai varian ini
  remainingQty: number; // Stok tersedia varian ini = totalQty - usedOrSoldQty
  isAvailable?: boolean; // Status Tersedia (true) atau Tidak Tersedia / Nonaktif (false) yang bisa di-edit
}

export interface InventoryItem {
  id: string;
  sku: string; // Kode Barang / SKU, otomatis sesuai spesifikasi & nama produk, e.g., "TM-LP-OVS-SMR-BLK-01"
  name: string; // Nama barang / artikel
  productSleeve?: string; // Produk: 'Lengan Pendek' | 'Lengan Panjang'
  designStyle?: string; // Style desain, e.g., 'Oversize', 'Regular Fit', 'Boxy'
  designGraphic?: string; // Gambar desain, e.g., 'Samurai', 'Typography', 'Polos'
  productColor?: string; // Warna produk, e.g., 'Hitam', 'Putih', 'Navy'
  designNumber?: string; // Nomor desain, e.g., '01', '02', '03'
  category: InventoryCategory; // 'for_sale' (Barang untuk Dijual) | 'internal_use' (Barang untuk Dipakai / Tidak Dijual)
  subCategory: string; // e.g., "Kaos / T-Shirt", "Hoodie / Outerwear", "Kemasan & Packing", "Alat Studio & Toko"
  unit: string; // e.g., "pcs", "pack", "roll", "unit", "set"
  totalQty: number; // Total stok masuk / dimiliki
  usedOrSoldQty: number; // Jumlah yang sudah terjual (untuk for_sale) atau sudah terpakai/habis (untuk internal_use)
  remainingQty: number; // Jumlah yang belum terjual / masih tersedia = totalQty - usedOrSoldQty
  isAvailable?: boolean; // Status ketersediaan produk (Tersedia / Tidak Tersedia) yang bisa di-edit
  availabilityStatus?: ProductAvailabilityStatus; // 'available' (Tersedia) | 'unavailable' (Tidak Tersedia / Habis) | 'not_for_sale' (Produk Tidak Dijual -> otomatis masuk Stock Tidak Terhitung)
  unitCost: number; // HPP per pcs (untuk for_sale) atau Harga Beli/Perolehan per unit (untuk internal_use)
  sellingPrice?: number; // Harga jual etalase per pcs (khusus for_sale, 0 untuk internal_use)
  totalRemainingValue: number; // Nilai total belum terjual / sisa pakai = remainingQty * unitCost
  accountCode: string; // Kode Akun COA tujuan (misal '1-1005' Persediaan Barang, '1-1006' Perlengkapan, '1-2001' Peralatan)
  variants?: InventoryVariantStock[]; // Rincian stok mana saja yang tersedia per ukuran/varian beserta sub-SKU
  location?: string; // Lokasi penyimpanan / etalase (misal "Rak Gudang A1 - Etalase Shopee & TikTok")
  notes?: string;
  updatedAt: string;
}


