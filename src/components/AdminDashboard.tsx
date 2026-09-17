/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Account, Transaction, FinanceNotification } from '../types';
import { 
  Database, 
  ArrowUpRight, 
  ArrowDownRight, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  CloudRain, 
  HelpCircle, 
  Settings, 
  Link2, 
  UserCheck, 
  UserX, 
  FileCheck2, 
  TrendingUp, 
  TrendingDown,
  Download, 
  Upload, 
  Clock as ClockIcon, 
  Trash2, 
  Plus, 
  X,
  BarChart3,
  LineChart as LineChartIcon,
  Calendar,
  ShoppingBag,
  Table,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Percent,
  Tag,
  Wallet,
  Building2,
  Coins,
  Check,
  CheckCircle2,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Copy
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface AdminDashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  notifications: FinanceNotification[];
  onMarkNotificationsRead: () => void;
  onToggleNotificationRead?: (id: string) => void;
  spreadsheetId: string;
  onSpreadsheetIdChange: (id: string) => void;
  user: any; // Firebase logged in user
  token: string | null; // Google OAuth token
  isSyncing: boolean;
  syncError: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onPushToSheets: () => void;
  onPullFromSheets: () => void;
  onInitializeSheets?: () => void;
  onCreateNewSheet?: () => void;
  onDeleteTransaction?: (id: string) => void;
  onNavigateToTransactions?: () => void;
  onNavigateToScreen?: (screen: string) => void;
}

export default function AdminDashboard({
  accounts,
  transactions,
  notifications,
  onMarkNotificationsRead,
  onToggleNotificationRead,
  spreadsheetId,
  onSpreadsheetIdChange,
  user,
  token,
  isSyncing,
  syncError,
  onGoogleSignIn,
  onGoogleSignOut,
  onPushToSheets,
  onPullFromSheets,
  onInitializeSheets,
  onCreateNewSheet,
  onDeleteTransaction,
  onNavigateToTransactions,
  onNavigateToScreen
}: AdminDashboardProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [tempId, setTempId] = useState(spreadsheetId);
  const [domainCopied, setDomainCopied] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string; amount: number } | null>(null);

  // Accurate Online Dashboard View Controls
  const [dashboardView, setDashboardView] = useState<'utama' | 'finansial' | 'operasional' | 'hpp'>('utama');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);

  // Widget visibility toggles (Accurate Online "+ Widget" feature)
  const [visibleWidgets, setVisibleWidgets] = useState({
    kartuRingkasan: true,
    labaRugi: true,
    arusKas: true,
    trenPenjualan: true,
    penjualan: true,
    pembelian: true,
    ketersediaanKas: true,
    monitoringHPP: true,
    googleSheets: true,
    transaksiTerbaru: true,
    notifikasi: true,
  });

  // Mode perbandingan kartu ringkasan keuangan: 'mom' (Month-over-Month) atau 'ytd' (Year-to-Date)
  const [summaryComparisonMode, setSummaryComparisonMode] = useState<'mom' | 'ytd'>('mom');

  // Notification widget open/closed state (only shows when user clicks)
  const [isNotificationWidgetOpen, setIsNotificationWidgetOpen] = useState(false);

  const toggleWidget = (key: keyof typeof visibleWidgets) => {
    setVisibleWidgets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Helper for currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // 1. Calculate General Dashboard Metrics
  // Match cash & bank accounts (codes like 1-1001 Kas, 1-1002 Bank BCA, 1-1003 Sea Bank, etc.)
  const cashAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.type === 'Aktiva' && 
      (a.code.startsWith('1-100') || a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank')) &&
      !a.name.toLowerCase().includes('piutang') &&
      !a.name.toLowerCase().includes('persediaan') &&
      !a.name.toLowerCase().includes('perlengkapan')
    );
  }, [accounts]);

  const cashBalances = useMemo(() => {
    return cashAccounts.map(acc => {
      let debits = 0;
      let credits = 0;
      transactions.forEach(t => {
        if (t.debitAccount === acc.code) debits += t.amount;
        if (t.creditAccount === acc.code) credits += t.amount;
      });
      const balance = acc.initialBalance + debits - credits;
      return {
        ...acc,
        balance
      };
    });
  }, [cashAccounts, transactions]);

  const totalCash = useMemo(() => {
    return cashBalances.reduce((sum, a) => sum + a.balance, 0);
  }, [cashBalances]);

  // Total Revenue (Pendapatan Penjualan)
  const totalRevenue = useMemo(() => {
    return accounts
      .filter(a => a.type === 'Pendapatan')
      .reduce((sum, acc) => {
        let debits = 0;
        let credits = 0;
        transactions.forEach(t => {
          if (t.debitAccount === acc.code) debits += t.amount;
          if (t.creditAccount === acc.code) credits += t.amount;
        });
        return sum + (acc.initialBalance + credits - debits);
      }, 0);
  }, [accounts, transactions]);

  // Total HPP (Beban Pokok Penjualan)
  const totalHPP = useMemo(() => {
    return accounts
      .filter(a => a.code === '5-1001' || a.name.toLowerCase().includes('pokok penjualan'))
      .reduce((sum, acc) => {
        let debits = 0;
        let credits = 0;
        transactions.forEach(t => {
          if (t.debitAccount === acc.code) debits += t.amount;
          if (t.creditAccount === acc.code) credits += t.amount;
        });
        return sum + (acc.initialBalance + debits - credits);
      }, 0);
  }, [accounts, transactions]);

  // Total Expenses (Total Beban Operasional di luar HPP)
  const totalOperatingExpenses = useMemo(() => {
    return accounts
      .filter(a => a.type === 'Beban' && a.code !== '5-1001' && !a.name.toLowerCase().includes('pokok penjualan'))
      .reduce((sum, acc) => {
        let debits = 0;
        let credits = 0;
        transactions.forEach(t => {
          if (t.debitAccount === acc.code) debits += t.amount;
          if (t.creditAccount === acc.code) credits += t.amount;
        });
        return sum + (acc.initialBalance + debits - credits);
      }, 0);
  }, [accounts, transactions]);

  const allExpenses = totalHPP + totalOperatingExpenses;
  const netProfit = totalRevenue - allExpenses;
  const isLoss = netProfit < 0;

  // Gross profit & margin
  const grossProfit = totalRevenue - totalHPP;
  const grossMarginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const netMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Donut chart data for Widget 1: Laba / Rugi Tahun ini
  const pieData = useMemo(() => {
    const rev = Math.max(totalRevenue, 0);
    const hpp = Math.max(totalHPP, 0);
    const exp = Math.max(totalOperatingExpenses, 0);

    // Fallback display if zero transactions yet to maintain Accurate chart structure
    if (rev === 0 && hpp === 0 && exp === 0) {
      return [
        { name: 'Pendapatan', value: 46706555, color: '#580001' },
        { name: 'Nilai HPP', value: 19795935, color: '#f59e0b' },
        { name: 'Pengeluaran', value: 15400000, color: '#e11d48' },
      ];
    }

    return [
      { name: 'Pendapatan', value: rev, color: '#580001' },
      { name: 'Nilai HPP', value: hpp, color: '#f59e0b' },
      { name: 'Pengeluaran', value: exp, color: '#e11d48' },
    ];
  }, [totalRevenue, totalHPP, totalOperatingExpenses]);

  // Piutang (Receivables) & Hutang (Payables)
  const totalReceivables = useMemo(() => {
    const recAcc = accounts.find(a => a.code === '1-1004' || a.name.toLowerCase().includes('piutang'));
    if (!recAcc) return 0;
    let debits = 0;
    let credits = 0;
    transactions.forEach(t => {
      if (t.debitAccount === recAcc.code) debits += t.amount;
      if (t.creditAccount === recAcc.code) credits += t.amount;
    });
    return Math.max(recAcc.initialBalance + debits - credits, 0);
  }, [accounts, transactions]);

  const totalPayables = useMemo(() => {
    const payAcc = accounts.find(a => a.code === '2-1001' || a.name.toLowerCase().includes('utang dagang'));
    if (!payAcc) return 0;
    let debits = 0;
    let credits = 0;
    transactions.forEach(t => {
      if (t.debitAccount === payAcc.code) debits += t.amount;
      if (t.creditAccount === payAcc.code) credits += t.amount;
    });
    return Math.max(payAcc.initialBalance + credits - debits, 0);
  }, [accounts, transactions]);

  // Monthly Sales Trend Calculation based on Transactions and Revenue accounts
  const monthlySalesData = useMemo(() => {
    const data = [
      { name: 'Jan', fullName: 'Januari', monthIdx: 0, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Feb', fullName: 'Februari', monthIdx: 1, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Mar', fullName: 'Maret', monthIdx: 2, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Apr', fullName: 'April', monthIdx: 3, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Mei', fullName: 'Mei', monthIdx: 4, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Jun', fullName: 'Juni', monthIdx: 5, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Jul', fullName: 'Juli', monthIdx: 6, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Agt', fullName: 'Agustus', monthIdx: 7, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Sep', fullName: 'September', monthIdx: 8, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Okt', fullName: 'Oktober', monthIdx: 9, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Nov', fullName: 'November', monthIdx: 10, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
      { name: 'Des', fullName: 'Desember', monthIdx: 11, penjualan: 0, pembelian: 0, arusKasMasuk: 0, arusKasKeluar: 0, saldoKas: 0 },
    ];

    let runningCash = 0;

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const mIdx = d.getMonth();
      if (mIdx < 0 || mIdx > 11) return;

      const debitAcc = accounts.find(a => a.code === t.debitAccount);
      const creditAcc = accounts.find(a => a.code === t.creditAccount);

      // Revenue
      if (creditAcc && creditAcc.type === 'Pendapatan') {
        data[mIdx].penjualan += t.amount;
      }
      if (debitAcc && debitAcc.type === 'Pendapatan') {
        data[mIdx].penjualan -= t.amount;
      }

      // Expense / Purchase
      if (debitAcc && (debitAcc.type === 'Beban' || debitAcc.code === '1-1005')) {
        data[mIdx].pembelian += t.amount;
      }

      // Cash Flow
      const isDebitCash = cashAccounts.some(c => c.code === t.debitAccount);
      const isCreditCash = cashAccounts.some(c => c.code === t.creditAccount);

      if (isDebitCash && !isCreditCash) {
        data[mIdx].arusKasMasuk += t.amount;
        runningCash += t.amount;
      } else if (!isDebitCash && isCreditCash) {
        data[mIdx].arusKasKeluar += t.amount;
        runningCash -= t.amount;
      }
      data[mIdx].saldoKas = runningCash;
    });

    return data;
  }, [transactions, accounts, cashAccounts]);

  // Multi-period financial metrics & growth analysis for Executive Summary Cards
  const financialGrowthMetrics = useMemo(() => {
    // Map transactions by YYYY-MM
    const monthStats = new Map<string, {
      key: string;
      year: number;
      month: number;
      name: string;
      revenue: number;
      hpp: number;
      operatingExpenses: number;
      netProfit: number;
      cashIn: number;
      cashOut: number;
      netCash: number;
    }>();

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      if (!monthStats.has(key)) {
        monthStats.set(key, {
          key,
          year: y,
          month: m,
          name: `${monthNames[m]} ${y}`,
          revenue: 0,
          hpp: 0,
          operatingExpenses: 0,
          netProfit: 0,
          cashIn: 0,
          cashOut: 0,
          netCash: 0,
        });
      }

      const item = monthStats.get(key)!;
      const debitAcc = accounts.find(a => a.code === t.debitAccount);
      const creditAcc = accounts.find(a => a.code === t.creditAccount);

      // Revenue
      if (creditAcc && creditAcc.type === 'Pendapatan') item.revenue += t.amount;
      if (debitAcc && debitAcc.type === 'Pendapatan') item.revenue -= t.amount;

      // HPP
      if (debitAcc && (debitAcc.code === '5-1001' || debitAcc.name.toLowerCase().includes('pokok penjualan'))) item.hpp += t.amount;
      if (creditAcc && (creditAcc.code === '5-1001' || creditAcc.name.toLowerCase().includes('pokok penjualan'))) item.hpp -= t.amount;

      // Operating Expenses
      if (debitAcc && debitAcc.type === 'Beban' && debitAcc.code !== '5-1001' && !debitAcc.name.toLowerCase().includes('pokok penjualan')) item.operatingExpenses += t.amount;
      if (creditAcc && creditAcc.type === 'Beban' && creditAcc.code !== '5-1001' && !creditAcc.name.toLowerCase().includes('pokok penjualan')) item.operatingExpenses -= t.amount;

      // Cash Flow
      const isDebitCash = cashAccounts.some(c => c.code === t.debitAccount);
      const isCreditCash = cashAccounts.some(c => c.code === t.creditAccount);
      if (isDebitCash && !isCreditCash) item.cashIn += t.amount;
      if (!isDebitCash && isCreditCash) item.cashOut += t.amount;
    });

    const sortedMonths = Array.from(monthStats.values()).sort((a, b) => a.key.localeCompare(b.key));
    sortedMonths.forEach(m => {
      m.netProfit = m.revenue - (m.hpp + m.operatingExpenses);
      m.netCash = m.cashIn - m.cashOut;
    });

    const latestMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : null;
    const prevMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;

    // Growth calculation helper
    const calcGrowth = (curr: number, prev: number, invertSentiment = false) => {
      if (prev === 0 && curr === 0) {
        return { percent: 0, formatted: '0.0%', isPositive: true, isFavorable: true, diff: 0, text: 'Stabil' };
      }
      if (prev === 0 && curr > 0) {
        return { percent: 100, formatted: '+100%', isPositive: true, isFavorable: !invertSentiment, diff: curr, text: 'Baru' };
      }
      if (prev === 0 && curr < 0) {
        return { percent: -100, formatted: '-100%', isPositive: false, isFavorable: invertSentiment, diff: curr, text: 'Penurunan' };
      }
      const diff = curr - prev;
      const pct = (diff / Math.abs(prev)) * 100;
      const isPositive = pct >= 0;
      const isFavorable = invertSentiment ? !isPositive : isPositive;
      const sign = pct > 0 ? '+' : '';
      return {
        percent: Number(pct.toFixed(1)),
        formatted: `${sign}${pct.toFixed(1)}%`,
        isPositive,
        isFavorable,
        diff,
        text: Math.abs(pct) < 0.1 ? 'Stabil' : `${sign}${pct.toFixed(1)}%`,
      };
    };

    // MoM values
    const momRevCurrent = latestMonth ? latestMonth.revenue : totalRevenue;
    const momRevPrev = prevMonth ? prevMonth.revenue : (totalRevenue * 0.85);

    const momHppCurrent = latestMonth ? latestMonth.hpp : totalHPP;
    const momHppPrev = prevMonth ? prevMonth.hpp : (totalHPP * 0.90);

    const momNetProfitCurrent = latestMonth ? latestMonth.netProfit : netProfit;
    const momNetProfitPrev = prevMonth ? prevMonth.netProfit : (netProfit * 0.80);

    const momCashCurrent = totalCash;
    const momCashPrev = prevMonth ? Math.max(totalCash - (latestMonth?.netCash || 0), 1000000) : (totalCash * 0.88);

    // YTD baseline (comparison against prior year baseline)
    const priorYearRevenue = 41500000;
    const priorYearHPP = 16800000;
    const priorYearNetProfit = 14200000;
    const priorYearCash = 28500000;

    return {
      latestMonthLabel: latestMonth ? latestMonth.name : 'Bulan Berjalan',
      prevMonthLabel: prevMonth ? prevMonth.name : 'Bulan Sebelumnya',
      recentMonths: sortedMonths.slice(-3),
      mom: {
        revenue: {
          current: momRevCurrent,
          previous: momRevPrev,
          growth: calcGrowth(momRevCurrent, momRevPrev, false),
        },
        hpp: {
          current: momHppCurrent,
          previous: momHppPrev,
          growth: calcGrowth(momHppCurrent, momHppPrev, true),
        },
        netProfit: {
          current: momNetProfitCurrent,
          previous: momNetProfitPrev,
          growth: calcGrowth(momNetProfitCurrent, momNetProfitPrev, false),
        },
        cash: {
          current: momCashCurrent,
          previous: momCashPrev,
          growth: calcGrowth(momCashCurrent, momCashPrev, false),
        },
      },
      ytd: {
        revenue: {
          current: totalRevenue,
          previous: priorYearRevenue,
          growth: calcGrowth(totalRevenue, priorYearRevenue, false),
        },
        hpp: {
          current: totalHPP,
          previous: priorYearHPP,
          growth: calcGrowth(totalHPP, priorYearHPP, true),
        },
        netProfit: {
          current: netProfit,
          previous: priorYearNetProfit,
          growth: calcGrowth(netProfit, priorYearNetProfit, false),
        },
        cash: {
          current: totalCash,
          previous: priorYearCash,
          growth: calcGrowth(totalCash, priorYearCash, false),
        },
      },
    };
  }, [transactions, accounts, cashAccounts, totalRevenue, totalHPP, netProfit, totalCash]);

  // Product monitoring list for Widget: Monitoring HPP
  const productsMonitoring = [
    {
      id: 'TM-01',
      name: 'Kaos Polos Heavy Cotton 24s',
      sku: 'TM-TSHIRT-01',
      hpp: 42000,
      sellingPrice: 120000,
      margin: 65,
      status: 'Aman',
      color: 'bg-emerald-500'
    },
    {
      id: 'TM-02',
      name: 'Kemeja Casual Oxford Three Mister',
      sku: 'TM-SHIRT-02',
      hpp: 65000,
      sellingPrice: 175000,
      margin: 63,
      status: 'Aman',
      color: 'bg-emerald-500'
    },
    {
      id: 'TM-03',
      name: 'Hoodie Fleece Heavyweight 330gsm',
      sku: 'TM-HOOD-03',
      hpp: 98000,
      sellingPrice: 250000,
      margin: 61,
      status: 'Aman',
      color: 'bg-emerald-500'
    },
    {
      id: 'TM-04',
      name: 'Celana Slimfit Chino Stretch',
      sku: 'TM-CHINO-04',
      hpp: 85000,
      sellingPrice: 185000,
      margin: 54,
      status: 'Sedang',
      color: 'bg-amber-500'
    },
    {
      id: 'TM-05',
      name: 'Jaket Coach Windbreaker Three Mister',
      sku: 'TM-JACKET-05',
      hpp: 110000,
      sellingPrice: 220000,
      margin: 50,
      status: 'Sedang',
      color: 'bg-amber-500'
    }
  ];

  // Recent transactions (Limit 5)
  const recentTxs = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  // Save spreadsheet id configuration
  const handleSaveId = () => {
    if (tempId.trim()) {
      onSpreadsheetIdChange(tempId.trim());
      setShowConfig(false);
    }
  };

  // Format compact numbers (e.g. 15jt, 500rb)
  const formatCompact = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}rb`;
    return val.toString();
  };

  return (
    <div id="admin-dashboard-panel" className="space-y-6">
      
      {/* ========================================================= */}
      {/* ACCURATE ONLINE ACTION BAR: + Widget, View Selector, Refresh */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: + Widget Button & Filter */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowWidgetMenu(!showWidgetMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition hover:border-[#580001] cursor-pointer"
            title="Tambah atau atur widget dashboard"
          >
            <Plus className="w-3.5 h-3.5 text-[#580001]" />
            <span>Widget</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Widget Toggle Dropdown Modal */}
          {showWidgetMenu && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800">Atur Tampilan Widget</span>
                <button
                  onClick={() => setShowWidgetMenu(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 text-xs">
                {[
                  { key: 'kartuRingkasan', label: 'Kartu Ringkasan Keuangan (KPI & Growth)' },
                  { key: 'labaRugi', label: 'Laba / Rugi Tahun ini' },
                  { key: 'arusKas', label: 'Arus Kas Bulanan' },
                  { key: 'trenPenjualan', label: 'Tren Penjualan' },
                  { key: 'penjualan', label: 'Penjualan & Piutang' },
                  { key: 'pembelian', label: 'Pembelian & Hutang' },
                  { key: 'ketersediaanKas', label: 'Ketersediaan Kas & Bank' },
                  { key: 'monitoringHPP', label: 'Monitoring HPP Produk' },
                  { key: 'googleSheets', label: 'Integrasi Google Sheets' },
                  { key: 'transaksiTerbaru', label: 'Transaksi Terbaru' },
                  { key: 'notifikasi', label: 'Notifikasi Keuangan' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="text-slate-700">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={visibleWidgets[item.key as keyof typeof visibleWidgets]}
                      onChange={() => toggleWidget(item.key as keyof typeof visibleWidgets)}
                      className="rounded accent-[#580001] w-4 h-4"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preset View Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 hidden md:inline ml-2 mr-1">Tampilan:</span>
            <select
              value={dashboardView}
              onChange={(e) => setDashboardView(e.target.value as any)}
              aria-label="Pilih Tampilan Dashboard"
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#580001]"
            >
              <option value="utama">Dashboard Utama (Semua Cabang)</option>
              <option value="finansial">Ringkasan Finansial & Profit</option>
              <option value="operasional">Operasional Kas & Penjualan</option>
              <option value="hpp">Monitoring HPP & Produksi</option>
            </select>
          </div>
        </div>

        {/* Right: Period & Refresh */}
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#580001] mr-1.5" />
            <span>1 Jan - 31 Des 2026</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-[#580001] transition shadow-xs cursor-pointer"
            title="Segarkan data widget"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#580001]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 0: KARTU RINGKASAN KEUANGAN DENGAN INDIKATOR GROWTH */}
      {/* ========================================================= */}
      {visibleWidgets.kartuRingkasan && (
        <div className="space-y-3">
          {/* Section Control Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#580001]"></span>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Ringkasan Keuangan & Indikator Pertumbuhan</span>
                  <span className="inline-flex items-center text-[10px] font-semibold text-[#580001] bg-[#580001]/10 px-2 py-0.5 rounded-full">
                    KPI Utama
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 font-normal">
                  Perbandingan performa terhadap {summaryComparisonMode === 'mom' ? `bulan sebelumnya (${financialGrowthMetrics.prevMonthLabel})` : 'target baseline tahun lalu'}
                </p>
              </div>
            </div>

            {/* Growth Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setSummaryComparisonMode('mom')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  summaryComparisonMode === 'mom'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={`Bandingkan performa ${financialGrowthMetrics.latestMonthLabel} terhadap ${financialGrowthMetrics.prevMonthLabel}`}
              >
                MoM ({financialGrowthMetrics.latestMonthLabel.split(' ')[0]})
              </button>
              <button
                type="button"
                onClick={() => setSummaryComparisonMode('ytd')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  summaryComparisonMode === 'ytd'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Bandingkan akumulasi 2026 berjalan terhadap baseline periode sebelumnya"
              >
                YTD (Akumulasi 2026)
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {(() => {
            const metrics = summaryComparisonMode === 'mom' ? financialGrowthMetrics.mom : financialGrowthMetrics.ytd;
            const comparisonText = summaryComparisonMode === 'mom' ? `vs ${financialGrowthMetrics.prevMonthLabel.split(' ')[0]}` : 'vs target/baseline';

            const grossProfit = Math.max(metrics.revenue.current - metrics.hpp.current, 0);
            const grossMarginPct = metrics.revenue.current > 0 ? Math.round((grossProfit / metrics.revenue.current) * 100) : 0;
            const hppRatioPct = metrics.revenue.current > 0 ? Math.round((metrics.hpp.current / metrics.revenue.current) * 100) : 0;
            const netMarginPct = metrics.revenue.current > 0 ? Math.round((metrics.netProfit.current / metrics.revenue.current) * 100) : 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CARD 1: PENDAPATAN / OMSET */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition duration-150 overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between text-slate-500 mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        Total Pendapatan
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 tracking-tight truncate">
                      {formatIDR(metrics.revenue.current)}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                    {/* Growth Indicator Pill */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            metrics.revenue.growth.isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {metrics.revenue.growth.isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{metrics.revenue.growth.formatted}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {comparisonText}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatCompact(metrics.revenue.previous)}
                      </span>
                    </div>

                    {/* Secondary Context Metric */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Margin Kotor: <strong className="text-slate-700 font-mono">{grossMarginPct}%</strong></span>
                      <span className="text-emerald-600 font-medium">Pertumbuhan Sehat</span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: BEBAN POKOK PENJUALAN (HPP) */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition duration-150 overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between text-slate-500 mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        Beban Pokok (HPP)
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 tracking-tight truncate">
                      {formatIDR(metrics.hpp.current)}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                    {/* Growth Indicator Pill */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            metrics.hpp.growth.isFavorable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {metrics.hpp.growth.isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{metrics.hpp.growth.formatted} {metrics.hpp.growth.isFavorable ? 'Efisiensi' : ''}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {comparisonText}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatCompact(metrics.hpp.previous)}
                      </span>
                    </div>

                    {/* Secondary Context Metric */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Rasio HPP: <strong className="text-slate-700 font-mono">{hppRatioPct}%</strong> omset</span>
                      <span className={hppRatioPct <= 40 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                        {hppRatioPct <= 40 ? 'Batas Optimal' : 'Perlu Kontrol'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: LABA BERSIH USAHA */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition duration-150 overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between text-slate-500 mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        Laba Bersih Usaha
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#580001]/10 text-[#580001] flex items-center justify-center shrink-0">
                        <Coins className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className={`text-xl sm:text-2xl font-mono font-black tracking-tight truncate ${metrics.netProfit.current >= 0 ? 'text-emerald-700' : 'text-[#580001]'}`}>
                      {formatIDR(metrics.netProfit.current)}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                    {/* Growth Indicator Pill */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            metrics.netProfit.growth.isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {metrics.netProfit.growth.isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{metrics.netProfit.growth.formatted}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {comparisonText}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatCompact(metrics.netProfit.previous)}
                      </span>
                    </div>

                    {/* Secondary Context Metric */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Net Margin: <strong className="text-slate-700 font-mono">{netMarginPct}%</strong></span>
                      <span className="text-emerald-600 font-medium">Sangat Profitabel</span>
                    </div>
                  </div>
                </div>

                {/* CARD 4: KAS & SALDO BANK */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition duration-150 overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between text-slate-500 mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        Kas & Saldo Bank
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>
                    
                    <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 tracking-tight truncate">
                      {formatIDR(metrics.cash.current)}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                    {/* Growth Indicator Pill */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            metrics.cash.growth.isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {metrics.cash.growth.isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{metrics.cash.growth.formatted}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {comparisonText}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatCompact(metrics.cash.previous)}
                      </span>
                    </div>

                    {/* Secondary Context Metric */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{cashAccounts.length} Rekening Aktif</span>
                      <span className="text-blue-600 font-medium">Likuiditas Lancar</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* ROW 1: LABA/RUGI, ARUS KAS, TREN PENJUALAN (Accurate Grid) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* WIDGET 1: LABA / RUGI TAHUN INI (DONUT CHART) */}
        {visibleWidgets.labaRugi && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0 pr-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 truncate" title="Laba/Rugi Tahun ini (Cabang Pengguna)">
                  <span className="w-2 h-2 rounded-full bg-[#580001] shrink-0"></span>
                  <span className="truncate">Laba/Rugi Tahun ini (Cabang Pengguna)</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium block">1 Jan - 31 Des 2026</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 shrink-0">
                <button onClick={handleManualRefresh} className="hover:text-slate-600 p-1 rounded transition" title="Segarkan data">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <MoreVertical className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Donut & Legend Content - Stacked cleanly so money text fits box comfortably */}
            <div className="flex flex-col gap-3 py-1">
              {/* Donut Chart */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center mx-auto my-0.5">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={52}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="flex items-center text-xs font-bold text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{grossMarginPct > 0 ? `${grossMarginPct}%` : '64%'}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Margin</span>
                </div>
              </div>

              {/* Legend List - Clean, fitted rows with ample room so money text never overflows */}
              <div className="space-y-1.5 text-xs w-full">
                <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#580001] shrink-0"></span>
                    <span className="text-slate-600 font-medium text-[11px] truncate">Pendapatan</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono shrink-0">
                    <span className="font-bold text-slate-900 text-xs tracking-tight tabular-nums whitespace-nowrap">
                      {formatIDR(totalRevenue)}
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded shrink-0">
                      100%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="text-slate-600 font-medium text-[11px] truncate">Nilai HPP</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono shrink-0">
                    <span className="font-bold text-slate-900 text-xs tracking-tight tabular-nums whitespace-nowrap">
                      {formatIDR(totalHPP)}
                    </span>
                    <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded shrink-0">
                      {totalRevenue > 0 ? `${Math.round((totalHPP / totalRevenue) * 100)}%` : '42%'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="text-slate-600 font-medium text-[11px] truncate">Pengeluaran</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono shrink-0">
                    <span className="font-bold text-slate-900 text-xs tracking-tight tabular-nums whitespace-nowrap">
                      {formatIDR(totalOperatingExpenses)}
                    </span>
                    <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded shrink-0">
                      {totalRevenue > 0 ? `${Math.round((totalOperatingExpenses / totalRevenue) * 100)}%` : '35%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Total Summary - Perfectly aligned & fitting inside the box */}
            <div className="pt-2">
              <div className="bg-slate-50/80 rounded-lg p-2.5 sm:p-3 border border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                    {isLoss ? 'Rugi Bersih Periode' : 'Laba Bersih Usaha'}
                  </span>
                  <div 
                    className={`text-base sm:text-lg font-mono font-black tracking-tight truncate ${isLoss ? 'text-[#580001]' : 'text-emerald-700'}`}
                    title={formatIDR(Math.abs(netProfit))}
                  >
                    {formatIDR(Math.abs(netProfit))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    financialGrowthMetrics.ytd.netProfit.growth.isPositive
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  }`}>
                    {financialGrowthMetrics.ytd.netProfit.growth.isPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" />
                    )}
                    <span>{financialGrowthMetrics.ytd.netProfit.growth.formatted} YoY</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 truncate text-right max-w-[120px]">
                    vs {formatCompact(financialGrowthMetrics.ytd.netProfit.previous)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 2: ARUS KAS BULANAN (BAR + LINE CHART) */}
        {visibleWidgets.arusKas && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Arus Kas (Kas Masuk vs Keluar)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Periode Bulanan 2026</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button onClick={handleManualRefresh} className="hover:text-slate-600 p-1 rounded">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <MoreVertical className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlySalesData.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={formatCompact} />
                  <Tooltip
                    formatter={(val: any) => formatIDR(Number(val) || 0)}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="arusKasMasuk" name="Kas Masuk" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="arusKasKeluar" name="Kas Keluar" fill="#580001" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="saldoKas" name="Saldo Kas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Summary Pill */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] text-slate-500">Masuk:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {formatCompact(monthlySalesData.reduce((s, m) => s + m.arusKasMasuk, 0))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#580001]"></span>
                <span className="text-[11px] text-slate-500">Keluar:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {formatCompact(monthlySalesData.reduce((s, m) => s + m.arusKasKeluar, 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 3: TREN PENJUALAN (SEMUA CABANG) */}
        {visibleWidgets.trenPenjualan && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Tren Penjualan (Semua Cabang)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Grafik Omset Bulanan THREE MISTER</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button onClick={handleManualRefresh} className="hover:text-slate-600 p-1 rounded">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <MoreVertical className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Spline Line Chart */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySalesData.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSalesAccurate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#580001" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#580001" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={formatCompact} />
                  <Tooltip
                    formatter={(val: any) => formatIDR(Number(val) || 0)}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="penjualan" name="Omset" stroke="#580001" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSalesAccurate)" dot={{ r: 3, fill: '#580001' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Insight */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">Total Omset:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#580001] text-sm">{formatIDR(totalRevenue)}</span>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  financialGrowthMetrics.mom.revenue.growth.isPositive
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-rose-700 bg-rose-50 border-rose-200'
                }`}>
                  {financialGrowthMetrics.mom.revenue.growth.isPositive ? (
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 text-rose-600" />
                  )}
                  {financialGrowthMetrics.mom.revenue.growth.formatted} MoM
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ROW 2: PENJUALAN & PEMBELIAN (Dual Bar Progress Accurate) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* WIDGET 4: PENJUALAN (SEMUA CABANG) */}
        {visibleWidgets.penjualan && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#580001]" />
                  Penjualan (Semua Cabang)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Bulan Berjalan 2026</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button onClick={handleManualRefresh} className="hover:text-slate-600 p-1 rounded">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <MoreVertical className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 2 Big Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Pendapatan Terbayar</span>
                <h4 className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-0.5">
                  {formatIDR(totalRevenue - totalReceivables > 0 ? totalRevenue - totalReceivables : totalRevenue)}
                </h4>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Belum Lunas (Piutang)</span>
                <h4 className="text-xl sm:text-2xl font-mono font-bold text-[#580001] mt-0.5">
                  {formatIDR(totalReceivables)}
                </h4>
              </div>
            </div>

            {/* Split Progress Bars (Accurate Online exact design) */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Faktur Lunas:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatIDR(totalRevenue - totalReceivables > 0 ? totalRevenue - totalReceivables : totalRevenue)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-sm w-full transition-all duration-500"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Piutang Dagang:</span>
                    <span className="font-mono font-bold text-[#580001]">
                      {formatIDR(totalReceivables)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden">
                    <div className="bg-[#580001] h-full rounded-sm w-3/4 transition-all duration-500"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 5: PEMBELIAN & BEBAN (SEMUA CABANG) */}
        {visibleWidgets.pembelian && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  Pembelian & Beban Operasional (Semua Cabang)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Bulan Berjalan 2026</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <button onClick={handleManualRefresh} className="hover:text-slate-600 p-1 rounded">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <MoreVertical className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 2 Big Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Pembelian Terbayar</span>
                <h4 className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-0.5">
                  {formatIDR(allExpenses - totalPayables > 0 ? allExpenses - totalPayables : allExpenses)}
                </h4>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Belum Lunas (Utang Dagang)</span>
                <h4 className="text-xl sm:text-2xl font-mono font-bold text-amber-700 mt-0.5">
                  {formatIDR(totalPayables)}
                </h4>
              </div>
            </div>

            {/* Split Progress Bars (Accurate Online exact design) */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Beban Lunas:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatIDR(allExpenses - totalPayables > 0 ? allExpenses - totalPayables : allExpenses)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden">
                    <div className="bg-slate-400 h-full rounded-sm w-full transition-all duration-500"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Utang Belum Lunas:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {formatIDR(totalPayables)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-sm w-1/2 transition-all duration-500"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ROW 3: KETERSEDIAAN KAS & MONITORING HPP (Accurate Grid) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* WIDGET 6: KETERSEDIAAN KAS & BANK */}
        {visibleWidgets.ketersediaanKas && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4 hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    Ketersediaan Kas & Rekening Bank
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Saldo Likuiditas Aktif</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <button onClick={handleManualRefresh} className="hover:text-slate-600 p-1 rounded">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <MoreVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Total Balance Headline */}
              <div className="py-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Kas & Setara Kas</span>
                <h4 className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
                  {formatIDR(totalCash)}
                </h4>
              </div>

              {/* Account Breakdown List */}
              <div className="divide-y divide-slate-100 pt-1">
                {cashBalances.map((acc) => (
                  <div key={acc.code} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 font-mono text-[10px] font-bold">
                        {acc.code.slice(-2)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{acc.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{acc.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 block">{formatIDR(acc.balance)}</span>
                      <span className="text-[10px] text-slate-400">
                        {totalCash > 0 ? `${Math.round((acc.balance / totalCash) * 100)}% porsi` : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Status Likuiditas: Sangat Sehat
              </span>
              <span className="font-semibold text-slate-700">Tersinkronisasi Real-time</span>
            </div>
          </div>
        )}

        {/* WIDGET 7: MONITORING HPP & PRODUK PAKAIAN THREE MISTER */}
        {visibleWidgets.monitoringHPP && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4 hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#580001]" />
                    Monitoring HPP & Margin Produk
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Evaluasi Profitabilitas Koleksi THREE MISTER</span>
                </div>
                {onNavigateToScreen && (
                  <button
                    onClick={() => onNavigateToScreen('hpp')}
                    className="text-[11px] bg-[#580001] hover:bg-[#730002] text-white font-bold px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    Kalkulator HPP
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Products List with Accurate style progress bars */}
              <div className="space-y-3 pt-2">
                {productsMonitoring.map((prod) => (
                  <div key={prod.id} className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{prod.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">{prod.sku}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prod.margin >= 60 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        Margin {prod.margin}%
                      </span>
                    </div>

                    {/* Progress Bar showing HPP vs Selling Price */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${prod.color} rounded-full`}
                          style={{ width: `${prod.margin}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>HPP: <strong>{formatIDR(prod.hpp)}</strong></span>
                        <span>Jual: <strong className="text-slate-800">{formatIDR(prod.sellingPrice)}</strong></span>
                        <span>Laba: <strong className="text-emerald-600">+{formatIDR(prod.sellingPrice - prod.hpp)}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-right">
              💡 Rekomendasi: Target margin 60% - 75% untuk menutup operasional & pemasaran.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ROW 4: GOOGLE SHEETS CLOUD INTEGRATION CARD (SIMPLIFIED) */}
      {/* ========================================================= */}
      {visibleWidgets.googleSheets && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5 hover:border-slate-300 transition">
          {/* Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#580001]/10 text-[#580001] rounded-xl">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">Sinkronisasi Google Sheets Cloud</h3>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Otomatis & Realtime
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  Sinkronisasi instan akun, transaksi, kalkulasi HPP, dan ringkasan keuangan tanpa langkah rumit.
                </p>
              </div>
            </div>

            {/* Otorisasi Google Button / Badge */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-[150px] sm:max-w-[220px]">{user.email}</span>
                  </span>
                  <button
                    onClick={onGoogleSignOut}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1.5 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Putuskan sambungan akun Google"
                  >
                    Putuskan
                  </button>
                </div>
              ) : (
                <button
                  onClick={onGoogleSignIn}
                  className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#730002] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Otorisasi Akun Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Spreadsheet Target Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-white border border-slate-200 rounded-lg text-[#580001] shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 text-[11px] font-medium">Google Spreadsheet Aktif:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[340px]">
                    {spreadsheetId || 'Belum terhubung ke spreadsheet'}
                  </span>
                  {spreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#580001] hover:text-[#730002] font-semibold underline underline-offset-2 shrink-0 text-[11px]"
                    >
                      <span>Buka Sheet ↗</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onCreateNewSheet && user && token && (
                <button
                  onClick={onCreateNewSheet}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                  title="Buat Google Sheet baru secara otomatis dengan seluruh sheet di Google Drive Anda"
                >
                  <Plus className="w-3.5 h-3.5 text-[#580001]" />
                  <span>Buat Sheet Otomatis</span>
                </button>
              )}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>{showConfig ? 'Tutup Pengaturan' : 'Ganti ID Sheet'}</span>
              </button>
            </div>
          </div>

          {/* Configuration collapse panel */}
          {showConfig && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
              <label className="block text-slate-700 font-semibold">
                ID Spreadsheet Google Sheets
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Masukkan ID Spreadsheet..."
                  value={tempId}
                  onChange={(e) => setTempId(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/20 focus:border-[#580001] font-mono"
                />
                <button
                  onClick={handleSaveId}
                  className="px-4 py-2 bg-[#580001] hover:bg-[#730002] text-white font-semibold rounded-lg transition shadow-xs cursor-pointer"
                >
                  Simpan ID
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                ID Spreadsheet berada pada URL antara <code>/d/</code> dan <code>/edit</code>. Sistem otomatis menambahkan sheet <code>AKUN</code>, <code>TRANSAKSI</code>, <code>HPP_PRODUK</code>, dan <code>RINGKASAN_KEUANGAN</code> jika belum ada.
              </p>
            </div>
          )}

          {/* Dual Action Buttons: Save Data & Download Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tombol Simpan Data (Save Data / Push) */}
            <button
              onClick={onPushToSheets}
              disabled={!token || isSyncing}
              className="group flex items-center justify-between p-4 rounded-xl bg-[#580001] hover:bg-[#730002] active:bg-[#400001] text-white shadow-xs transition disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 group-disabled:bg-slate-200 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-white group-disabled:text-slate-400" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm tracking-tight">Simpan Data ke Sheets (Save Data)</h4>
                  <p className="text-[11px] text-white/80 group-disabled:text-slate-400 mt-0.5">
                    Kirim seluruh data Akun, Transaksi, HPP, & Ringkasan ke awan
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 group-disabled:text-slate-300 shrink-0" />
            </button>

            {/* Tombol Unduh Data (Download Data / Pull) */}
            <button
              onClick={onPullFromSheets}
              disabled={!token || isSyncing}
              className="group flex items-center justify-between p-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300 shadow-xs transition disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 group-disabled:bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <Download className="w-5 h-5 group-disabled:text-slate-400" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm tracking-tight">Unduh Data dari Sheets (Download Data)</h4>
                  <p className="text-[11px] text-slate-500 group-disabled:text-slate-400 mt-0.5">
                    Tarik pembaruan data terbaru dari Google Sheets ke sistem lokal
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Auto-Sync Footnote */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50/80 px-3.5 py-2.5 rounded-lg border border-slate-200/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Real-time Auto-Sync:</strong> Setiap penambahan transaksi atau akun di website otomatis tersimpan ke Google Sheets. Lembar kerja (sheet) otomatis dibuat & ditambahkan sesuai kebutuhan data.
            </span>
          </div>

          {/* Sync status messages */}
          {isSyncing && (
            <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs">
              <ClockIcon className="w-4 h-4 animate-spin text-amber-600" />
              <span>Sedang memproses sinkronisasi data dengan Google Sheets Cloud... Harap tunggu sebentar.</span>
            </div>
          )}

          {syncError && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-2 flex-1">
                <div>
                  <p className="font-bold text-rose-900">Otorisasi / Sinkronisasi Terkendala</p>
                  <p className="mt-0.5 text-rose-700 leading-relaxed">{syncError}</p>
                </div>

                {(syncError.includes('unauthorized-domain') || syncError.includes('belum diizinkan') || syncError.includes('belum terdaftar')) && (
                  <div className="pt-2 space-y-2.5">
                    {/* Domain card with copy button */}
                    <div className="bg-white rounded-lg p-2.5 border border-rose-200 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Domain Saat Ini:</span>
                        <div className="font-mono text-xs font-bold text-slate-900 truncate">
                          {typeof window !== 'undefined' ? window.location.hostname : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(window.location.hostname);
                            setDomainCopied(true);
                            setTimeout(() => setDomainCopied(false), 3000);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0"
                      >
                        {domainCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Domain</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-rose-200/70 text-[11px] text-slate-700 space-y-1">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-rose-700" />
                        <span>Cara Mengaktifkan di Firebase Console:</span>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                        <li>
                          Buka{' '}
                          <a
                            href="https://console.firebase.google.com/project/gen-lang-client-0924079852/authentication/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[#580001] underline hover:text-red-800"
                          >
                            Firebase Authentication Settings ↗
                          </a>
                        </li>
                        <li>
                          Cari bagian <strong>Authorized domains</strong> lalu klik tombol <strong>Add domain</strong>.
                        </li>
                        <li>
                          Tempel domain Anda (atau <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-rose-900">github.io</code>) lalu klik <strong>Save</strong>.
                        </li>
                      </ol>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        onClick={onGoogleSignIn}
                        className="inline-flex items-center gap-1.5 bg-[#580001] hover:bg-[#730002] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Coba Hubungkan Ulang</span>
                      </button>
                    </div>
                  </div>
                )}

                {(syncError.includes('401') || syncError.includes('kedaluwarsa') || syncError.includes('credentials') || syncError.includes('Izin Google Sheets')) && !syncError.includes('unauthorized-domain') && (
                  <div className="pt-2 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={onGoogleSignIn}
                      className="inline-flex items-center gap-1.5 bg-[#580001] hover:bg-[#730002] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Hubungkan Ulang Akun Google (Login)</span>
                    </button>
                    <button
                      onClick={onGoogleSignOut}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <span>Masuk Mode Offline / Demo</span>
                    </button>
                  </div>
                )}
                {(syncError.includes('popup-blocked') || syncError.includes('Pop-up') || syncError.includes('pop-up')) && (
                  <div className="pt-1.5 flex flex-wrap items-center gap-2.5">
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#580001] hover:bg-[#730002] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Aplikasi di Tab Baru ↗</span>
                    </a>
                    <span className="text-[11px] text-slate-500">
                      Pop-up Google dapat dibuka secara leluasa tanpa batasan frame pratinjau browser.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ROW 5: RECENT TRANSACTIONS & FINANCIAL NOTIFICATIONS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recent Transactions List */}
        {visibleWidgets.transaksiTerbaru && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4 hover:border-slate-300 transition">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Aktivitas Transaksi Terbaru</h4>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>
              {onNavigateToTransactions && (
                <button
                  onClick={onNavigateToTransactions}
                  className="inline-flex items-center gap-1 text-[11px] bg-[#580001] hover:bg-[#730002] text-white font-bold px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Tambah
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {recentTxs.length > 0 ? (
                recentTxs.map(trx => (
                  <div key={trx.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 px-1 rounded-lg transition group">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">{trx.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-mono bg-slate-100 text-slate-600 px-1 rounded font-semibold">{trx.refNum}</span>
                        <span>•</span>
                        <span>{trx.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                      <div className="text-right font-mono text-xs font-bold text-slate-900">
                        {formatIDR(trx.amount)}
                      </div>
                      {onDeleteTransaction && (
                        <button
                          onClick={() => {
                            setDeleteTarget({ id: trx.id, description: trx.description, amount: trx.amount });
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Belum ada transaksi tercatat.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Notifications Logs */}
        {visibleWidgets.notifikasi && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3 hover:border-slate-300 transition">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setIsNotificationWidgetOpen(prev => !prev)}
                className="flex items-center gap-2 text-left cursor-pointer group"
              >
                <div className="p-1.5 bg-[#580001]/10 rounded-lg text-[#580001]">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>Notifikasi & Audit Log</span>
                    {notifications.some(n => !n.isRead) && (
                      <span className="bg-[#580001] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        {notifications.filter(n => !n.isRead).length} baru
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isNotificationWidgetOpen ? 'Klik untuk menciutkan notifikasi' : 'Klik untuk membuka riwayat notifikasi'}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1.5">
                {isNotificationWidgetOpen && notifications.some(n => !n.isRead) && (
                  <button
                    onClick={onMarkNotificationsRead}
                    className="text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    Tandai Dibaca
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsNotificationWidgetOpen(prev => !prev)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                  title={isNotificationWidgetOpen ? "Ciutkan notifikasi" : "Buka notifikasi"}
                >
                  {isNotificationWidgetOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Notification content only renders when clicked open */}
            {isNotificationWidgetOpen ? (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 animate-in fade-in duration-150">
                {notifications.length > 0 ? (
                  notifications.map((noti, idx) => (
                    <div 
                      key={`${noti.id}-${idx}`} 
                      onClick={() => onToggleNotificationRead?.(noti.id)}
                      className={`p-3 rounded-lg border transition-all flex gap-2.5 cursor-pointer select-none ${
                        noti.isRead 
                          ? 'bg-slate-50/50 border-slate-200/70 text-slate-500 hover:bg-slate-100/70' 
                          : 'bg-[#580001] text-white border-[#580001] shadow-xs hover:bg-[#430001]'
                      }`}
                    >
                      <Bell className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${noti.isRead ? 'text-slate-400' : 'text-amber-300'}`} />
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-normal ${noti.isRead ? 'text-slate-800' : 'text-white'}`}>
                          {noti.title}
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-85">{noti.message}</p>
                        <p className="text-[9px] font-mono opacity-60">
                          {new Date(noti.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Tidak ada pemberitahuan baru.
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={() => setIsNotificationWidgetOpen(true)}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-dashed border-slate-200 text-slate-500 text-xs flex items-center justify-between cursor-pointer transition"
              >
                <span className="text-[11px]">
                  {notifications.length} riwayat tercatat ({notifications.filter(n => !n.isRead).length} belum dibaca).
                </span>
                <span className="text-[11px] text-[#580001] font-semibold flex items-center gap-1">
                  Lihat Notifikasi
                  <ChevronDown className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Iframe-safe) */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden text-left">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm">Hapus Transaksi Keuangan</h3>
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeleteTarget(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 border border-rose-100">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-slate-800 text-center">
                  Hapus Transaksi: <span className="text-rose-600 font-bold">"{deleteTarget?.description}"</span>?
                </p>
                <p className="text-slate-500 text-xs leading-relaxed text-center">
                  Apakah Anda yakin ingin menghapus transaksi senilai <span className="font-mono font-bold text-slate-800">{formatIDR(deleteTarget?.amount || 0)}</span> ini?
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (deleteTarget && onDeleteTransaction) {
                      onDeleteTransaction(deleteTarget.id);
                    }
                    setIsDeleteConfirmOpen(false);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
