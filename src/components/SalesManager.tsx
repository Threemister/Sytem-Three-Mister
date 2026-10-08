/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Account, Transaction, SaleOrder, SaleChannel, SavedCalculation } from '../types';
import {
  ShoppingBag,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Trash2,
  Edit2,
  X,
  Check,
  Store,
  Wallet,
  BookOpen,
  ReceiptText,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Filter,
  TrendingUp,
  Layers,
  CheckSquare,
  Square,
  ChevronRight,
  Info,
  Shirt,
  DollarSign,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface SalesManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  sales: SaleOrder[];
  onAddSale: (newSale: SaleOrder, autoTransactions?: Transaction[]) => void;
  onEditSale: (updatedSale: SaleOrder) => void;
  onDeleteSale: (saleId: string, removeLinkedTransactions?: boolean) => void;
  onReleasePendingSales: (
    saleIds: string[],
    releaseConfig: {
      settledDate: string;
      targetAccountCode: string;
      revenueAccountCode: string;
      feeAccountCode: string;
      recordFeeSeparately: boolean;
      recordHppAuto: boolean;
      hppDebitAccountCode: string;
      hppCreditAccountCode: string;
    }
  ) => void;
  onRevertSaleToPending: (saleId: string) => void;
  onNavigateToTransactions: () => void;
  onNavigateToJournal: () => void;
}

const CHANNELS: SaleChannel[] = [
  'Shopee',
  'TikTok Shop',
  'Lazada',
  'Tokopedia',
  'WhatsApp / Direct',
  'Offline / Toko',
  'Reseller / Grosir'
];

const CHANNEL_BADGE_STYLES: Record<SaleChannel, string> = {
  'Shopee': 'bg-orange-50 text-orange-700 border-orange-200',
  'TikTok Shop': 'bg-slate-900 text-white border-slate-800',
  'Lazada': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Tokopedia': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'WhatsApp / Direct': 'bg-teal-50 text-teal-700 border-teal-200',
  'Offline / Toko': 'bg-amber-50 text-amber-800 border-amber-200',
  'Reseller / Grosir': 'bg-purple-50 text-purple-700 border-purple-200'
};

const CHANNEL_PREFIX: Record<SaleChannel, string> = {
  'Shopee': 'SHP',
  'TikTok Shop': 'TTS',
  'Lazada': 'LZD',
  'Tokopedia': 'TKP',
  'WhatsApp / Direct': 'WA',
  'Offline / Toko': 'STR',
  'Reseller / Grosir': 'GRS'
};

export default function SalesManager({
  accounts,
  transactions,
  sales,
  onAddSale,
  onEditSale,
  onDeleteSale,
  onReleasePendingSales,
  onRevertSaleToPending,
  onNavigateToTransactions,
  onNavigateToJournal
}: SalesManagerProps) {
  // Filter & Tab states
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'settled'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Pending Sales for Bulk Release
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

  // Saved HPP articles for quick product selection
  const [savedHppArticles, setSavedHppArticles] = useState<SavedCalculation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('threemister_hpp_calcs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedHppArticles(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Form Modal States (Add / Edit Sale)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleOrder | null>(null);
  const [formError, setFormError] = useState('');

  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invoiceNum, setInvoiceNum] = useState('');
  const [channel, setChannel] = useState<SaleChannel>('Shopee');
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [feePercentInput, setFeePercentInput] = useState<number>(12);
  const [marketplaceFee, setMarketplaceFee] = useState<number>(0);
  const [hppPerPiece, setHppPerPiece] = useState<number>(0);
  const [saleStatus, setSaleStatus] = useState<'pending' | 'settled'>('pending');
  const [targetAccountCode, setTargetAccountCode] = useState<string>('1-1003'); // Sea Bank / BCA
  const [revenueAccountCode, setRevenueAccountCode] = useState<string>('4-1001'); // Pendapatan Penjualan
  const [feeAccountCode, setFeeAccountCode] = useState<string>('5-1008'); // Beban Administrasi
  const [recordFeeSeparately, setRecordFeeSeparately] = useState<boolean>(true);
  const [recordHppAuto, setRecordHppAuto] = useState<boolean>(true);
  const [hppDebitAccountCode, setHppDebitAccountCode] = useState<string>('5-1001');
  const [hppCreditAccountCode, setHppCreditAccountCode] = useState<string>('1-1005');
  const [notes, setNotes] = useState<string>('');

  // Release Pending Modal States
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releasingIds, setReleasingIds] = useState<string[]>([]);
  const [releaseDate, setReleaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [releaseTargetAcc, setReleaseTargetAcc] = useState<string>('1-1003');
  const [releaseRevenueAcc, setReleaseRevenueAcc] = useState<string>('4-1001');
  const [releaseFeeAcc, setReleaseFeeAcc] = useState<string>('5-1008');
  const [releaseRecordFeeSeparately, setReleaseRecordFeeSeparately] = useState<boolean>(true);
  const [releaseRecordHppAuto, setReleaseRecordHppAuto] = useState<boolean>(true);
  const [releaseHppDebitAcc, setReleaseHppDebitAcc] = useState<string>('5-1001');
  const [releaseHppCreditAcc, setReleaseHppCreditAcc] = useState<string>('1-1005');

  // Success feedback banner after releasing pending or posting directly
  const [lastPostedBanner, setLastPostedBanner] = useState<{
    count: number;
    totalNet: number;
    txCount: number;
  } | null>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<SaleOrder | null>(null);
  const [deleteRemoveLinkedTx, setDeleteRemoveLinkedTx] = useState<boolean>(true);

  // Revert Confirmation Modal
  const [revertTarget, setRevertTarget] = useState<SaleOrder | null>(null);

  // Helper to format IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getAccountName = (code: string) => {
    return accounts.find(a => a.code === code)?.name || code;
  };

  // Computed form numbers
  const grossBeforeDiscount = qty * unitPrice;
  const grossTransacted = Math.max(0, grossBeforeDiscount - discountAmount);
  const netPayout = Math.max(0, grossTransacted - marketplaceFee);
  const totalHpp = qty * hppPerPiece;
  const estimatedNetProfit = netPayout - totalHpp;

  // Handle Channel Change in Form
  const handleChannelChange = (newChannel: SaleChannel) => {
    setChannel(newChannel);
    const isMarketplace = ['Shopee', 'TikTok Shop', 'Lazada', 'Tokopedia'].includes(newChannel);
    if (!editingSale) {
      const prefix = CHANNEL_PREFIX[newChannel] || 'SLS';
      const dateCompact = orderDate.replace(/-/g, '').slice(2);
      const rand = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNum(`${prefix}-${dateCompact}-${rand}`);

      if (isMarketplace) {
        setSaleStatus('pending');
        const defaultFeePct = newChannel === 'Shopee' ? 12 : newChannel === 'TikTok Shop' ? 11 : 10.5;
        setFeePercentInput(defaultFeePct);
        setMarketplaceFee(Math.round(( grossTransacted * defaultFeePct ) / 100));
        setTargetAccountCode(newChannel === 'Shopee' ? '1-1003' : '1-1002');
      } else {
        setSaleStatus('settled');
        setFeePercentInput(0);
        setMarketplaceFee(0);
        setTargetAccountCode(newChannel === 'Offline / Toko' ? '1-1001' : '1-1002');
      }
    }
  };

  // Recalculate discount & fee when qty or unitPrice changes
  const updatePricing = (
    newQty: number,
    newUnitPrice: number,
    discPct: number,
    feePct: number
  ) => {
    const rawTotal = newQty * newUnitPrice;
    const discNominal = Math.round((rawTotal * discPct) / 100);
    const afterDisc = Math.max(0, rawTotal - discNominal);
    const feeNominal = Math.round((afterDisc * feePct) / 100);
    setQty(newQty);
    setUnitPrice(newUnitPrice);
    setDiscountAmount(discNominal);
    setMarketplaceFee(feeNominal);
  };

  // Open Form for New Sale
  const handleOpenAddForm = () => {
    setEditingSale(null);
    setFormError('');
    const today = new Date().toISOString().split('T')[0];
    setOrderDate(today);
    const dateCompact = today.replace(/-/g, '').slice(2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    setChannel('Shopee');
    setInvoiceNum(`SHP-${dateCompact}-${rand}`);
    setCustomerName('');
    setProductName('');
    setQty(1);
    setUnitPrice(165000);
    setDiscountPercentInput(10);
    const initDisc = Math.round((165000 * 10) / 100);
    setDiscountAmount(initDisc);
    const initTransacted = 165000 - initDisc;
    setFeePercentInput(12);
    setMarketplaceFee(Math.round((initTransacted * 12) / 100));
    setHppPerPiece(58900);
    setSaleStatus('pending');
    setTargetAccountCode(accounts.some(a => a.code === '1-1003') ? '1-1003' : accounts[0]?.code || '1-1001');
    setRevenueAccountCode(accounts.some(a => a.code === '4-1001') ? '4-1001' : '4-1001');
    setFeeAccountCode(accounts.some(a => a.code === '5-1008') ? '5-1008' : '5-1006');
    setRecordFeeSeparately(true);
    setRecordHppAuto(true);
    setHppDebitAccountCode('5-1001');
    setHppCreditAccountCode('1-1005');
    setNotes('');
    setIsFormOpen(true);
  };

  // Open Form for Editing Sale
  const handleOpenEditForm = (sale: SaleOrder) => {
    setEditingSale(sale);
    setFormError('');
    setOrderDate(sale.orderDate);
    setInvoiceNum(sale.invoiceNum);
    setChannel(sale.channel);
    setCustomerName(sale.customerName);
    setProductName(sale.productName);
    setQty(sale.qty);
    setUnitPrice(sale.unitPrice);
    const rawGross = sale.qty * sale.unitPrice;
    const calcDiscPct = rawGross > 0 ? Math.round((sale.discountAmount / rawGross) * 100) : 0;
    setDiscountPercentInput(calcDiscPct);
    setDiscountAmount(sale.discountAmount);
    const calcFeePct = sale.grossTransacted > 0 ? Number(((sale.marketplaceFee / sale.grossTransacted) * 100).toFixed(1)) : 0;
    setFeePercentInput(calcFeePct);
    setMarketplaceFee(sale.marketplaceFee);
    setHppPerPiece(sale.hppPerPiece);
    setSaleStatus(sale.status);
    setTargetAccountCode(sale.targetAccountCode || '1-1002');
    setRevenueAccountCode(sale.revenueAccountCode || '4-1001');
    setFeeAccountCode(sale.feeAccountCode || '5-1008');
    setRecordFeeSeparately(sale.recordFeeSeparately ?? true);
    setRecordHppAuto(sale.recordHppAuto ?? true);
    setHppDebitAccountCode(sale.hppDebitAccountCode || '5-1001');
    setHppCreditAccountCode(sale.hppCreditAccountCode || '1-1005');
    setNotes(sale.notes || '');
    setIsFormOpen(true);
  };

  // Build transactions for a sale when it settles
  const buildTransactionsForSale = (
    sale: SaleOrder,
    settledDate: string
  ): Transaction[] => {
    const generated: Transaction[] = [];
    const nowIso = new Date().toISOString();

    if (sale.recordFeeSeparately && sale.marketplaceFee > 0) {
      // 1. Gross Revenue after discount
      generated.push({
        id: `TX-SLS-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        date: settledDate,
        refNum: sale.invoiceNum,
        description: `Penjualan ${sale.channel} (${sale.productName} x${sale.qty} pcs) - ${sale.customerName}`,
        debitAccount: sale.targetAccountCode,
        creditAccount: sale.revenueAccountCode,
        amount: sale.grossTransacted,
        createdAt: nowIso
      });
      // 2. Marketplace Admin Fee deduction
      generated.push({
        id: `TX-FEE-${Date.now() + 1}-${Math.floor(Math.random() * 100000)}`,
        date: settledDate,
        refNum: `FEE-${sale.invoiceNum}`,
        description: `Potongan Admin & Layanan ${sale.channel} atas No. Pesanan ${sale.invoiceNum}`,
        debitAccount: sale.feeAccountCode || '5-1008',
        creditAccount: sale.targetAccountCode,
        amount: sale.marketplaceFee,
        createdAt: nowIso
      });
    } else {
      // Record Net Payout directly
      generated.push({
        id: `TX-SLS-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        date: settledDate,
        refNum: sale.invoiceNum,
        description: `Pencairan Penjualan Bersih ${sale.channel} (${sale.productName} x${sale.qty} pcs) - ${sale.customerName}`,
        debitAccount: sale.targetAccountCode,
        creditAccount: sale.revenueAccountCode,
        amount: sale.netPayout,
        createdAt: nowIso
      });
    }

    // 3. HPP / COGS Entry
    if (sale.recordHppAuto && sale.totalHpp > 0) {
      generated.push({
        id: `TX-HPP-${Date.now() + 2}-${Math.floor(Math.random() * 100000)}`,
        date: settledDate,
        refNum: `HPP-${sale.invoiceNum}`,
        description: `HPP Penjualan ${sale.productName} (${sale.qty} pcs) Ref ${sale.invoiceNum}`,
        debitAccount: sale.hppDebitAccountCode || '5-1001',
        creditAccount: sale.hppCreditAccountCode || '1-1005',
        amount: sale.totalHpp,
        createdAt: nowIso
      });
    }

    return generated;
  };

  // Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!orderDate || !invoiceNum.trim() || !productName.trim() || qty <= 0 || unitPrice <= 0) {
      setFormError('Harap lengkapi Tanggal, No. Pesanan, Nama Produk, Qty, dan Harga Jual Satuan lebih dari Rp 0.');
      return;
    }

    if (netPayout <= 0) {
      setFormError('Dana Bersih Cair (Net Payout) harus lebih besar dari Rp 0.');
      return;
    }

    const baseSale: SaleOrder = {
      id: editingSale ? editingSale.id : `SALE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      orderDate,
      settledDate: saleStatus === 'settled' ? (editingSale?.settledDate || orderDate) : undefined,
      invoiceNum: invoiceNum.trim(),
      channel,
      customerName: customerName.trim() || 'Pelanggan Umum',
      productName: productName.trim(),
      qty,
      unitPrice,
      discountAmount,
      grossTransacted,
      marketplaceFee,
      netPayout,
      hppPerPiece,
      totalHpp,
      estimatedNetProfit,
      status: editingSale ? editingSale.status : saleStatus,
      targetAccountCode,
      revenueAccountCode,
      feeAccountCode,
      recordFeeSeparately,
      recordHppAuto,
      hppDebitAccountCode,
      hppCreditAccountCode,
      linkedTransactionIds: editingSale?.linkedTransactionIds,
      notes: notes.trim(),
      createdAt: editingSale ? editingSale.createdAt : new Date().toISOString()
    };

    if (editingSale) {
      onEditSale(baseSale);
    } else {
      if (saleStatus === 'settled') {
        const autoTxs = buildTransactionsForSale(baseSale, orderDate);
        baseSale.linkedTransactionIds = autoTxs.map(t => t.id);
        baseSale.settledDate = orderDate;
        onAddSale(baseSale, autoTxs);
        setLastPostedBanner({
          count: 1,
          totalNet: baseSale.netPayout,
          txCount: autoTxs.length
        });
      } else {
        onAddSale(baseSale);
      }
    }

    setIsFormOpen(false);
  };

  // Open Release Modal for single or multiple pending sales
  const handleOpenReleaseModal = (ids: string[]) => {
    if (ids.length === 0) return;
    const firstSale = sales.find(s => s.id === ids[0]);
    setReleasingIds(ids);
    setReleaseDate(new Date().toISOString().split('T')[0]);
    setReleaseTargetAcc(firstSale?.targetAccountCode || '1-1003');
    setReleaseRevenueAcc(firstSale?.revenueAccountCode || '4-1001');
    setReleaseFeeAcc(firstSale?.feeAccountCode || '5-1008');
    setReleaseRecordFeeSeparately(firstSale?.recordFeeSeparately ?? true);
    setReleaseRecordHppAuto(firstSale?.recordHppAuto ?? true);
    setReleaseHppDebitAcc(firstSale?.hppDebitAccountCode || '5-1001');
    setReleaseHppCreditAcc(firstSale?.hppCreditAccountCode || '1-1005');
    setIsReleaseModalOpen(true);
  };

  // Confirm Release Pending
  const handleConfirmRelease = () => {
    const targetSales = sales.filter(s => releasingIds.includes(s.id) && s.status === 'pending');
    if (targetSales.length === 0) {
      setIsReleaseModalOpen(false);
      return;
    }

    const totalNetReleased = targetSales.reduce((sum, s) => sum + s.netPayout, 0);
    let expectedTxCount = 0;
    targetSales.forEach(s => {
      expectedTxCount += 1;
      if (releaseRecordFeeSeparately && s.marketplaceFee > 0) expectedTxCount += 1;
      if (releaseRecordHppAuto && s.totalHpp > 0) expectedTxCount += 1;
    });

    onReleasePendingSales(releasingIds, {
      settledDate: releaseDate,
      targetAccountCode: releaseTargetAcc,
      revenueAccountCode: releaseRevenueAcc,
      feeAccountCode: releaseFeeAcc,
      recordFeeSeparately: releaseRecordFeeSeparately,
      recordHppAuto: releaseRecordHppAuto,
      hppDebitAccountCode: releaseHppDebitAcc,
      hppCreditAccountCode: releaseHppCreditAcc
    });

    setSelectedPendingIds(prev => prev.filter(id => !releasingIds.includes(id)));
    setIsReleaseModalOpen(false);
    setLastPostedBanner({
      count: targetSales.length,
      totalNet: totalNetReleased,
      txCount: expectedTxCount
    });
  };

  // Summary Metrics
  const pendingSales = useMemo(() => sales.filter(s => s.status === 'pending'), [sales]);
  const settledSales = useMemo(() => sales.filter(s => s.status === 'settled'), [sales]);

  const totalPendingNet = useMemo(() => pendingSales.reduce((sum, s) => sum + s.netPayout, 0), [pendingSales]);
  const totalPendingGross = useMemo(() => pendingSales.reduce((sum, s) => sum + s.grossTransacted, 0), [pendingSales]);
  const totalSettledNet = useMemo(() => settledSales.reduce((sum, s) => sum + s.netPayout, 0), [settledSales]);
  const totalAllProfit = useMemo(() => sales.reduce((sum, s) => sum + s.estimatedNetProfit, 0), [sales]);

  // Breakdown Pending by Platform
  const pendingByChannel = useMemo(() => {
    const map: Record<string, { count: number; net: number }> = {};
    pendingSales.forEach(s => {
      if (!map[s.channel]) map[s.channel] = { count: 0, net: 0 };
      map[s.channel].count += 1;
      map[s.channel].net += s.netPayout;
    });
    return map;
  }, [pendingSales]);

  // Chart View States (Harian vs Bulanan, Chart Type, Channel Filter)
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'monthly'>('daily');
  const [chartViewMode, setChartViewMode] = useState<'area' | 'bar'>('area');
  const [showChartPanel, setShowChartPanel] = useState<boolean>(true);

  const formatCompactIDR = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}Jt`;
    if (abs >= 1_000) return `Rp ${Math.round(val / 1_000)}rb`;
    return `Rp ${val}`;
  };

  // Filtered sales specifically for chart (respects channelFilter and date filters if active)
  const chartSourceSales = useMemo(() => {
    return sales.filter(s => {
      if (channelFilter !== 'ALL' && s.channel !== channelFilter) return false;
      if (startDate && s.orderDate < startDate) return false;
      if (endDate && s.orderDate > endDate) return false;
      return true;
    });
  }, [sales, channelFilter, startDate, endDate]);

  // Aggregated Chart Data (Daily or Monthly)
  const salesTrendData = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        fullLabel: string;
        omsetKotor: number;
        danaBersih: number;
        danaCair: number;
        danaPending: number;
        labaBersih: number;
        qtyTerjual: number;
        orderCount: number;
      }
    >();

    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthNamesFull = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    chartSourceSales.forEach(s => {
      if (!s.orderDate) return;
      const parts = s.orderDate.split('-');
      if (parts.length < 3) return;
      const [yyyy, mm, dd] = parts;
      const monthIdx = Math.max(0, Math.min(11, parseInt(mm, 10) - 1));

      const key = chartTimeframe === 'daily' ? s.orderDate : `${yyyy}-${mm}`;
      const label =
        chartTimeframe === 'daily'
          ? `${dd} ${monthNamesShort[monthIdx]}`
          : `${monthNamesShort[monthIdx]} ${yyyy}`;
      const fullLabel =
        chartTimeframe === 'daily'
          ? `${ parseInt(dd, 10) } ${monthNamesFull[monthIdx]} ${yyyy}`
          : `${monthNamesFull[monthIdx]} ${yyyy}`;

      const existing = map.get(key) || {
        key,
        label,
        fullLabel,
        omsetKotor: 0,
        danaBersih: 0,
        danaCair: 0,
        danaPending: 0,
        labaBersih: 0,
        qtyTerjual: 0,
        orderCount: 0
      };

      existing.omsetKotor += s.grossTransacted;
      existing.danaBersih += s.netPayout;
      if (s.status === 'settled') {
        existing.danaCair += s.netPayout;
      } else {
        existing.danaPending += s.netPayout;
      }
      existing.labaBersih += s.estimatedNetProfit;
      existing.qtyTerjual += s.qty;
      existing.orderCount += 1;

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [chartSourceSales, chartTimeframe]);

  // Platform Performance Breakdown for Visual Analytics
  const channelPerformanceData = useMemo(() => {
    const map = new Map<
      string,
      {
        channel: SaleChannel;
        orders: number;
        qty: number;
        netPayout: number;
        profit: number;
      }
    >();

    chartSourceSales.forEach(s => {
      const curr = map.get(s.channel) || {
        channel: s.channel,
        orders: 0,
        qty: 0,
        netPayout: 0,
        profit: 0
      };
      curr.orders += 1;
      curr.qty += s.qty;
      curr.netPayout += s.netPayout;
      curr.profit += s.estimatedNetProfit;
      map.set(s.channel, curr);
    });

    const totalNet = Array.from(map.values()).reduce((acc, item) => acc + item.netPayout, 0);
    return Array.from(map.values())
      .sort((a, b) => b.netPayout - a.netPayout)
      .map(item => ({
        ...item,
        sharePct: totalNet > 0 ? Math.round((item.netPayout / totalNet) * 100) : 0
      }));
  }, [chartSourceSales]);

  const bestPeriodInfo = useMemo(() => {
    if (salesTrendData.length === 0) return null;
    return salesTrendData.reduce((best, curr) =>
      curr.danaBersih > best.danaBersih ? curr : best
    , salesTrendData[0]);
  }, [salesTrendData]);

  // Filtered Sales List
  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        if (statusTab === 'pending' && s.status !== 'pending') return false;
        if (statusTab === 'settled' && s.status !== 'settled') return false;
        if (channelFilter !== 'ALL' && s.channel !== channelFilter) return false;
        if (startDate && s.orderDate < startDate) return false;
        if (endDate && s.orderDate > endDate) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchInvoice = s.invoiceNum.toLowerCase().includes(q);
          const matchCustomer = s.customerName.toLowerCase().includes(q);
          const matchProduct = s.productName.toLowerCase().includes(q);
          const matchChannel = s.channel.toLowerCase().includes(q);
          if (!matchInvoice && !matchCustomer && !matchProduct && !matchChannel) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Pending first if viewing 'all', then newest orderDate
        if (statusTab === 'all' && a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }
        return b.orderDate.localeCompare(a.orderDate);
      });
  }, [sales, statusTab, channelFilter, startDate, endDate, search]);

  const visiblePendingIds = useMemo(
    () => filteredSales.filter(s => s.status === 'pending').map(s => s.id),
    [filteredSales]
  );

  const isAllVisiblePendingSelected =
    visiblePendingIds.length > 0 && visiblePendingIds.every(id => selectedPendingIds.includes(id));

  const toggleSelectAllPending = () => {
    if (isAllVisiblePendingSelected) {
      setSelectedPendingIds(prev => prev.filter(id => !visiblePendingIds.includes(id)));
    } else {
      setSelectedPendingIds(prev => Array.from(new Set([...prev, ...visiblePendingIds])));
    }
  };

  const toggleSelectOnePending = (id: string) => {
    setSelectedPendingIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedPendingTotalRp = useMemo(() => {
    return sales
      .filter(s => selectedPendingIds.includes(s.id) && s.status === 'pending')
      .reduce((sum, s) => sum + s.netPayout, 0);
  }, [sales, selectedPendingIds]);

  // Preview numbers for Release Modal
  const releasingSalesObjects = useMemo(
    () => sales.filter(s => releasingIds.includes(s.id) && s.status === 'pending'),
    [sales, releasingIds]
  );
  const releaseSummary = useMemo(() => {
    return releasingSalesObjects.reduce(
      (acc, s) => {
        acc.gross += s.grossTransacted;
        acc.fee += s.marketplaceFee;
        acc.net += s.netPayout;
        acc.hpp += s.totalHpp;
        acc.qty += s.qty;
        return acc;
      },
      { gross: 0, fee: 0, net: 0, hpp: 0, qty: 0 }
    );
  }, [releasingSalesObjects]);

  return (
    <div id="sales-manager" className="space-y-6">
      {/* Top Header & Workflow Explanation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#580001]/10 text-[#580001] text-[11px] font-bold uppercase tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Modul Penjualan & Escrow Marketplace</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pencatatan Penjualan & Dana Pending
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Catat setiap pesanan yang masuk agar tidak lupa meskipun uang di marketplace (Shopee, TikTok Shop, Lazada) masih <strong>Pending / Belum Cair</strong>. Saat dana sudah cair, klik <strong>"Lepas Pending"</strong> untuk membukukannya secara otomatis ke <strong>Pencatatan Transaksi Keuangan</strong> dan <strong>Jurnal Umum</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {selectedPendingIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenReleaseModal(selectedPendingIds)}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer animate-in fade-in duration-150"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Lepas Pending ({selectedPendingIds.length}) • {formatIDR(selectedPendingTotalRp)}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#430001] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Penjualan Baru</span>
            </button>
          </div>
        </div>

        {/* 3-Step Visual Workflow Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/70 rounded-xl p-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div className="text-xs">
              <span className="font-bold text-amber-950 block">Simpan Pending Order</span>
              <span className="text-amber-800/90 text-[11px]">
                Catat order marketplace saat barang dikirim agar piutang penjualan tidak terlupa.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-50/70 border border-blue-200/70 rounded-xl p-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div className="text-xs">
              <span className="font-bold text-blue-950 block">Pantau Uang Tertahan</span>
              <span className="text-blue-800/90 text-[11px]">
                Lihat total dana bersih yang masih ditahan Shopee, TikTok Shop, & Lazada.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div className="text-xs">
              <span className="font-bold text-emerald-950 block">Lepas Pending ➔ Jurnal Otomatis</span>
              <span className="text-emerald-800/90 text-[11px]">
                Begitu dana cair, klik "Lepas Pending" & otomatis masuk Transaksi Keuangan + Jurnal Umum.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Posted Success Feedback Banner */}
      {lastPostedBanner && (
        <div className="bg-emerald-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-300 shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                Berhasil Dicairkan & Otomatis Dibukukan ke Akuntansi!
              </h4>
              <p className="text-xs text-emerald-100 leading-relaxed">
                Sebanyak <strong>{lastPostedBanner.count} pesanan penjualan</strong> dengan dana bersih{' '}
                <strong className="font-mono text-amber-300">{formatIDR(lastPostedBanner.totalNet)}</strong> telah dilepas dari status Pending dan menghasilkan{' '}
                <strong>{lastPostedBanner.txCount} entri transaksi</strong> di Pencatatan Transaksi Keuangan serta Jurnal Umum.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onNavigateToTransactions}
              className="px-3 py-2 bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>Lihat Transaksi</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToJournal}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-emerald-500"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Lihat Jurnal Umum</span>
            </button>
            <button
              type="button"
              onClick={() => setLastPostedBanner(null)}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: Pending Money vs Settled Money */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Uang Pending (Belum Cair) */}
        <div className="bg-amber-50/90 rounded-2xl border-2 border-amber-300/90 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-800" />
                Uang Pending (Belum Cair)
              </span>
              <span className="text-xs font-bold text-amber-900 bg-white px-2.5 py-0.5 rounded-full border border-amber-200">
                {pendingSales.length} Pesanan
              </span>
            </div>
            <div className="pt-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-950">
                {formatIDR(totalPendingNet)}
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Omset Pembeli: <strong className="font-mono">{formatIDR(totalPendingGross)}</strong> (sebelum potongan admin)
              </p>
            </div>
          </div>

          {/* Breakdown per marketplace */}
          <div className="pt-3 border-t border-amber-200/80 space-y-1.5">
            {Object.keys(pendingByChannel).length > 0 ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                  Rincian Tertahan per Platform:
                </span>
                {(Object.entries(pendingByChannel) as [string, { count: number; net: number }][]).map(([ch, info]) => (
                  <div key={ch} className="flex items-center justify-between text-xs bg-white/80 px-2.5 py-1.5 rounded-lg border border-amber-200/60">
                    <span className="font-semibold text-slate-800">
                      {ch} <span className="text-slate-400 font-normal">({info.count} order)</span>
                    </span>
                    <span className="font-mono font-bold text-amber-950">{formatIDR(info.net)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Semua penjualan marketplace sudah cair!
              </p>
            )}

            {pendingSales.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenReleaseModal(pendingSales.map(s => s.id))}
                className="w-full mt-2 py-2 px-3 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Cairkan Semua Pending ({pendingSales.length} Order)</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Penjualan Sudah Cair & Masuk Jurnal */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Sudah Dibayar / Cair
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                {settledSales.length} Pesanan
              </span>
            </div>
            <div className="pt-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {formatIDR(totalSettledNet)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dana bersih yang sudah masuk ke Rekening Kas/Bank & Jurnal Umum
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onNavigateToTransactions}
              className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ReceiptText className="w-3.5 h-3.5 text-[#580001]" />
              <span>Cek Transaksi</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToJournal}
              className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#580001]" />
              <span>Cek Jurnal Umum</span>
            </button>
          </div>
        </div>

        {/* Card 3: Estimasi Laba Bersih Penjualan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#580001] bg-[#580001]/10 px-2.5 py-1 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5" />
                Total Laba Bersih Penjualan
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {sales.reduce((sum, s) => sum + s.qty, 0)} Pcs Terjual
              </span>
            </div>
            <div className="pt-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#580001]">
                {formatIDR(totalAllProfit)}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Setelah dikurangi diskon toko, komisi marketplace, dan HPP produksi pakaian
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Total Potongan Admin</span>
              <span className="font-mono font-bold text-rose-600">
                {formatIDR(sales.reduce((sum, s) => sum + s.marketplaceFee, 0))}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Total Modal HPP</span>
              <span className="font-mono font-bold text-slate-800">
                {formatIDR(sales.reduce((sum, s) => sum + s.totalHpp, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visualisasi Grafik Tren Penjualan Harian & Bulanan */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#580001]">
              <BarChart3 className="w-4 h-4" />
              <span>Visualisasi Performa Penjualan</span>
              {channelFilter !== 'ALL' && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-600">Filter Platform: {channelFilter}</span>
                </>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Grafik Tren Penjualan {chartTimeframe === 'daily' ? 'Harian' : 'Bulanan'} & Profitabilitas
            </h3>
            <p className="text-xs text-slate-500">
              Pantau perbandingan Omset Pembeli, Dana Bersih Cair, Dana Pending, serta Estimasi Laba Bersih secara visual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Control: Harian vs Bulanan */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setChartTimeframe('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  chartTimeframe === 'daily'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#580001]" />
                <span>Tren Harian</span>
              </button>
              <button
                type="button"
                onClick={() => setChartTimeframe('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  chartTimeframe === 'monthly'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#580001]" />
                <span>Tren Bulanan</span>
              </button>
            </div>

            {/* Segmented Control: Area vs Bar Breakdown */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setChartViewMode('area')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartViewMode === 'area'
                    ? 'bg-[#580001] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Omset vs Laba
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('bar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartViewMode === 'bar'
                    ? 'bg-[#580001] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cair vs Pending
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowChartPanel(prev => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            >
              {showChartPanel ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
            </button>
          </div>
        </div>

        {showChartPanel && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Recharts Area / Bar Chart */}
            <div className="lg:col-span-8 space-y-3">
              {salesTrendData.length > 0 ? (
                <div className="h-[320px] w-full bg-slate-50/50 rounded-xl border border-slate-100 p-3 sm:p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={salesTrendData}
                      margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradDanaBersih" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#580001" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#580001" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradLabaBersih" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactIDR}
                        tick={{ fontSize: 11, fill: '#475569' }}
                        axisLine={false}
                        tickLine={false}
                        width={72}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [formatIDR(Number(value) || 0), name]}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          if (item) {
                            return `${item.fullLabel} · ${item.orderCount} Pesanan (${item.qtyTerjual} pcs)`;
                          }
                          return label;
                        }}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          fontSize: '12px',
                          padding: '10px 14px'
                        }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                        labelStyle={{ color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        iconType="circle"
                      />

                      {chartViewMode === 'area' ? (
                        <>
                          <Area
                            type="monotone"
                            dataKey="danaBersih"
                            name="Dana Bersih (Net Payout)"
                            stroke="#580001"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#gradDanaBersih)"
                            activeDot={{ r: 5, fill: '#580001' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="labaBersih"
                            name="Estimasi Laba Bersih"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#gradLabaBersih)"
                            activeDot={{ r: 5, fill: '#059669' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="omsetKotor"
                            name="Omset Pembeli"
                            stroke="#64748b"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={{ r: 3, fill: '#64748b' }}
                          />
                        </>
                      ) : (
                        <>
                          <Bar
                            dataKey="danaCair"
                            name="Sudah Cair (Masuk Kas/Bank)"
                            stackId="payout"
                            fill="#059669"
                            radius={[0, 0, 4, 4]}
                            maxBarSize={44}
                          />
                          <Bar
                            dataKey="danaPending"
                            name="Masih Pending (Tertahan)"
                            stackId="payout"
                            fill="#f59e0b"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={44}
                          />
                          <Line
                            type="monotone"
                            dataKey="labaBersih"
                            name="Estimasi Laba Bersih"
                            stroke="#580001"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#580001' }}
                          />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Belum ada data penjualan untuk ditampilkan pada grafik
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Tambahkan pesanan baru atau ubah filter tanggal/platform untuk melihat tren visual.
                  </p>
                </div>
              )}

              {/* Quick Period Insight Strip */}
              {bestPeriodInfo && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#580001] shrink-0" />
                    <span>
                      Puncak Penjualan {chartTimeframe === 'daily' ? 'Harian' : 'Bulanan'}:{' '}
                      <strong className="text-slate-900">{bestPeriodInfo.fullLabel}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-700 font-bold">
                      Net: {formatIDR(bestPeriodInfo.danaBersih)}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-emerald-700 font-bold">
                      Laba: {formatIDR(bestPeriodInfo.labaBersih)}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600">
                      {bestPeriodInfo.qtyTerjual} pcs
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Kontribusi per Platform / Channel */}
            <div className="lg:col-span-4 bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Kontribusi per Platform
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Proporsi dana bersih & jumlah pcs terjual
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {chartSourceSales.length} Order
                </span>
              </div>

              {channelPerformanceData.length > 0 ? (
                <div className="space-y-3">
                  {channelPerformanceData.map(item => (
                    <div key={item.channel} className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/70">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{item.channel}</span>
                        <span className="font-mono font-bold text-[#580001]">
                          {formatIDR(item.netPayout)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#580001] rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(4, item.sharePct)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {item.orders} pesanan · {item.qty} pcs ({item.sharePct}%)
                        </span>
                        <span className="text-emerald-700 font-mono font-semibold">
                          Laba: {formatIDR(item.profit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-8 text-center">
                  Tidak ada data platform untuk filter saat ini.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                statusTab === 'all'
                  ? 'bg-[#580001] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span>Semua Penjualan</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-white text-slate-700'}`}>
                {sales.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                statusTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending / Belum Dibayar</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-950 text-amber-200 font-mono">
                {pendingSales.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('settled')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                statusTab === 'settled'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sudah Cair / Lunas</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${statusTab === 'settled' ? 'bg-white/20 text-white' : 'bg-emerald-200/70 text-emerald-900'}`}>
                {settledSales.length}
              </span>
            </button>
          </div>

          {/* Channel Quick Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setChannelFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                channelFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Platform
            </button>
            {CHANNELS.map(ch => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannelFilter(ch)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                  channelFilter === ch
                    ? 'bg-[#580001] text-white'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No. Pesanan, nama pembeli, atau artikel baju..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            {visiblePendingIds.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllPending}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl transition cursor-pointer"
              >
                {isAllVisiblePendingSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span>{isAllVisiblePendingSelected ? 'Batal Pilih Pending' : 'Pilih Semua Pending'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStatusTab('all');
                setChannelFilter('ALL');
                setSearch('');
                setStartDate('');
                setEndDate('');
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Daftar Pesanan Penjualan ({filteredSales.length})
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400">Total Dana Bersih Filter:</span>{' '}
              <strong className="font-mono font-bold text-slate-900">
                {formatIDR(filteredSales.reduce((sum, s) => sum + s.netPayout, 0))}
              </strong>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  {visiblePendingIds.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllPending}
                      title="Pilih semua penjualan pending"
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {isAllVisiblePendingSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#580001]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </th>
                <th className="py-3.5 px-4">Tanggal & No. Pesanan</th>
                <th className="py-3.5 px-4">Platform & Pembeli</th>
                <th className="py-3.5 px-4">Produk / Artikel Pakaian</th>
                <th className="py-3.5 px-4 text-right">Harga Pembeli</th>
                <th className="py-3.5 px-4 text-right">Potongan MP</th>
                <th className="py-3.5 px-4 text-right">Dana Bersih (Cair)</th>
                <th className="py-3.5 px-4 text-center">Status Uang</th>
                <th className="py-3.5 px-4 text-right">Aksi Pencairan & Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => {
                  const isPending = sale.status === 'pending';
                  const isSelected = selectedPendingIds.includes(sale.id);

                  return (
                    <tr
                      key={sale.id}
                      className={`transition ${
                        isPending
                          ? isSelected
                            ? 'bg-amber-100/50 hover:bg-amber-100/70'
                            : 'bg-amber-50/25 hover:bg-amber-50/60'
                          : 'bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox for Pending */}
                      <td className="py-4 px-4 text-center">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectOnePending(sale.id)}
                            className="text-amber-700 hover:text-amber-950 cursor-pointer"
                            title="Pilih untuk cairkan sekaligus"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#580001]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" title="Sudah cair & masuk jurnal" />
                        )}
                      </td>

                      {/* Date & Invoice */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{sale.invoiceNum}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Order: {sale.orderDate}
                        </div>
                        {!isPending && sale.settledDate && (
                          <div className="text-[10px] text-emerald-700 font-mono font-semibold">
                            Cair: {sale.settledDate}
                          </div>
                        )}
                      </td>

                      {/* Channel & Customer */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            CHANNEL_BADGE_STYLES[sale.channel] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {sale.channel}
                        </span>
                        <div className="text-slate-700 font-semibold mt-1 truncate max-w-[150px]" title={sale.customerName}>
                          {sale.customerName}
                        </div>
                      </td>

                      {/* Product & Qty & HPP */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 max-w-[230px] truncate" title={sale.productName}>
                          {sale.productName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">{sale.qty} pcs</span>
                          <span>×</span>
                          <span className="font-mono">{formatIDR(sale.unitPrice)}</span>
                          {sale.discountAmount > 0 && (
                            <span className="text-rose-600 font-mono text-[10px]">
                              (Diskon -{formatIDR(sale.discountAmount)})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          HPP Total: {formatIDR(sale.totalHpp)} • Est. Laba:{' '}
                          <span className="text-emerald-700 font-bold">{formatIDR(sale.estimatedNetProfit)}</span>
                        </div>
                      </td>

                      {/* Gross Transacted */}
                      <td className="py-4 px-4 text-right font-mono text-slate-700">
                        {formatIDR(sale.grossTransacted)}
                      </td>

                      {/* Marketplace Fee */}
                      <td className="py-4 px-4 text-right font-mono">
                        {sale.marketplaceFee > 0 ? (
                          <span className="text-rose-600">-{formatIDR(sale.marketplaceFee)}</span>
                        ) : (
                          <span className="text-slate-400">Rp 0</span>
                        )}
                      </td>

                      {/* Net Payout */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-mono font-black text-sm text-slate-900">
                          {formatIDR(sale.netPayout)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Ke: [{sale.targetAccountCode}] {getAccountName(sale.targetAccountCode)}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                            Pending
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Sudah Cair
                            </span>
                            <span className="text-[9px] text-emerald-700 font-semibold">
                              Tercatat di Jurnal
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReleaseModal([sale.id])}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-2xs transition cursor-pointer"
                              title="Lepas Pending & Otomatis Catat ke Transaksi Keuangan + Jurnal Umum"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Lepas Pending</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRevertTarget(sale)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 hover:border-amber-300 text-[10px] font-semibold rounded-xl transition cursor-pointer"
                              title="Kembalikan status menjadi Pending & batalkan jurnal terkait"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Ke Pending</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(sale)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Ubah Penjualan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(sale);
                              setDeleteRemoveLinkedTx(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Penjualan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShoppingBag className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Tidak ada data penjualan pada filter ini.</p>
                      <p className="text-xs text-slate-400">
                        Klik tombol "Catat Penjualan Baru" di kanan atas untuk mencatat order marketplace atau toko.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL 1: ADD / EDIT SALE ORDER ================= */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#580001]/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#580001] text-white">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#580001] text-sm sm:text-base">
                    {editingSale ? 'Ubah Data Pesanan Penjualan' : 'Catat Pesanan Penjualan Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Simpan sebagai Pending (jika uang masih ditahan di marketplace) atau Langsung Cair.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step 1: Pilih Status Pembayaran (Simpan Pending vs Langsung Cair) */}
              {!editingSale && (
                <div className="space-y-2">
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider">
                    1. Status Uang Penjualan Saat Ini
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSaleStatus('pending')}
                      className={`p-3.5 rounded-xl border-2 text-left transition cursor-pointer flex items-start gap-3 ${
                        saleStatus === 'pending'
                          ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${saleStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          ⏳ Simpan Pending (Belum Cair)
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                          Uang masih tertahan di marketplace. Dicatat dulu agar tidak lupa; baru masuk Transaksi & Jurnal saat dilepas.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSaleStatus('settled')}
                      className={`p-3.5 rounded-xl border-2 text-left transition cursor-pointer flex items-start gap-3 ${
                        saleStatus === 'settled'
                          ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${saleStatus === 'settled' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          ✅ Langsung Dibayar / Sudah Cair
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                          Uang sudah diterima di Kas/Bank. Otomatis langsung tercatat ke Pencatatan Transaksi & Jurnal Umum.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Informasi Pesanan & Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-2">
                <div>
                  <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase tracking-wider">
                    Platform / Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => handleChannelChange(e.target.value as SaleChannel)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-[#580001]"
                  >
                    {CHANNELS.map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase tracking-wider">
                    Tanggal Order
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#580001]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase tracking-wider">
                    No. Pesanan / Invoice
                  </label>
                  <input
                    type="text"
                    placeholder="SHP-261008-001"
                    value={invoiceNum}
                    onChange={(e) => setInvoiceNum(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#580001]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase tracking-wider">
                    Username / Pembeli
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: rizky_99"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#580001]"
                  />
                </div>
              </div>

              {/* Step 3: Produk & Ambil Cepat dari HPP */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-[#580001]" />
                    <span>Rincian Produk, Diskon, & Potongan Marketplace</span>
                  </label>

                  {savedHppArticles.length > 0 && (
                    <select
                      onChange={(e) => {
                        const found = savedHppArticles.find(a => a.id === e.target.value);
                        if (found) {
                          setProductName(found.productName);
                          setHppPerPiece(found.hppPerPiece);
                          updatePricing(qty, found.retailPrice, discountPercentInput, feePercentInput);
                        }
                      }}
                      defaultValue=""
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-[#580001] focus:outline-none"
                    >
                      <option value="" disabled>⚡ Isi Otomatis dari Artikel HPP Tersimpan...</option>
                      {savedHppArticles.map(art => (
                        <option key={art.id} value={art.id}>
                          {art.productName} (HPP: {formatIDR(art.hppPerPiece)} | Retail: {formatIDR(art.retailPrice)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                      Nama Produk / Artikel Pakaian
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kaos Heavyweight 24s Boxy Hitam"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#580001]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                      Jumlah (Qty Pcs)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={qty || ''}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        updatePricing(val, unitPrice, discountPercentInput, feePercentInput);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#580001]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                      Harga Jual Etalase / Pcs (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={unitPrice || ''}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        updatePricing(qty, val, discountPercentInput, feePercentInput);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#580001]"
                    />
                  </div>
                </div>

                {/* Discount, Marketplace Fee, and HPP row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Discount */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Diskon / Voucher Toko</label>
                      <div className="flex items-center gap-1">
                        {[0, 10, 15, 20].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setDiscountPercentInput(pct);
                              updatePricing(qty, unitPrice, pct, feePercentInput);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              discountPercentInput === pct
                                ? 'bg-[#580001] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min={0}
                        value={discountAmount || ''}
                        onChange={(e) => {
                          const discVal = Math.max(0, parseFloat(e.target.value) || 0);
                          setDiscountAmount(discVal);
                          const newGross = Math.max(0, qty * unitPrice - discVal);
                          setMarketplaceFee(Math.round((newGross * feePercentInput) / 100));
                        }}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Harga Pembeli:</span>
                      <strong className="font-mono text-slate-800">{formatIDR(grossTransacted)}</strong>
                    </div>
                  </div>

                  {/* Marketplace Fee */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Potongan Admin MP</label>
                      <div className="flex items-center gap-1">
                        {[0, 8, 12, 14.5].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setFeePercentInput(pct);
                              setMarketplaceFee(Math.round((grossTransacted * pct) / 100));
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              feePercentInput === pct
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min={0}
                        value={marketplaceFee || ''}
                        onChange={(e) => setMarketplaceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-rose-600"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Dana Bersih Cair:</span>
                      <strong className="font-mono text-emerald-700">{formatIDR(netPayout)}</strong>
                    </div>
                  </div>

                  {/* HPP per Piece */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Modal HPP / Pcs</label>
                      <span className="text-[10px] text-slate-400 font-mono">× {qty} pcs</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min={0}
                        value={hppPerPiece || ''}
                        onChange={(e) => setHppPerPiece(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Total HPP ({qty} pcs):</span>
                      <strong className="font-mono text-slate-800">{formatIDR(totalHpp)}</strong>
                    </div>
                  </div>
                </div>

                {/* Live Calculation Summary Bar */}
                <div className="bg-[#580001] text-white p-3.5 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-white/70 uppercase block">Harga Transaksi Pembeli</span>
                    <span className="font-mono font-bold text-sm">{formatIDR(grossTransacted)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/70 uppercase block">Potongan Admin MP</span>
                    <span className="font-mono font-bold text-sm text-rose-300">-{formatIDR(marketplaceFee)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-300 uppercase font-bold block">
                      {saleStatus === 'pending' ? 'Uang Pending (Akan Cair)' : 'Dana Bersih Masuk Kas/Bank'}
                    </span>
                    <span className="font-mono font-black text-base text-amber-300">{formatIDR(netPayout)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-300 uppercase font-bold block">Est. Laba Bersih</span>
                    <span className="font-mono font-black text-sm text-emerald-300">{formatIDR(estimatedNetProfit)}</span>
                  </div>
                </div>
              </div>

              {/* Step 4: Pemetaan Akun COA (Otomatisasi ke Transaksi & Jurnal Umum) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pengaturan Akun untuk Pencatatan Transaksi & Jurnal Umum Otomatis
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {saleStatus === 'pending' ? 'Digunakan otomatis saat Pending dilepas' : 'Langsung dibukukan sekarang'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                      Rekening Kas / Bank Penerima (Debit)
                    </label>
                    <select
                      value={targetAccountCode}
                      onChange={(e) => setTargetAccountCode(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      {accounts
                        .filter(a => a.type === 'Aktiva')
                        .map(acc => (
                          <option key={acc.code} value={acc.code}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                      Akun Pendapatan Penjualan (Kredit)
                    </label>
                    <select
                      value={revenueAccountCode}
                      onChange={(e) => setRevenueAccountCode(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      {accounts
                        .filter(a => a.type === 'Pendapatan')
                        .map(acc => (
                          <option key={acc.code} value={acc.code}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                      Akun Beban Potongan Marketplace
                    </label>
                    <select
                      value={feeAccountCode}
                      onChange={(e) => setFeeAccountCode(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      {accounts
                        .filter(a => a.type === 'Beban')
                        .map(acc => (
                          <option key={acc.code} value={acc.code}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={recordFeeSeparately}
                      onChange={(e) => setRecordFeeSeparately(e.target.checked)}
                      className="mt-0.5 rounded text-[#580001]"
                    />
                    <div>
                      <span className="font-bold block">Catat Potongan Admin Marketplace ke Jurnal Beban</span>
                      <span className="text-[10px] text-slate-500">
                        Membukukan Omset Pembeli secara utuh & mencatat potongan komisi sebagai beban secara transparan.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={recordHppAuto}
                      onChange={(e) => setRecordHppAuto(e.target.checked)}
                      className="mt-0.5 rounded text-[#580001]"
                    />
                    <div>
                      <span className="font-bold block">Catat Jurnal HPP & Pengurangan Persediaan Otomatis</span>
                      <span className="text-[10px] text-slate-500">
                        Otomatis mendebit [5-1001] HPP dan mengkredit [1-1005] Persediaan Barang saat penjualan cair.
                      </span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                    Catatan Pengiriman / Resi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Resi J&T JP12345678, menunggu pembeli klik pesanan diterima..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2 ${
                    !editingSale && saleStatus === 'pending'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-[#580001] hover:bg-[#430001]'
                  }`}
                >
                  {editingSale ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  ) : saleStatus === 'pending' ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Simpan sebagai Pending ({formatIDR(netPayout)})</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan & Catat ke Transaksi + Jurnal ({formatIDR(netPayout)})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: LEPAS PENDING & POSTING OTOMATIS KE TRANSAKSI + JURNAL ================= */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-emerald-100 bg-emerald-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm sm:text-base">
                    Lepas Pending & Catat Otomatis ke Transaksi + Jurnal Umum
                  </h3>
                  <p className="text-[11px] text-emerald-800">
                    {releasingSalesObjects.length} pesanan dipilih • Total Dana Bersih Cair:{' '}
                    <strong className="font-mono">{formatIDR(releaseSummary.net)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReleaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* List of orders being released */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 max-h-40 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Daftar Pesanan Pending yang Akan Dicairkan:
                </span>
                {releasingSalesObjects.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{item.invoiceNum}</span>
                      <span className="mx-1.5 text-slate-300">•</span>
                      <span className="font-semibold text-slate-700">{item.channel}</span>
                      <span className="text-slate-500 ml-1">({item.productName} x{item.qty})</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{formatIDR(item.netPayout)}</span>
                  </div>
                ))}
              </div>

              {/* Account Configuration for Automatic Journal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                    Tanggal Cair / Tanggal Buku Jurnal
                  </label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                    Rekening Kas / Bank Penerima (Debit)
                  </label>
                  <select
                    value={releaseTargetAcc}
                    onChange={(e) => setReleaseTargetAcc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {accounts
                      .filter(a => a.type === 'Aktiva')
                      .map(acc => (
                        <option key={acc.code} value={acc.code}>
                          [{acc.code}] {acc.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                    Akun Pendapatan Penjualan (Kredit)
                  </label>
                  <select
                    value={releaseRevenueAcc}
                    onChange={(e) => setReleaseRevenueAcc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {accounts
                      .filter(a => a.type === 'Pendapatan')
                      .map(acc => (
                        <option key={acc.code} value={acc.code}>
                          [{acc.code}] {acc.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">
                    Akun Beban Potongan Marketplace
                  </label>
                  <select
                    value={releaseFeeAcc}
                    onChange={(e) => setReleaseFeeAcc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {accounts
                      .filter(a => a.type === 'Beban')
                      .map(acc => (
                        <option key={acc.code} value={acc.code}>
                          [{acc.code}] {acc.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={releaseRecordFeeSeparately}
                    onChange={(e) => setReleaseRecordFeeSeparately(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Catat Potongan Admin MP Terpisah</span>
                    <span className="text-[10px] text-slate-500">
                      Catat Omset Kotor ({formatIDR(releaseSummary.gross)}) & Beban Admin ({formatIDR(releaseSummary.fee)}).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={releaseRecordHppAuto}
                    onChange={(e) => setReleaseRecordHppAuto(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Catat Jurnal HPP & Persediaan Otomatis</span>
                    <span className="text-[10px] text-slate-500">
                      Otomatis catat HPP ({formatIDR(releaseSummary.hpp)}) untuk {releaseSummary.qty} pcs terjual.
                    </span>
                  </div>
                </label>
              </div>

              {/* Live Journal Entry Preview */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
                    Pratinjau Jurnal Umum Otomatis (Double-Entry):
                  </span>
                  <span className="text-[10px] text-emerald-400 font-sans font-bold">SEIMBANG (BALANCED)</span>
                </div>

                {releaseRecordFeeSeparately && releaseSummary.fee > 0 ? (
                  <>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400">1. Jurnal Penerimaan Omset Penjualan:</div>
                      <div className="flex justify-between">
                        <span>[Debit] {releaseTargetAcc} - {getAccountName(releaseTargetAcc)}</span>
                        <span className="text-emerald-300 font-bold">{formatIDR(releaseSummary.gross)}</span>
                      </div>
                      <div className="flex justify-between pl-5 text-slate-300">
                        <span>[Kredit] {releaseRevenueAcc} - {getAccountName(releaseRevenueAcc)}</span>
                        <span>{formatIDR(releaseSummary.gross)}</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1.5 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400">2. Jurnal Potongan Komisi / Admin Marketplace:</div>
                      <div className="flex justify-between">
                        <span>[Debit] {releaseFeeAcc} - {getAccountName(releaseFeeAcc)}</span>
                        <span className="text-rose-300 font-bold">{formatIDR(releaseSummary.fee)}</span>
                      </div>
                      <div className="flex justify-between pl-5 text-slate-300">
                        <span>[Kredit] {releaseTargetAcc} - {getAccountName(releaseTargetAcc)}</span>
                        <span>{formatIDR(releaseSummary.fee)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400">1. Jurnal Penerimaan Penjualan Bersih (Net):</div>
                    <div className="flex justify-between">
                      <span>[Debit] {releaseTargetAcc} - {getAccountName(releaseTargetAcc)}</span>
                      <span className="text-emerald-300 font-bold">{formatIDR(releaseSummary.net)}</span>
                    </div>
                    <div className="flex justify-between pl-5 text-slate-300">
                      <span>[Kredit] {releaseRevenueAcc} - {getAccountName(releaseRevenueAcc)}</span>
                      <span>{formatIDR(releaseSummary.net)}</span>
                    </div>
                  </div>
                )}

                {releaseRecordHppAuto && releaseSummary.hpp > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-800">
                    <div className="text-[10px] text-slate-400">
                      {releaseRecordFeeSeparately && releaseSummary.fee > 0 ? '3.' : '2.'} Jurnal Beban Pokok Penjualan (HPP) & Persediaan:
                    </div>
                    <div className="flex justify-between">
                      <span>[Debit] {releaseHppDebitAcc} - {getAccountName(releaseHppDebitAcc)}</span>
                      <span className="text-amber-300 font-bold">{formatIDR(releaseSummary.hpp)}</span>
                    </div>
                    <div className="flex justify-between pl-5 text-slate-300">
                      <span>[Kredit] {releaseHppCreditAcc} - {getAccountName(releaseHppCreditAcc)}</span>
                      <span>{formatIDR(releaseSummary.hpp)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 flex justify-between text-xs font-sans font-bold text-amber-300">
                  <span>Saldo Bersih Bertambah di [{releaseTargetAcc}] {getAccountName(releaseTargetAcc)}:</span>
                  <span className="font-mono">+{formatIDR(releaseSummary.net)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRelease}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Cair & Catat ke Jurnal Umum</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: REVERT TO PENDING CONFIRMATION ================= */}
      {revertTarget && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Kembalikan Status ke Pending?</h3>
              <button
                type="button"
                onClick={() => setRevertTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-800">
                  Pesanan <span className="font-mono text-[#580001]">{revertTarget.invoiceNum}</span>
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Mengembalikan pesanan ini ke status <strong>Pending (Belum Cair)</strong> akan otomatis menarik kembali / menghapus entri transaksi terkait dari <strong>Pencatatan Transaksi Keuangan</strong> dan <strong>Jurnal Umum</strong> agar tidak terjadi pencatatan ganda.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevertTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRevertSaleToPending(revertTarget.id);
                    setRevertTarget(null);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Ya, Kembalikan ke Pending
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: DELETE CONFIRMATION ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Hapus Data Penjualan</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-bold text-slate-800">
                  Hapus Pesanan <span className="font-mono text-rose-600">{deleteTarget.invoiceNum}</span>?
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pesanan {deleteTarget.productName} ({formatIDR(deleteTarget.netPayout)}) akan dihapus dari daftar penjualan.
                </p>
              </div>

              {deleteTarget.status === 'settled' && deleteTarget.linkedTransactionIds && deleteTarget.linkedTransactionIds.length > 0 && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteRemoveLinkedTx}
                    onChange={(e) => setDeleteRemoveLinkedTx(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600"
                  />
                  <div>
                    <span className="font-bold text-rose-950 block">
                      Hapus juga transaksi terkait di Pencatatan Transaksi & Jurnal Umum
                    </span>
                    <span className="text-[10px] text-rose-800">
                      Menjaga saldo Kas/Bank dan Jurnal Umum tetap akurat.
                    </span>
                  </div>
                </label>
              )}

              <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSale(deleteTarget.id, deleteRemoveLinkedTx);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Ya, Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
