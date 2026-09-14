/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Account, Transaction } from '../types';
import { 
  TrendingUp, 
  Scale, 
  Wallet, 
  Printer, 
  ChevronDown, 
  Percent, 
  Info, 
  Calendar,
  BarChart3,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Coins,
  FileDown,
  Check
} from 'lucide-react';
import { 
  exportProfitLossPDF, 
  exportBalanceSheetPDF, 
  exportCashFlowPDF, 
  exportCompleteFinancialReportPDF 
} from '../utils/pdfExport';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';

interface ReportsProps {
  accounts: Account[];
  transactions: Transaction[];
}

type ReportTab = 'laba-rugi' | 'neraca' | 'arus-kas' | 'perubahan-modal' | 'analisis-tren';

export default function Reports({ accounts, transactions }: ReportsProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('laba-rugi');
  
  // Filtering states (default to current month or show all)
  const [selectedMonth, setSelectedMonth] = useState<string>('Semua'); // 'Semua' or '01' - '12'
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  const triggerPdfToast = (msg: string) => {
    setPdfSuccessToast(msg);
    setTimeout(() => {
      setPdfSuccessToast(null);
    }, 4000);
  };

  // Helper to check if transaction date matches selected month/year
  const filterTransactions = (txs: Transaction[]) => {
    return txs.filter(t => {
      const dateObj = new Date(t.date);
      const year = dateObj.getFullYear().toString();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      
      const yearMatches = selectedYear === 'Semua' || year === selectedYear;
      const monthMatches = selectedMonth === 'Semua' || month === selectedMonth;
      
      return yearMatches && monthMatches;
    });
  };

  const activeTxs = filterTransactions(transactions);

  // General helper to compute current balance of any account based on filtered transactions
  const getAccountBalance = (acc: Account, txList: Transaction[] = activeTxs) => {
    let debits = 0;
    let credits = 0;

    txList.forEach(t => {
      if (t.debitAccount === acc.code) debits += t.amount;
      if (t.creditAccount === acc.code) credits += t.amount;
    });

    if (acc.type === 'Aktiva' || acc.type === 'Beban') {
      return acc.initialBalance + debits - credits;
    } else {
      return acc.initialBalance + credits - debits;
    }
  };

  // Helper to format currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // ================= LABA RUGI CALCULATIONS =================
  const revenueAccounts = accounts.filter(a => a.type === 'Pendapatan');
  const expenseAccounts = accounts.filter(a => a.type === 'Beban');

  const revenueList = revenueAccounts.map(acc => ({
    code: acc.code,
    name: acc.name,
    amount: getAccountBalance(acc)
  })).filter(a => a.amount !== 0);

  const expenseList = expenseAccounts.map(acc => ({
    code: acc.code,
    name: acc.name,
    amount: getAccountBalance(acc)
  })).filter(a => a.amount !== 0);

  const totalRevenue = revenueList.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseList.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Split into HPP and OPEX for Clothing Brand specificity
  const hppList = expenseList.filter(item => item.code === '5-1001' || item.name.toLowerCase().includes('harga pokok'));
  const opexList = expenseList.filter(item => item.code !== '5-1001' && !item.name.toLowerCase().includes('harga pokok'));

  const totalHPP = hppList.reduce((sum, item) => sum + item.amount, 0);
  const labaKotor = totalRevenue - totalHPP;
  const totalOPEX = opexList.reduce((sum, item) => sum + item.amount, 0);

  // ================= NERACA CALCULATIONS =================
  const assetAccounts = accounts.filter(a => a.type === 'Aktiva');
  const liabilityAccounts = accounts.filter(a => a.type === 'Kewajiban');
  const equityAccounts = accounts.filter(a => a.type === 'Modal');

  const assetList = assetAccounts.map(acc => ({
    code: acc.code,
    name: acc.name,
    amount: getAccountBalance(acc)
  })).filter(a => a.amount !== 0);

  const liabilityList = liabilityAccounts.map(acc => ({
    code: acc.code,
    name: acc.name,
    amount: getAccountBalance(acc)
  })).filter(a => a.amount !== 0);

  // For Equity, we list regular equity accounts + add the Current Period's Net Profit!
  const equityList = equityAccounts.map(acc => ({
    code: acc.code,
    name: acc.name,
    amount: getAccountBalance(acc)
  })).filter(a => a.amount !== 0);

  const totalAssets = assetList.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilityList.reduce((sum, item) => sum + item.amount, 0);
  const totalEquityBeforeProfit = equityList.reduce((sum, item) => sum + item.amount, 0);
  const totalEquity = totalEquityBeforeProfit + netProfit;

  // ================= ARUS KAS CALCULATIONS =================
  // Cash & Bank account codes: e.g., 1-1000, 1-1100
  const cashCodes = ['1-1000', '1-1100'];

  const operatingInList: { desc: string; amount: number }[] = [];
  const operatingOutList: { desc: string; amount: number }[] = [];
  const investingInList: { desc: string; amount: number }[] = [];
  const investingOutList: { desc: string; amount: number }[] = [];
  const financingInList: { desc: string; amount: number }[] = [];
  const financingOutList: { desc: string; amount: number }[] = [];

  // Analyze active transactions affecting cash
  activeTxs.forEach(t => {
    const isDebitCash = cashCodes.includes(t.debitAccount);
    const isCreditCash = cashCodes.includes(t.creditAccount);

    // If both are cash accounts (e.g. internal bank transfer), cash flow is neutral
    if (isDebitCash && isCreditCash) return;

    if (isDebitCash) {
      // Cash Inflow: Debit is cash, check credit account
      const otherAcc = accounts.find(a => a.code === t.creditAccount);
      if (!otherAcc) return;

      if (otherAcc.type === 'Pendapatan') {
        operatingInList.push({ desc: `Penerimaan Penjualan (${otherAcc.name})`, amount: t.amount });
      } else if (otherAcc.code === '1-1200') {
        operatingInList.push({ desc: 'Penerimaan Pelunasan Piutang Ritel', amount: t.amount });
      } else if (otherAcc.code === '2-1000') {
        operatingInList.push({ desc: 'Penerimaan Kredit/Term Pembelian', amount: t.amount });
      } else if (otherAcc.code === '3-1000') {
        financingInList.push({ desc: 'Penerimaan Setoran Modal Pemilik', amount: t.amount });
      } else if (otherAcc.code === '2-2000') {
        financingInList.push({ desc: 'Penerimaan Kucuran Pinjaman Bank', amount: t.amount });
      } else {
        operatingInList.push({ desc: `Penerimaan Kas Lainnya (${otherAcc.name})`, amount: t.amount });
      }
    } else if (isCreditCash) {
      // Cash Outflow: Credit is cash, check debit account
      const otherAcc = accounts.find(a => a.code === t.debitAccount);
      if (!otherAcc) return;

      if (otherAcc.type === 'Beban' || otherAcc.code === '5-1000') {
        operatingOutList.push({ desc: `Pembayaran ${otherAcc.name}`, amount: t.amount });
      } else if (otherAcc.code === '1-1300' || otherAcc.code === '1-1310') {
        operatingOutList.push({ desc: `Pembelian/Belanja ${otherAcc.name}`, amount: t.amount });
      } else if (otherAcc.code === '1-2000') {
        investingOutList.push({ desc: 'Belanja Aset Tetap (Peralatan Konveksi)', amount: t.amount });
      } else if (otherAcc.code === '2-1000') {
        operatingOutList.push({ desc: 'Pelunasan Utang Usaha ke Supplier', amount: t.amount });
      } else if (otherAcc.code === '3-1200') {
        financingOutList.push({ desc: 'Penarikan Dana Prive Pemilik', amount: t.amount });
      } else if (otherAcc.code === '2-2000') {
        financingOutList.push({ desc: 'Pembayaran Angsuran Kredit Bank', amount: t.amount });
      } else {
        operatingOutList.push({ desc: `Pengeluaran Kas Lainnya (${otherAcc.name})`, amount: t.amount });
      }
    }
  });

  // Calculate cash flow totals
  const totalOperatingIn = operatingInList.reduce((sum, i) => sum + i.amount, 0);
  const totalOperatingOut = operatingOutList.reduce((sum, i) => sum + i.amount, 0);
  const netOperating = totalOperatingIn - totalOperatingOut;

  const totalInvestingIn = investingInList.reduce((sum, i) => sum + i.amount, 0);
  const totalInvestingOut = investingOutList.reduce((sum, i) => sum + i.amount, 0);
  const netInvesting = totalInvestingIn - totalInvestingOut;

  const totalFinancingIn = financingInList.reduce((sum, i) => sum + i.amount, 0);
  const totalFinancingOut = financingOutList.reduce((sum, i) => sum + i.amount, 0);
  const netFinancing = totalFinancingIn - totalFinancingOut;

  const netCashFlow = netOperating + netInvesting + netFinancing;

  // Beginning Cash & Ending Cash calculations
  // Beginning Cash = initialBalance of all cash accounts (for this filter)
  const cashAccounts = accounts.filter(a => cashCodes.includes(a.code));
  const beginningCash = cashAccounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
  const endingCash = beginningCash + netCashFlow;

  // ================= TREN CALCULATIONS =================
  const getMonthlyTrendData = () => {
    const trendData = [
      { name: 'Jan', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '01' },
      { name: 'Feb', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '02' },
      { name: 'Mar', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '03' },
      { name: 'Apr', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '04' },
      { name: 'Mei', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '05' },
      { name: 'Jun', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '06' },
      { name: 'Jul', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '07' },
      { name: 'Agt', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '08' },
      { name: 'Sep', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '09' },
      { name: 'Okt', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '10' },
      { name: 'Nov', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '11' },
      { name: 'Des', Pendapatan: 0, Beban: 0, 'Laba Bersih': 0, monthNum: '12' },
    ];

    const yearFilteredTxs = transactions.filter(t => {
      const dateObj = new Date(t.date);
      const year = dateObj.getFullYear().toString();
      return selectedYear === 'Semua' || year === selectedYear;
    });

    yearFilteredTxs.forEach(t => {
      const dateObj = new Date(t.date);
      const monthIdx = dateObj.getMonth();
      if (monthIdx >= 0 && monthIdx <= 11) {
        const debitAcc = accounts.find(a => a.code === t.debitAccount);
        const creditAcc = accounts.find(a => a.code === t.creditAccount);

        if (debitAcc) {
          if (debitAcc.type === 'Pendapatan') {
            trendData[monthIdx].Pendapatan -= t.amount;
          } else if (debitAcc.type === 'Beban') {
            trendData[monthIdx].Beban += t.amount;
          }
        }

        if (creditAcc) {
          if (creditAcc.type === 'Pendapatan') {
            trendData[monthIdx].Pendapatan += t.amount;
          } else if (creditAcc.type === 'Beban') {
            trendData[monthIdx].Beban -= t.amount;
          }
        }
      }
    });

    trendData.forEach(item => {
      item['Laba Bersih'] = item.Pendapatan - item.Beban;
    });

    return trendData;
  };

  const trendData = getMonthlyTrendData();

  // Yearly Summary Stats
  const yearlyTotalRevenue = trendData.reduce((sum, item) => sum + item.Pendapatan, 0);
  const yearlyTotalExpenses = trendData.reduce((sum, item) => sum + item.Beban, 0);
  const yearlyTotalNetProfit = yearlyTotalRevenue - yearlyTotalExpenses;
  const yearlyProfitMargin = yearlyTotalRevenue > 0 ? (yearlyTotalNetProfit / yearlyTotalRevenue) * 100 : 0;

  // Find peak months
  const maxRevenueMonth = [...trendData].sort((a, b) => b.Pendapatan - a.Pendapatan)[0];
  const maxExpenseMonth = [...trendData].sort((a, b) => b.Beban - a.Beban)[0];
  const maxProfitMonth = [...trendData].sort((a, b) => b['Laba Bersih'] - a['Laba Bersih'])[0];

  // Axis formatters for chart
  const formatYAxis = (tick: number) => {
    if (tick >= 1000000000) return `${(tick / 1000000000).toFixed(1)} M`;
    if (tick >= 1000000) return `${(tick / 1000000).toFixed(0)} Jt`;
    if (tick >= 1000) return `${(tick / 1000).toFixed(0)} Rb`;
    return tick.toString();
  };

  // Custom tooltips matching theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-100 shadow-xl space-y-2.5 text-xs">
          <p className="font-bold text-slate-900 border-b pb-1.5 border-slate-100">{label} {selectedYear !== 'Semua' ? selectedYear : ''}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-slate-500 font-medium">{p.name}:</span>
              </div>
              <span className="font-mono font-bold text-slate-800">{formatIDR(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  const getPeriodText = () => {
    const monthName = monthsOpt.find(m => m.value === selectedMonth)?.label || 'Seluruh Bulan';
    return `${monthName} ${selectedYear !== 'Semua' ? selectedYear : ''}`.trim();
  };

  const handleDownloadProfitLossPDF = () => {
    exportProfitLossPDF({
      periodText: getPeriodText(),
      revenueList,
      hppList,
      opexList,
      totalRevenue,
      totalHPP,
      labaKotor,
      totalOPEX,
      netProfit,
    });
    triggerPdfToast('Laporan Laba Rugi PDF berhasil diunduh.');
  };

  const handleDownloadBalanceSheetPDF = () => {
    exportBalanceSheetPDF({
      periodText: getPeriodText(),
      assetList,
      liabilityList,
      equityList,
      totalAssets,
      totalLiabilities,
      totalEquityBeforeProfit,
      netProfit,
      totalEquity,
    });
    triggerPdfToast('Laporan Neraca Keuangan PDF berhasil diunduh.');
  };

  const handleDownloadCashFlowPDF = () => {
    exportCashFlowPDF({
      periodText: getPeriodText(),
      operatingInList,
      operatingOutList,
      investingInList,
      investingOutList,
      financingInList,
      financingOutList,
      netOperating,
      netInvesting,
      netFinancing,
      netCashFlow,
      beginningCash,
      endingCash,
    });
    triggerPdfToast('Laporan Arus Kas PDF berhasil diunduh.');
  };

  const handleDownloadAllPDF = () => {
    exportCompleteFinancialReportPDF({
      periodText: getPeriodText(),
      profitLoss: {
        periodText: getPeriodText(),
        revenueList,
        hppList,
        opexList,
        totalRevenue,
        totalHPP,
        labaKotor,
        totalOPEX,
        netProfit,
      },
      balanceSheet: {
        periodText: getPeriodText(),
        assetList,
        liabilityList,
        equityList,
        totalAssets,
        totalLiabilities,
        totalEquityBeforeProfit,
        netProfit,
        totalEquity,
      },
      cashFlow: {
        periodText: getPeriodText(),
        operatingInList,
        operatingOutList,
        investingInList,
        investingOutList,
        financingInList,
        financingOutList,
        netOperating,
        netInvesting,
        netFinancing,
        netCashFlow,
        beginningCash,
        endingCash,
      },
    });
    triggerPdfToast('Paket Lengkap Laporan Keuangan PDF (3 Hal) berhasil diunduh.');
  };

  const monthsOpt = [
    { value: 'Semua', label: 'Seluruh Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  return (
    <div id="financial-reports" className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Laporan Keuangan & Profitabilitas</h2>
            <p className="text-slate-500 text-xs mt-0.5">Analisis hasil usaha dan aset clothing brand Anda secara akurat.</p>
          </div>
        </div>

        {/* Month/Year Filter selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-medium">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              {monthsOpt.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs font-medium">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="Semua">Seluruh Tahun</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>

          {/* Unduh Dokumen PDF Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
              className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
              title="Unduh Laporan Keuangan ke format PDF (jsPDF)"
            >
              <FileDown className="w-4 h-4 text-amber-300" />
              <span>Unduh PDF</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform ${isPdfDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPdfDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setIsPdfDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-150 p-2 z-30 space-y-1 text-xs">
                  <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100 flex items-center justify-between">
                    <span>Format PDF (jsPDF)</span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Rapi & Siap Cetak</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      handleDownloadProfitLossPDF();
                      setIsPdfDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition text-left cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">Laporan Laba Rugi</div>
                      <div className="text-[10px] text-slate-400">Omset, HPP, OPEX & Laba Bersih</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      handleDownloadBalanceSheetPDF();
                      setIsPdfDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition text-left cursor-pointer"
                  >
                    <Scale className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">Neraca Keuangan</div>
                      <div className="text-[10px] text-slate-400">Posisi Aset, Utang & Ekuitas Modal</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      handleDownloadCashFlowPDF();
                      setIsPdfDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition text-left cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900">Laporan Arus Kas</div>
                      <div className="text-[10px] text-slate-400">Arus Kas Masuk, Keluar & Saldo Akhir</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      handleDownloadAllPDF();
                      setIsPdfDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#580001] hover:bg-[#430001] text-white font-semibold transition text-left cursor-pointer shadow-sm"
                  >
                    <FileDown className="w-4 h-4 text-amber-300 shrink-0" />
                    <div>
                      <div className="text-white font-bold">Paket Lengkap Laporan (All-in-One)</div>
                      <div className="text-[10px] text-white/80">Laba Rugi + Neraca + Arus Kas</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reports Nav Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-100 shadow-sm gap-1.5">
        <button
          onClick={() => setActiveTab('laba-rugi')}
          className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === 'laba-rugi'
              ? 'bg-[#580001] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-[#580001] hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span className="truncate">Laba Rugi</span>
        </button>
        <button
          onClick={() => setActiveTab('neraca')}
          className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === 'neraca'
              ? 'bg-[#580001] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-[#580001] hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span className="truncate">Neraca</span>
        </button>
        <button
          onClick={() => setActiveTab('arus-kas')}
          className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === 'arus-kas'
              ? 'bg-[#580001] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-[#580001] hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span className="truncate">Arus Kas</span>
        </button>
        <button
          onClick={() => setActiveTab('perubahan-modal')}
          className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === 'perubahan-modal'
              ? 'bg-[#580001] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-[#580001] hover:bg-slate-50'
          }`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span className="truncate">Perubahan Modal</span>
        </button>
        <button
          onClick={() => setActiveTab('analisis-tren')}
          className={`col-span-2 sm:col-span-1 py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === 'analisis-tren'
              ? 'bg-[#580001] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-[#580001] hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span className="truncate">Analisis Tren</span>
        </button>
      </div>

      {/* Dynamic Report Content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-8 print:p-0 print:border-none print:shadow-none overflow-x-auto">
        
        {/* Printable Brand Header */}
        <div className="hidden print:block text-center border-b pb-6 mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#580001]">THREE MISTER</h1>
          <p className="text-slate-500 text-sm mt-1">MANAGEMENT SYSTEM • SISTEM PELAPORAN KEUANGAN</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Periode: {monthsOpt.find(m => m.value === selectedMonth)?.label} {selectedYear !== 'Semua' ? selectedYear : ''}
          </p>
        </div>

        {/* 1. LABA RUGI REPORT */}
        {activeTab === 'laba-rugi' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Laporan Laba Rugi (Income Statement)</h3>
                <p className="text-slate-500 text-xs mt-0.5">Memantau total omset, HPP, beban operasional, dan laba bersih usaha clothing brand Anda.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadProfitLossPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                  title="Unduh Salinan PDF Laba Rugi Resmi"
                >
                  <FileDown className="w-4 h-4 text-emerald-600" />
                  <span>Unduh PDF Laba Rugi</span>
                </button>
                <div className="text-slate-400 text-xs italic hidden sm:block">
                  Standar Akuntansi PSAK SAK-EMKM
                </div>
              </div>
            </div>

            {/* Income Statement Table */}
            <div className="space-y-6">
              {/* PENDAPATAN */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-[#580001] text-white text-[10px]">I</span>
                  Pendapatan (Revenue)
                </h4>
                <div className="divide-y divide-slate-100 pl-4">
                  {revenueList.length > 0 ? (
                    revenueList.map(item => (
                      <div key={item.code} className="flex justify-between py-2.5 text-sm">
                        <span className="text-slate-600">{item.code} - {item.name}</span>
                        <span className="font-mono text-slate-800">{formatIDR(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2.5 text-slate-400 text-xs italic">Tidak ada pendapatan tercatat pada periode ini.</div>
                  )}
                  <div className="flex justify-between py-3 text-sm font-bold border-t border-slate-200 mt-2 bg-slate-50 px-3 rounded-lg">
                    <span>TOTAL PENDAPATAN (Total Penjualan Baju)</span>
                    <span className="font-mono text-slate-950">{formatIDR(totalRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* HARGA POKOK PENJUALAN */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-[#580001] text-white text-[10px]">II</span>
                  Harga Pokok Penjualan (HPP) <span className="text-[10px] text-slate-400 font-normal normal-case italic ml-1">(Biaya langsung: kain, sablon, jahit, hangtag, polymailer)</span>
                </h4>
                <div className="divide-y divide-slate-100 pl-4">
                  {hppList.length > 0 ? (
                    hppList.map(item => (
                      <div key={item.code} className="flex justify-between py-2.5 text-sm">
                        <span className="text-slate-600">{item.code} - {item.name}</span>
                        <span className="font-mono text-slate-850">{formatIDR(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2.5 text-slate-400 text-xs italic">Tidak ada HPP tercatat pada periode ini.</div>
                  )}
                  <div className="flex justify-between py-3 text-sm font-bold border-t border-slate-200 mt-2 bg-slate-50 px-3 rounded-lg text-slate-850">
                    <span>TOTAL HARGA POKOK PENJUALAN (HPP)</span>
                    <span className="font-mono text-slate-950">{formatIDR(totalHPP)}</span>
                  </div>
                </div>
              </div>

              {/* LABA KOTOR CARD & HPP RATIO ANALYSIS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4.5 bg-[#580001] text-white rounded-2xl border border-[#580001] flex flex-col justify-between shadow-md">
                  <div>
                    <h5 className="font-bold text-white/80 text-[10px] uppercase tracking-wider">LABA KOTOR (GROSS PROFIT)</h5>
                    <p className="text-[9px] text-white/60 mt-0.5">Rumus: Omset Penjualan - Total HPP</p>
                  </div>
                  <div className="font-mono text-xl font-bold text-white mt-3">
                    {formatIDR(labaKotor)}
                  </div>
                </div>

                <div className="p-4.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <h5 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Rasio HPP (COGS Ratio)</h5>
                      <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        {totalRevenue > 0 ? `${((totalHPP / totalRevenue) * 100).toFixed(1)}%` : '0.0%'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">Persentase biaya langsung dari total pendapatan</p>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-3 font-medium">
                    {totalRevenue > 0 ? (() => {
                      const ratio = (totalHPP / totalRevenue) * 100;
                      if (ratio <= 35) {
                        return <span className="text-emerald-600 font-semibold flex items-center gap-1">🟢 Sangat Efisien (A+) — Kontrol biaya produksi luar biasa.</span>;
                      } else if (ratio <= 50) {
                        return <span className="text-indigo-600 font-semibold flex items-center gap-1">🔵 Normal & Sehat (B) — Margin standar clothing brand.</span>;
                      } else {
                        return <span className="text-amber-600 font-semibold flex items-center gap-1">⚠️ Perlu Evaluasi (C) — Biaya bahan/makloon terlalu tinggi.</span>;
                      }
                    })() : <span className="text-slate-400">— Menunggu data penjualan</span>}
                  </div>
                </div>

                <div className="p-4.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <h5 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Gross Profit Margin (%)</h5>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        {totalRevenue > 0 ? `${((labaKotor / totalRevenue) * 100).toFixed(1)}%` : '0.0%'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">Profitabilitas produksi sebelum dikurangi OPEX</p>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-3">
                    {totalRevenue > 0 ? (
                      <p className="text-slate-500">Mampu menyerap beban sewa & pemasaran sebesar <strong className="text-slate-800 font-mono">{((labaKotor / totalRevenue) * 100).toFixed(0)}%</strong> dari omset.</p>
                    ) : (
                      <p className="text-slate-400">— Menunggu transaksi penjualan</p>
                    )}
                  </div>
                </div>
              </div>

              {/* BIAYA OPERASIONAL (OPEX) */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-[#580001] text-white text-[10px]">III</span>
                  Biaya Operasional (OPEX) <span className="text-[10px] text-slate-400 font-normal normal-case italic ml-1">(Biaya tidak langsung: iklan, endorsement, sewa tempat, gaji admin)</span>
                </h4>
                <div className="divide-y divide-slate-100 pl-4">
                  {opexList.length > 0 ? (
                    opexList.map(item => (
                      <div key={item.code} className="flex justify-between py-2.5 text-sm">
                        <span className="text-slate-600">{item.code} - {item.name}</span>
                        <span className="font-mono text-slate-850">{formatIDR(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2.5 text-slate-400 text-xs italic">Tidak ada pengeluaran operasional tercatat pada periode ini.</div>
                  )}
                  <div className="flex justify-between py-3 text-sm font-bold border-t border-slate-200 mt-2 bg-slate-50 px-3 rounded-lg text-slate-850">
                    <span>TOTAL BIAYA OPERASIONAL (OPEX)</span>
                    <span className="font-mono text-slate-950">{formatIDR(totalOPEX)}</span>
                  </div>
                </div>
              </div>

              {/* NET PROFIT SUMMARY BOX */}
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${
                netProfit >= 0 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-950' 
                  : 'bg-rose-50 border-rose-100 text-rose-950'
              }`}>
                <div>
                  <h5 className="font-bold text-sm uppercase tracking-wider">LABA BERSIH PERIODE BERJALAN (NET PROFIT)</h5>
                  <p className={`text-xs mt-1 ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {netProfit >= 0 
                      ? 'Selamat! Bisnis clothing brand Anda membukukan keuntungan (profit) pada periode ini.'
                      : 'Peringatan: Bisnis clothing brand Anda mengalami kerugian pada periode berjalan ini.'
                    }
                  </p>
                </div>
                <div className="font-mono text-2xl font-bold tracking-tight">
                  {formatIDR(netProfit)}
                </div>
              </div>

              {/* Custom SVG Analysis Widget: Profit Margin Bar */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Percent className="w-4 h-4 text-slate-700" />
                  <span>Analisis Profitabilitas (Net Profit Margin)</span>
                </div>
                
                {totalRevenue > 0 ? (
                  (() => {
                    const margin = (netProfit / totalRevenue) * 100;
                    const hppAcc = expenseList.find(e => e.code === '5-1000')?.amount || 0;
                    const hppRatio = (hppAcc / totalRevenue) * 100;
                    const expenseRatio = ((totalExpenses - hppAcc) / totalRevenue) * 100;

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">HPP / COGS</span>
                            <p className="font-mono text-sm font-bold text-slate-800 mt-0.5">{hppRatio.toFixed(1)}%</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Beban Ops</span>
                            <p className="font-mono text-sm font-bold text-slate-800 mt-0.5">{expenseRatio.toFixed(1)}%</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Net Margin</span>
                            <p className="font-mono text-sm font-bold text-emerald-600 mt-0.5">{margin.toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* Horizontal Stacked Bar representing revenue breakdown */}
                        <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
                          <div className="bg-rose-500 h-full" style={{ width: `${Math.max(0, hppRatio)}%` }} title={`HPP: ${hppRatio.toFixed(1)}%`} />
                          <div className="bg-amber-500 h-full" style={{ width: `${Math.max(0, expenseRatio)}%` }} title={`Beban Ops: ${expenseRatio.toFixed(1)}%`} />
                          <div className="bg-emerald-500 h-full flex-1" title={`Net Margin: ${margin.toFixed(1)}%`} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-full"></span> HPP</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Beban Ops</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Net Profit</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-slate-400 text-xs italic">Analisis persentase margin akan otomatis muncul setelah ada pencatatan pendapatan penjualan.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. NERACA KEUANGAN */}
        {activeTab === 'neraca' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Neraca Keuangan (Balance Sheet)</h3>
                <p className="text-slate-500 text-xs mt-0.5">Memantau posisi kekayaan bersih, rincian aset, utang, dan ekuitas modal.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadBalanceSheetPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                  title="Unduh Salinan PDF Neraca Resmi"
                >
                  <FileDown className="w-4 h-4 text-blue-600" />
                  <span>Unduh PDF Neraca</span>
                </button>
                <div className="text-slate-400 text-xs italic hidden sm:block">
                  Aktiva = Kewajiban + Modal
                </div>
              </div>
            </div>

            {/* Assets vs Liabilities & Equity Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ASSETS SECTION */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b border-slate-100">AKTIVA</h4>
                <div className="divide-y divide-slate-100 min-h-[220px]">
                  {assetList.length > 0 ? (
                    assetList.map(item => (
                      <div key={item.code} className="flex justify-between py-2.5 text-sm">
                        <span className="text-slate-600">{item.code} - {item.name}</span>
                        <span className={`font-mono ${item.amount < 0 ? 'text-rose-600 font-medium' : 'text-slate-800'}`}>
                          {item.amount < 0 ? `(${formatIDR(Math.abs(item.amount))})` : formatIDR(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2.5 text-slate-400 text-xs italic">Tidak ada saldo aset terdaftar.</div>
                  )}
                </div>
                <div className="flex justify-between py-3 text-sm font-bold border-t border-slate-200 bg-blue-50/50 px-3.5 rounded-lg text-blue-950">
                  <span>TOTAL AKTIVA</span>
                  <span className="font-mono">{formatIDR(totalAssets)}</span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY SECTION */}
              <div className="space-y-6">
                {/* Kewajiban (Pasiva) */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b border-slate-100">KEWAJIBAN (UTANG)</h4>
                  <div className="divide-y divide-slate-100">
                    {liabilityList.length > 0 ? (
                      liabilityList.map(item => (
                        <div key={item.code} className="flex justify-between py-2.5 text-sm">
                          <span className="text-slate-600">{item.code} - {item.name}</span>
                          <span className="font-mono text-slate-800">{formatIDR(item.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2.5 text-slate-400 text-xs italic">Tidak ada saldo kewajiban utang.</div>
                    )}
                  </div>
                  <div className="flex justify-between py-2 text-xs font-bold border-t border-slate-150 text-slate-600 px-1 mt-1">
                    <span>Total Kewajiban:</span>
                    <span className="font-mono">{formatIDR(totalLiabilities)}</span>
                  </div>
                </div>

                {/* Ekuitas (Modal) */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b border-slate-100">MODAL</h4>
                  <div className="divide-y divide-slate-100">
                    {equityList.map(item => (
                      <div key={item.code} className="flex justify-between py-2.5 text-sm">
                        <span className="text-slate-600">{item.code} - {item.name}</span>
                        <span className="font-mono text-slate-800">{formatIDR(item.amount)}</span>
                      </div>
                    ))}
                    {/* Include Laba Bersih Periode Berjalan */}
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-slate-600 italic">Laba Bersih Periode Berjalan</span>
                      <span className="font-mono text-emerald-600 font-semibold">{formatIDR(netProfit)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-2 text-xs font-bold border-t border-slate-150 text-slate-600 px-1 mt-1">
                    <span>Total Modal:</span>
                    <span className="font-mono">{formatIDR(totalEquity)}</span>
                  </div>
                </div>

                {/* Pasiva Total */}
                <div className="flex justify-between py-3 text-sm font-bold border-t border-slate-200 bg-amber-50/50 px-3.5 rounded-lg text-amber-950">
                  <span>TOTAL PASIVA (KEWAJIBAN + MODAL)</span>
                  <span className="font-mono">{formatIDR(totalLiabilities + totalEquity)}</span>
                </div>
              </div>
            </div>

            {/* Balanced check badge at bottom of Balance Sheet */}
            {(() => {
              const diff = Math.abs(totalAssets - (totalLiabilities + totalEquity));
              const isBalancedSheet = diff < 0.1;
              return (
                <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  isBalancedSheet 
                    ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800' 
                    : 'bg-rose-50/40 border-rose-100 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      {isBalancedSheet 
                        ? 'Neraca Keuangan berada dalam posisi SEIMBANG (Balanced). Total Aktiva tepat menyamai nilai Pasiva.'
                        : `Peringatan: Terdapat ketidakseimbangan neraca sebesar ${formatIDR(diff)}. Harap periksa saldo awal akun atau keselarasan debit/kredit jurnal.`
                      }
                    </span>
                  </div>
                  <span className={`font-bold px-2 py-1 rounded-lg text-[10px] uppercase tracking-wider ${
                    isBalancedSheet ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isBalancedSheet ? 'PASSED' : 'ERROR'}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. CASH FLOW REPORT */}
        {activeTab === 'arus-kas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Laporan Arus Kas (Cash Flow Statement)</h3>
                <p className="text-slate-500 text-xs mt-0.5">Analisis mutasi uang masuk dan uang keluar yang sesungguhnya (Metode Langsung).</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadCashFlowPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                  title="Unduh Salinan PDF Arus Kas Resmi"
                >
                  <FileDown className="w-4 h-4 text-amber-600" />
                  <span>Unduh PDF Arus Kas</span>
                </button>
                <div className="text-slate-400 text-xs italic hidden sm:block">
                  Menghitung Likuiditas Riil
                </div>
              </div>
            </div>

            {/* Ringkasan Arus Kas Sesuai Kebutuhan Brand */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
              {/* Arus Kas Masuk */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                  <ArrowUpRight className="w-4 h-4 shrink-0 bg-emerald-100 p-0.5 rounded" />
                  <span>1. Arus Kas Masuk</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 pl-1">
                  <div className="flex justify-between">
                    <span>Hasil Penjualan Baju:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatIDR(
                        operatingInList.filter(i => i.desc.toLowerCase().includes('penjualan')).reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modal Awal / Setoran:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatIDR(
                        financingInList.filter(i => i.desc.toLowerCase().includes('modal')).reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pinjaman & Lainnya:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatIDR(
                        financingInList.filter(i => !i.desc.toLowerCase().includes('modal')).reduce((sum, i) => sum + i.amount, 0) +
                        operatingInList.filter(i => !i.desc.toLowerCase().includes('penjualan')).reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1.5 border-slate-100 mt-2 text-slate-900 bg-slate-50/50 p-1.5 rounded">
                    <span>TOTAL MASUK:</span>
                    <span className="font-mono">{formatIDR(totalOperatingIn + totalInvestingIn + totalFinancingIn)}</span>
                  </div>
                </div>
              </div>

              {/* Arus Kas Keluar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                  <ArrowDownRight className="w-4 h-4 shrink-0 bg-rose-100 p-0.5 rounded" />
                  <span>2. Arus Kas Keluar</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 pl-1">
                  <div className="flex justify-between">
                    <span>Bahan Baku & Sablon:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatIDR(
                        operatingOutList.filter(i => i.desc.toLowerCase().includes('persediaan') || i.desc.toLowerCase().includes('pokok penjualan') || i.desc.toLowerCase().includes('belanja persediaan') || i.desc.toLowerCase().includes('bahan')).reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya Iklan & Promosi:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatIDR(
                        operatingOutList.filter(i => i.desc.toLowerCase().includes('pemasaran') || i.desc.toLowerCase().includes('iklan') || i.desc.toLowerCase().includes('endorse')).reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operasional & Lainnya:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatIDR(
                        operatingOutList.filter(i => !i.desc.toLowerCase().includes('persediaan') && !i.desc.toLowerCase().includes('pokok penjualan') && !i.desc.toLowerCase().includes('belanja persediaan') && !i.desc.toLowerCase().includes('bahan') && !i.desc.toLowerCase().includes('pemasaran') && !i.desc.toLowerCase().includes('iklan') && !i.desc.toLowerCase().includes('endorse')).reduce((sum, i) => sum + i.amount, 0) +
                        investingOutList.reduce((sum, i) => sum + i.amount, 0) +
                        financingOutList.reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1.5 border-slate-100 mt-2 text-rose-700 bg-rose-50/50 p-1.5 rounded">
                    <span>TOTAL KELUAR:</span>
                    <span className="font-mono">({formatIDR(totalOperatingOut + totalInvestingOut + totalFinancingOut)})</span>
                  </div>
                </div>
              </div>

              {/* Saldo Akhir Kas */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                    <Wallet className="w-4 h-4 shrink-0 bg-slate-100 p-0.5 rounded" />
                    <span>3. Saldo Kas & Likuiditas</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 pl-1">
                    <div className="flex justify-between">
                      <span>Saldo Awal Kas:</span>
                      <span className="font-mono font-semibold text-slate-700">{formatIDR(beginningCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kenaikan Bersih Kas:</span>
                      <span className={`font-mono font-semibold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {netCashFlow >= 0 ? `+${formatIDR(netCashFlow)}` : `(${formatIDR(Math.abs(netCashFlow))})`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-2 border-slate-100 mt-3">
                  <div className="flex justify-between text-xs font-bold text-white bg-[#580001] p-2.5 rounded shadow-sm">
                    <span>SALDO AKHIR KAS:</span>
                    <span className="font-mono">{formatIDR(endingCash)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* OPERASIONAL */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-1 border-b border-slate-100">
                  A. Arus Kas Dari Aktivitas Operasional
                </h4>
                
                {/* Penerimaan */}
                <div className="pl-4">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">1. Penerimaan Kas</h5>
                  {operatingInList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {operatingInList.map((item, index) => (
                        <div key={index} className="flex justify-between py-2 text-sm pl-2">
                          <span className="text-slate-600 font-light">{item.desc}</span>
                          <span className="font-mono text-slate-800">{formatIDR(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px] italic pl-2">Tidak ada penerimaan kas operasional.</p>
                  )}
                </div>

                {/* Pengeluaran */}
                <div className="pl-4 pt-1">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">2. Pengeluaran Kas</h5>
                  {operatingOutList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {operatingOutList.map((item, index) => (
                        <div key={index} className="flex justify-between py-2 text-sm pl-2">
                          <span className="text-slate-600 font-light">{item.desc}</span>
                          <span className="font-mono text-rose-600 font-light">({formatIDR(item.amount)})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px] italic pl-2">Tidak ada pengeluaran kas operasional.</p>
                  )}
                </div>

                <div className="flex justify-between py-2.5 text-sm font-bold bg-slate-50 px-3 rounded-lg border border-slate-100">
                  <span>Kas Bersih Dari Aktivitas Operasional</span>
                  <span className={`font-mono ${netOperating >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatIDR(netOperating)}
                  </span>
                </div>
              </div>

              {/* INVESTASI */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-1 border-b border-slate-100">
                  B. Arus Kas Dari Aktivitas Investasi
                </h4>
                <div className="pl-4">
                  {investingOutList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {investingOutList.map((item, index) => (
                        <div key={index} className="flex justify-between py-2 text-sm pl-2">
                          <span className="text-slate-600 font-light">{item.desc}</span>
                          <span className="font-mono text-rose-600 font-light">({formatIDR(item.amount)})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic pl-2">Tidak ada belanja investasi aset tetap pada periode ini.</p>
                  )}
                </div>
                <div className="flex justify-between py-2.5 text-sm font-bold bg-slate-50 px-3 rounded-lg border border-slate-100">
                  <span>Kas Bersih Dari Aktivitas Investasi</span>
                  <span className={`font-mono ${netInvesting >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatIDR(netInvesting)}
                  </span>
                </div>
              </div>

              {/* PENDANAAN */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-1 border-b border-slate-100">
                  C. Arus Kas Dari Aktivitas Pendanaan (Financing)
                </h4>
                
                {/* Inflows */}
                {financingInList.length > 0 && (
                  <div className="pl-4">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Penerimaan Pendanaan</h5>
                    {financingInList.map((item, index) => (
                      <div key={index} className="flex justify-between py-2 text-sm pl-2">
                        <span className="text-slate-600 font-light">{item.desc}</span>
                        <span className="font-mono text-slate-800">{formatIDR(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outflows */}
                <div className="pl-4 pt-1">
                  {financingOutList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {financingOutList.map((item, index) => (
                        <div key={index} className="flex justify-between py-2 text-sm pl-2">
                          <span className="text-slate-600 font-light">{item.desc}</span>
                          <span className="font-mono text-rose-600 font-light">({formatIDR(item.amount)})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    financingInList.length === 0 && (
                      <p className="text-slate-400 text-xs italic pl-2">Tidak ada transaksi pendanaan (prive/pinjaman/modal) pada periode ini.</p>
                    )
                  )}
                </div>

                <div className="flex justify-between py-2.5 text-sm font-bold bg-slate-50 px-3 rounded-lg border border-slate-100">
                  <span>Kas Bersih Dari Aktivitas Pendanaan</span>
                  <span className={`font-mono ${netFinancing >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatIDR(netFinancing)}
                  </span>
                </div>
              </div>

              {/* CASH FLOW SUMMARY CARD */}
              <div className="border-t-2 border-[#580001] pt-6 space-y-3.5">
                <div className="flex justify-between text-sm font-bold text-slate-900 bg-slate-100 p-3 rounded-lg">
                  <span>KENAIKAN / (PENURUNAN) KAS BERSIH</span>
                  <span className="font-mono">{formatIDR(netCashFlow)}</span>
                </div>

                <div className="flex justify-between text-sm font-semibold text-slate-600 px-3">
                  <span>Saldo Awal Kas & Bank (Buku):</span>
                  <span className="font-mono">{formatIDR(beginningCash)}</span>
                </div>

                <div className="flex justify-between text-base font-bold text-white bg-[#580001] p-4 rounded-xl shadow-sm">
                  <span>SALDO AKHIR KAS & BANK (LIQUID CASH)</span>
                  <span className="font-mono">{formatIDR(endingCash)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. LAPORAN PERUBAHAN MODAL */}
        {activeTab === 'perubahan-modal' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Laporan Perubahan Modal (Statement of Changes in Equity)</h3>
                <p className="text-slate-500 text-xs mt-0.5">Memantau pergerakan modal pemilik akibat laba bersih dan penarikan prive pada periode berjalan.</p>
              </div>
              <div className="text-slate-400 text-xs italic">
                Pelaporan Ekuitas Pemilik
              </div>
            </div>

            {/* Perubahan Modal Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modal Awal</span>
                <p className="text-lg font-mono font-bold text-slate-900">
                  {(() => {
                    const rawModalPemilik = getAccountBalance(accounts.find(a => a.code === '3-1001') || { code: '3-1001', name: 'Modal Pemilik', type: 'Modal', normalBalance: 'Kredit', initialBalance: 0 });
                    const rawLabaDitahan = getAccountBalance(accounts.find(a => a.code === '3-1002') || { code: '3-1002', name: 'Laba Ditahan', type: 'Modal', normalBalance: 'Kredit', initialBalance: 0 });
                    const modalSetoran = activeTxs.filter(tx => tx.creditAccount === '3-1001').reduce((sum, tx) => sum + tx.amount, 0);
                    const modalAwal = rawModalPemilik + rawLabaDitahan - modalSetoran;
                    return formatIDR(modalAwal);
                  })()}
                </p>
                <p className="text-[10px] text-slate-400">Sebelum memperhitungkan aktivitas berjalan</p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4.5 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Laba Bersih (+)</span>
                <p className="text-lg font-mono font-bold text-emerald-600">
                  {formatIDR(netProfit)}
                </p>
                <p className="text-[10px] text-emerald-500">Hasil Laba/Rugi Bersih Periode Berjalan</p>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4.5 space-y-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Prive (-)</span>
                <p className="text-lg font-mono font-bold text-rose-600">
                  {(() => {
                    const priveAccount = accounts.find(a => a.code === '3-1003');
                    const priveVal = priveAccount ? Math.abs(getAccountBalance(priveAccount)) : 0;
                    return formatIDR(priveVal);
                  })()}
                </p>
                <p className="text-[10px] text-rose-500">Penarikan Pribadi Pemilik Brand</p>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4.5 space-y-1">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Modal Akhir</span>
                <p className="text-lg font-mono font-bold text-indigo-900">
                  {formatIDR(totalEquity)}
                </p>
                <p className="text-[10px] text-indigo-500">Total Modal Riil Saat Ini (Balance Sheet)</p>
              </div>
            </div>

            {/* Detailed statement table */}
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden p-6 space-y-5">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b">
                Rincian Perubahan Ekuitas (Equity Ledger)
              </h4>

              <div className="divide-y divide-slate-150 space-y-1">
                {(() => {
                  const rawModalPemilik = getAccountBalance(accounts.find(a => a.code === '3-1001') || { code: '3-1001', name: 'Modal Pemilik', type: 'Modal', normalBalance: 'Kredit', initialBalance: 0 });
                  const rawLabaDitahan = getAccountBalance(accounts.find(a => a.code === '3-1002') || { code: '3-1002', name: 'Laba Ditahan', type: 'Modal', normalBalance: 'Kredit', initialBalance: 0 });
                  const modalSetoran = activeTxs.filter(tx => tx.creditAccount === '3-1001').reduce((sum, tx) => sum + tx.amount, 0);
                  const modalAwal = rawModalPemilik + rawLabaDitahan - modalSetoran;
                  const priveAccount = accounts.find(a => a.code === '3-1003');
                  const priveVal = priveAccount ? Math.abs(getAccountBalance(priveAccount)) : 0;
                  
                  return (
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between text-sm py-2 px-1">
                        <span className="text-slate-600 font-semibold">1. Modal Awal Pemilik & Laba Ditahan (Awal Periode)</span>
                        <span className="font-mono text-slate-800 font-semibold">{formatIDR(modalAwal)}</span>
                      </div>

                      <div className="flex justify-between text-sm py-2 px-1 pl-4">
                        <span className="text-slate-600">2. Penambahan Setoran Modal Baru (Periode Ini)</span>
                        <span className="font-mono text-slate-800">
                          {modalSetoran > 0 ? `+${formatIDR(modalSetoran)}` : formatIDR(0)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm py-2 px-1 pl-4">
                        <span className="text-slate-600">3. Laba Bersih Tahun/Bulan Berjalan (Laba Rugi)</span>
                        <span className="font-mono text-emerald-600">
                          {netProfit >= 0 ? `+${formatIDR(netProfit)}` : `(${formatIDR(Math.abs(netProfit))})`}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm py-2 px-1 pl-4">
                        <span className="text-slate-600">4. Penarikan Pribadi Pemilik (Prive)</span>
                        <span className="font-mono text-rose-600">
                          {priveVal > 0 ? `(${formatIDR(priveVal)})` : formatIDR(0)}
                        </span>
                      </div>

                      <div className="flex justify-between text-base py-3 px-3 bg-[#580001] text-white font-bold rounded-xl mt-4 shadow-sm">
                        <span>MODAL AKHIR PEMILIK (Sesuai Neraca)</span>
                        <span className="font-mono">{formatIDR(totalEquity)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Strategic Advice Card for Modal */}
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <Info className="w-4.5 h-4.5" />
                <span>Edukasi Keuangan: Pentingnya Memantau Perubahan Modal</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bagi pemilik clothing brand, modal adalah darah utama untuk membeli bahan kain, melakukan produksi massal, dan membayar kampanye pemasaran produk baru. Laporan Perubahan Modal menunjukkan apakah modal Anda bertambah (berkat <strong>Laba Bersih</strong> yang sehat) atau justru tergerus oleh pengambilan pribadi (<strong>Prive</strong>). <br />
                <span className="block mt-1.5 font-semibold text-slate-800">Tips Mengelola Modal Clothing Brand:</span>
                • Hindari melakukan Prive secara berlebihan atau tidak tercatat agar modal kerja untuk restock kaos/jaket tidak terganggu (mencegah kondisi "boncos"). <br />
                • Alokasikan sebagian Laba Bersih periode berjalan ke akun Laba Ditahan untuk modal pengembangan produk (R&D) atau pembelian aset tetap seperti mesin jahit dan printer DTF.
              </p>
            </div>
          </div>
        )}

        {/* 5. ANALISIS TREN */}
        {activeTab === 'analisis-tren' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Analisis Tren Keuangan Bulanan</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Visualisasi performa bisnis bulanan (Omset, Operasional, dan Laba Bersih) tahun {selectedYear === 'Semua' ? 'Keseluruhan' : selectedYear}.
                </p>
              </div>
              <div className="text-slate-400 text-xs italic">
                Pembaruan Real-time berdasarkan Jurnal Transaksi
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Pendapatan</span>
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-mono font-bold text-slate-900">{formatIDR(yearlyTotalRevenue)}</p>
                <p className="text-[10px] text-slate-500 font-medium">Bulan Tertinggi: <span className="font-bold text-emerald-600">{maxRevenueMonth?.Pendapatan > 0 ? `${maxRevenueMonth.name} (${formatIDR(maxRevenueMonth.Pendapatan)})` : '-'}</span></p>
              </div>

              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Total Beban & HPP</span>
                  <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-mono font-bold text-slate-900">{formatIDR(yearlyTotalExpenses)}</p>
                <p className="text-[10px] text-slate-500 font-medium">Bulan Tertinggi: <span className="font-bold text-rose-600">{maxExpenseMonth?.Beban > 0 ? `${maxExpenseMonth.name} (${formatIDR(maxExpenseMonth.Beban)})` : '-'}</span></p>
              </div>

              <div className={`rounded-2xl p-5 space-y-2 border ${
                yearlyTotalNetProfit >= 0 
                  ? 'bg-indigo-50/50 border-indigo-100' 
                  : 'bg-amber-50/50 border-amber-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    yearlyTotalNetProfit >= 0 ? 'text-indigo-800' : 'text-amber-800'
                  }`}>Total Laba Bersih</span>
                  <div className={`p-1.5 rounded-lg ${
                    yearlyTotalNetProfit >= 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-mono font-bold text-slate-900">{formatIDR(yearlyTotalNetProfit)}</p>
                <p className="text-[10px] text-slate-500 font-medium">Laba Tertinggi: <span className="font-bold text-indigo-600">{maxProfitMonth?.['Laba Bersih'] > 0 ? `${maxProfitMonth.name} (${formatIDR(maxProfitMonth['Laba Bersih'])})` : '-'}</span></p>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Rata-rata Margin Laba</span>
                  <div className="p-1.5 bg-slate-200/70 text-slate-700 rounded-lg">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-mono font-bold text-slate-900">{yearlyProfitMargin.toFixed(1)}%</p>
                <p className="text-[10px] text-slate-500 font-medium">Dari Total Omset Berjalan</p>
              </div>
            </div>

            {/* Chart Card */}
            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Grafik Komparasi Laba Rugi</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Visualisasi perbandingan pendapatan bulanan (hijau) vs beban (merah) beserta tren laba bersih (garis indigo).</p>
                </div>
              </div>

              {/* The Recharts Plot */}
              <div className="w-full h-[360px] bg-white rounded-xl border border-slate-100 p-2 sm:p-4 shadow-sm relative">
                {yearlyTotalRevenue === 0 && yearlyTotalExpenses === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <Sparkles className="w-8 h-8 text-slate-300 animate-pulse mb-2" />
                    <p className="text-slate-800 text-xs font-semibold">Tidak Ada Data Kinerja Keuangan</p>
                    <p className="text-slate-400 text-[10px] mt-1 max-w-xs">Silakan catat transaksi pendapatan (akun kelompok 4) atau beban (akun kelompok 5) terlebih dahulu.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={trendData}
                      margin={{ top: 15, right: 5, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatYAxis}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="top"
                        height={40}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#334155' }}
                      />
                      <Bar 
                        name="Pendapatan" 
                        dataKey="Pendapatan" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={30}
                      />
                      <Bar 
                        name="Beban" 
                        dataKey="Beban" 
                        fill="#f43f5e" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={30}
                      />
                      <Line 
                        name="Laba Bersih" 
                        type="monotone" 
                        dataKey="Laba Bersih" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ r: 4, stroke: '#6366f1', strokeWidth: 1, fill: '#fff' }}
                        activeDot={{ r: 6, stroke: '#4f46e5', strokeWidth: 2, fill: '#fff' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Strategic Insights Card */}
            <div className="bg-indigo-50/30 border border-indigo-100/70 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Analisis Strategis & Rekomendasi Kinerja</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800">Evaluasi Efisiensi Biaya</h5>
                  <p>
                    {yearlyTotalRevenue > 0 ? (
                      (() => {
                        const hppRatio = (yearlyTotalExpenses / yearlyTotalRevenue) * 100;
                        if (hppRatio > 70) {
                          return `Rasio beban terhadap pendapatan Anda cukup tinggi (${hppRatio.toFixed(1)}%). Disarankan untuk mengoptimalkan biaya produksi konveksi, mencari supplier bahan kain alternatif, atau menaikkan harga jual produk guna meningkatkan margin keuntungan kotor.`;
                        } else if (hppRatio > 40) {
                          return `Rasio beban Anda berada pada tingkat moderat (${hppRatio.toFixed(1)}%). Ini adalah struktur biaya yang sehat untuk bisnis retail pakaian. Pertahankan pengeluaran operasional dan fokuslah pada ekspansi pemasaran digital untuk mendorong volume penjualan.`;
                        } else {
                          return `Luar biasa! Rasio efisiensi beban Anda sangat baik (${hppRatio.toFixed(1)}%). Anda memiliki margin operasional yang tinggi yang memberikan ketahanan finansial sangat kuat terhadap fluktuasi pasar retail.`;
                        }
                      })()
                    ) : (
                      "Belum ada data pendapatan penjualan yang dapat dievaluasi terhadap rasio beban usaha."
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800">Analisis Likuiditas & Pertumbuhan</h5>
                  <p>
                    {yearlyTotalNetProfit > 0 ? (
                      `Bisnis Anda mencatat akumulasi laba bersih positif sebesar ${formatIDR(yearlyTotalNetProfit)} pada tahun berjalan. Likuiditas yang kuat ini sangat ideal untuk diinvestasikan kembali ke pengembangan produk (pembelian mesin konveksi baru atau stok persediaan bahan premium) guna mendorong pertumbuhan brand pakaian Anda secara berkelanjutan.`
                    ) : yearlyTotalNetProfit < 0 ? (
                      `Bisnis Anda sedang mengalami defisit laba bersih sebesar ${formatIDR(Math.abs(yearlyTotalNetProfit))}. Segera lakukan peninjauan ulang terhadap beban pemasaran tidak produktif atau optimalkan harga pokok penjualan pakaian agar kembali ke jalur profitabilitas.`
                    ) : (
                      "Belum ada mutasi keuangan signifikan untuk menganalisis arus pertumbuhan dan tingkat likuiditas bisnis."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF Download Toast Notification */}
      {pdfSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-[#580001] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#580001] flex items-center gap-3 text-xs z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-6 h-6 rounded-full bg-white/20 text-amber-300 flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <span className="font-medium">{pdfSuccessToast}</span>
        </div>
      )}
    </div>
  );
}
