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
}
