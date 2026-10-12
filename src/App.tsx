/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Account, Transaction, FinanceNotification, SavedCalculation, FinancialSummaryData, SaleOrder, InventoryItem, MarketplacePricingHistory } from './types';
import { defaultAccounts, defaultTransactions, defaultSales, defaultInventory } from './defaultData';
import { initAuth, googleSignIn, logout, getAccessToken, clearExpiredToken, saveManualCloudToken } from './firebase';
import { 
  createNewSpreadsheet,
  ensureSheetsExist, 
  pushAccountsToSheets, 
  pullAccountsFromSheets, 
  pushTransactionsToSheets, 
  pullTransactionsFromSheets,
  pushHPPToSheets,
  pullHPPFromSheets,
  pullInventoryFromSheets,
  pullSalesFromSheets,
  pullMarketplaceHistoryFromSheets,
  pushSummaryToSheets,
  pushAllDataToSheets
} from './sheets';

import Clock from './components/Clock';
import COAManager from './components/COAManager';
import TransactionManager from './components/TransactionManager';
import JournalViewer from './components/JournalViewer';
import TrialBalanceViewer from './components/TrialBalanceViewer';
import Reports from './components/Reports';
import AdminDashboard from './components/AdminDashboard';
import HPPCalculator from './components/HPPCalculator';
import MarketplaceCalculator from './components/MarketplaceCalculator';
import SalesManager from './components/SalesManager';
import InventoryManager from './components/InventoryManager';
import StockSkuManager from './components/StockSkuManager';

import { 
  LayoutDashboard, 
  ReceiptText, 
  FileBox, 
  BookOpen, 
  Scale, 
  FileSpreadsheet, 
  Bell, 
  CheckCircle, 
  CloudLightning,
  Sparkles,
  Menu,
  X,
  LogIn,
  Lock,
  Calculator,
  Store,
  ShoppingBag,
  Package,
  Tag,
  Search,
  Building,
  LogOut,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Globe,
  Copy,
  Check
} from 'lucide-react';

type Screen = 'dashboard' | 'akun' | 'stock' | 'inventory' | 'penjualan' | 'transaksi' | 'jurnal' | 'neraca-saldo' | 'laporan' | 'hpp' | 'marketplace';

export const LOGO_URL = 'https://dffpatvdcpujtntwuyly.supabase.co/storage/v1/object/public/Sytem%20Three%20Mister/Submark%20Secondary%20Logo%203mr%20(White%20Background).png';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Core Financial State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [notifications, setNotifications] = useState<FinanceNotification[]>([]);
  
  // Notification popover state (only visible when user clicks the notification bell)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when user clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  // Spreadsheet ID: defaults to the user's sheet ID
  const [spreadsheetId, setSpreadsheetId] = useState('18FdoruMjdK1zqHv8o4ua5698Mw_q53G7q9ZnIjb-mX0');

  // Google OAuth & Firebase States
  const [user, setUser] = useState<any>(null);
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);
  const [isPullConfirmOpen, setIsPullConfirmOpen] = useState(false);

  // Initial Load from localStorage or defaults
  useEffect(() => {
    // 1. Load Accounts & Inventory
    const savedInventory = localStorage.getItem('finance_inventory');
    let loadedInventory: InventoryItem[] = defaultInventory;
    if (savedInventory) {
      try {
        const parsedInv = JSON.parse(savedInventory);
        if (Array.isArray(parsedInv) && parsedInv.length > 0) {
          loadedInventory = parsedInv;
        }
      } catch {
        loadedInventory = defaultInventory;
      }
    }
    setInventory(loadedInventory);

    const savedAccounts = localStorage.getItem('finance_accounts');
    let hasMigrated = false;
    let baseAccounts: Account[] = defaultAccounts;
    if (savedAccounts) {
      try {
        const parsed = JSON.parse(savedAccounts);
        const hasOldAccounts = parsed.some((acc: any) => acc.code === '1-1000' || acc.code === '1-1100');
        if (hasOldAccounts) {
          baseAccounts = defaultAccounts;
          hasMigrated = true;
        } else {
          baseAccounts = parsed;
        }
      } catch {
        baseAccounts = defaultAccounts;
      }
    }
    const syncedAccounts = syncInventoryToAccounts(baseAccounts, loadedInventory);
    setAccounts(syncedAccounts);
    localStorage.setItem('finance_accounts', JSON.stringify(syncedAccounts));

    // 2. Load Transactions
    const savedTransactions = localStorage.getItem('finance_transactions');
    if (savedTransactions) {
      try {
        const parsedTxs = JSON.parse(savedTransactions);
        const hasOldTxs = parsedTxs.some((tx: any) => tx.debitAccount === '1-1000' || tx.creditAccount === '4-1000');
        if (hasMigrated || hasOldTxs) {
          setTransactions(defaultTransactions);
          localStorage.setItem('finance_transactions', JSON.stringify(defaultTransactions));
        } else {
          setTransactions(parsedTxs);
        }
      } catch {
        setTransactions(defaultTransactions);
      }
    } else {
      setTransactions(defaultTransactions);
    }

    // 2b. Load Sales Orders (Pending & Settled)
    const savedSales = localStorage.getItem('finance_sales');
    if (savedSales) {
      try {
        const parsedSales = JSON.parse(savedSales);
        if (Array.isArray(parsedSales)) {
          setSales(parsedSales);
        } else {
          setSales(defaultSales);
        }
      } catch {
        setSales(defaultSales);
      }
    } else {
      setSales(defaultSales);
    }

    // 3. Load Notifications
    const savedNotis = localStorage.getItem('finance_notifications');
    if (savedNotis) {
      try {
        const parsed = JSON.parse(savedNotis);
        if (Array.isArray(parsed)) {
          const uniqueNotis = parsed.filter((noti: any, idx: number, self: any[]) => 
            self.findIndex((n: any) => n.id === noti.id) === idx
          );
          setNotifications(uniqueNotis);
        } else {
          setNotifications(getInitialNotifications());
        }
      } catch {
        setNotifications(getInitialNotifications());
      }
    } else {
      setNotifications(getInitialNotifications());
    }

    // 4. Load Spreadsheet ID
    const savedSheetId = localStorage.getItem('finance_spreadsheet_id');
    if (savedSheetId) {
      setSpreadsheetId(savedSheetId);
    }

    // Check if user was previously in offline demo mode
    const isDemo = localStorage.getItem('threemister_is_demo_mode') === 'true';
    if (isDemo) {
      const guestUser = {
        email: 'admin@threemister.com',
        displayName: 'THREE MISTER Admin',
        uid: 'threemister-offline-admin',
      };
      setUser(guestUser);
      setOauthToken('offline-demo-token');
      setIsAuthChecking(false);
    }

    // 5. Initialize Firebase Auth
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setOauthToken(token);
        setPopupBlocked(false);
        setSyncError(null);
        setIsAuthChecking(false);
      },
      () => {
        if (!isDemo) {
          setUser(null);
          setOauthToken(null);
        }
        setIsAuthChecking(false);
      }
    );

    // 6. Cross-tab storage listener for auth token
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'threemister_oauth_token') {
        if (event.newValue) {
          setOauthToken(event.newValue);
          setPopupBlocked(false);
          setSyncError(null);
        } else {
          setOauthToken(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // 7. Handle Google OAuth token expiration
    const handleAuthExpired = () => {
      clearExpiredToken();
      setOauthToken(null);
      setSyncError('Sesi login Google telah kedaluwarsa (401). Silakan hubungkan ulang akun Google Anda.');
      addNotification(
        'Sesi Google Kedaluwarsa',
        'Token otorisasi Google Sheets telah habis. Silakan klik Login Ulang dengan Google pada menu Dashboard / Pengaturan.',
        'warning'
      );
    };
    window.addEventListener('google_auth_expired', handleAuthExpired);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('google_auth_expired', handleAuthExpired);
    };
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('finance_accounts', JSON.stringify(accounts));
    }
  }, [accounts]);

  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('finance_transactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (sales.length > 0) {
      localStorage.setItem('finance_sales', JSON.stringify(sales));
    }
  }, [sales]);

  useEffect(() => {
    if (inventory.length > 0) {
      localStorage.setItem('finance_inventory', JSON.stringify(inventory));
    }
  }, [inventory]);

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('finance_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Helper to generate initial setup notifications
  const getInitialNotifications = (): FinanceNotification[] => {
    return [
      {
        id: 'noti-init-1',
        timestamp: new Date().toISOString(),
        title: 'Sistem Akuntansi Aktif',
        message: 'Aplikasi pembukuan THREE MISTER Management System berhasil diaktifkan. Semua data saat ini disimpan secara offline di browser Anda.',
        type: 'info',
        isRead: false
      },
      {
        id: 'noti-init-2',
        timestamp: new Date().toISOString(),
        title: 'Integrasi Google Sheets Siap',
        message: 'Hubungkan akun Google Anda di menu Dashboard untuk mengaktifkan sinkronisasi otomatis awan.',
        type: 'success',
        isRead: false
      }
    ];
  };

  // Helper to format currency
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // ================= NOTIFICATION ENGINE / TRIGGER CHECKS =================
  const addNotification = (title: string, message: string, type: 'info' | 'warning' | 'success' | 'danger') => {
    const newNoti: FinanceNotification = {
      id: `noti-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toISOString(),
      title,
      message,
      type,
      isRead: false
    };
    setNotifications(prev => [newNoti, ...prev]);
  };

  // Checks for significant financial changes
  const checkFinancialTriggers = (updatedTxs: Transaction[], updatedAccounts: Account[]) => {
    // 1. Check for newly added high-value transactions
    const newestTx = updatedTxs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (newestTx) {
      const alreadyNotified = notifications.some(n => n.message.includes(newestTx.refNum));
      if (!alreadyNotified) {
        if (newestTx.amount >= 10000000) {
          addNotification(
            '⚠️ Transaksi Signifikan Terdeteksi',
            `Transaksi No Ref ${newestTx.refNum} bernilai besar (${formatIDR(newestTx.amount)}) telah dibukukan: "${newestTx.description}".`,
            'warning'
          );
        } else if (newestTx.debitAccount.startsWith('4-') || newestTx.creditAccount.startsWith('4-')) {
          addNotification(
            '🛍️ Omset Baru Berhasil Masuk',
            `Penerimaan penjualan baru senilai ${formatIDR(newestTx.amount)} dibukukan pada referensi ${newestTx.refNum}.`,
            'success'
          );
        }
      }
    }

    // 2. Check general cash balance warnings
    const cashCodes = ['1-1000', '1-1100'];
    const totalCash = updatedAccounts
      .filter(a => cashCodes.includes(a.code))
      .reduce((sum, acc) => {
        let debits = 0;
        let credits = 0;
        updatedTxs.forEach(t => {
          if (t.debitAccount === acc.code) debits += t.amount;
          if (t.creditAccount === acc.code) credits += t.amount;
        });
        return sum + (acc.initialBalance + debits - credits);
      }, 0);

    const cashWarnNotified = notifications.some(n => n.title === '🚨 Peringatan Likuiditas Kas');
    if (totalCash < 10000000 && !cashWarnNotified && totalCash > 0) {
      addNotification(
        '🚨 Peringatan Likuiditas Kas',
        `Saldo kas cair clothing brand Anda menyusut hingga ${formatIDR(totalCash)}. Batasi pengeluaran non-prioritas demi kelancaran produksi kain.`,
        'danger'
      );
    }

    // 3. Check profit margins warnings
    const totalRev = updatedAccounts
      .filter(a => a.type === 'Pendapatan')
      .reduce((sum, acc) => {
        let debits = 0;
        let credits = 0;
        updatedTxs.forEach(t => {
          if (t.debitAccount === acc.code) debits += t.amount;
          if (t.creditAccount === acc.code) credits += t.amount;
        });
        return sum + (acc.initialBalance + credits - debits);
      }, 0);

    const totalExp = updatedAccounts
      .filter(a => a.type === 'Beban')
      .reduce((sum, acc) => {
        let debits = 0;
        let credits = 0;
        updatedTxs.forEach(t => {
          if (t.debitAccount === acc.code) debits += t.amount;
          if (t.creditAccount === acc.code) credits += t.amount;
        });
        return sum + (acc.initialBalance + debits - credits);
      }, 0);

    const netProfit = totalRev - totalExp;
    const lossWarnNotified = notifications.some(n => n.title === '📉 Operasional Mengalami Kerugian');
    if (netProfit < 0 && totalRev > 0 && !lossWarnNotified) {
      addNotification(
        '📉 Operasional Mengalami Kerugian',
        `Evaluasi Keuangan: Laba rugi bersih mencatatkan defisit minus ${formatIDR(Math.abs(netProfit))}. Analisis kembali HPP produk kaos dan pengeluaran pemasaran.`,
        'danger'
      );
    }
  };

  // ================= FINANCIAL SUMMARY & HPP STORAGE HELPERS =================
  const computeFinancialSummary = (
    accList: Account[],
    txList: Transaction[],
    invList: InventoryItem[] = inventory,
    salesList: SaleOrder[] = sales
  ): FinancialSummaryData => {
    const balances: { [code: string]: number } = {};
    accList.forEach(acc => {
      let debits = 0;
      let credits = 0;
      txList.forEach(t => {
        if (t.debitAccount === acc.code) debits += t.amount;
        if (t.creditAccount === acc.code) credits += t.amount;
      });
      if (acc.normalBalance === 'Debit') {
        balances[acc.code] = acc.initialBalance + debits - credits;
      } else {
        balances[acc.code] = acc.initialBalance + credits - debits;
      }
    });

    const totalCash = accList
      .filter(a => a.type === 'Aktiva' && (a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank')))
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const totalReceivables = accList
      .filter(a => a.type === 'Aktiva' && a.name.toLowerCase().includes('piutang'))
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const totalInventory = accList
      .filter(a => a.type === 'Aktiva' && (a.name.toLowerCase().includes('persediaan') || a.code === '1-1005'))
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const totalAssets = accList
      .filter(a => a.type === 'Aktiva')
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const totalLiabilities = accList
      .filter(a => a.type === 'Kewajiban')
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const totalEquity = accList
      .filter(a => a.type === 'Modal')
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const totalRevenue = accList
      .filter(a => a.type === 'Pendapatan')
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const totalHPP = accList
      .filter(a => a.code.startsWith('5-') || a.name.toLowerCase().includes('pokok penjualan'))
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const grossProfit = totalRevenue - totalHPP;

    const totalExpenses = accList
      .filter(a => a.type === 'Beban' && !(a.code.startsWith('5-') || a.name.toLowerCase().includes('pokok penjualan')))
      .reduce((sum, a) => sum + (balances[a.code] || 0), 0);

    const netProfit = grossProfit - totalExpenses;

    let totalTrialDebit = 0;
    let totalTrialCredit = 0;
    accList.forEach(acc => {
      let debits = 0;
      let credits = 0;
      txList.forEach(t => {
        if (t.debitAccount === acc.code) debits += t.amount;
        if (t.creditAccount === acc.code) credits += t.amount;
      });
      const net = acc.initialBalance + (acc.normalBalance === 'Debit' ? debits - credits : credits - debits);
      if (acc.normalBalance === 'Debit') {
        if (net >= 0) totalTrialDebit += net;
        else totalTrialCredit += Math.abs(net);
      } else {
        if (net >= 0) totalTrialCredit += net;
        else totalTrialDebit += Math.abs(net);
      }
    });

    const trialBalanceDiff = Math.abs(totalTrialDebit - totalTrialCredit);
    const isTrialBalanced = trialBalanceDiff < 1;

    // Additional feature metrics (Stock & SKU, Inventory, Penjualan)
    let totalInventoryForSaleValue = 0;
    let totalInventoryInternalValue = 0;
    let totalStockAvailableProducts = 0;
    let totalStockUnavailableProducts = 0;
    let totalStockNotForSaleProducts = 0;
    let totalStockCountedPcs = 0;
    let totalStockUncountedPcs = 0;

    invList.forEach(item => {
      const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
      const val = rem * (item.unitCost || 0);
      if (item.category === 'for_sale') {
        totalInventoryForSaleValue += val;
      } else {
        totalInventoryInternalValue += val;
      }

      const status = item.availabilityStatus
        ? item.availabilityStatus
        : item.category === 'internal_use'
        ? 'not_for_sale'
        : (item.isAvailable !== undefined ? item.isAvailable && rem > 0 : rem > 0)
        ? 'available'
        : 'unavailable';

      if (status === 'not_for_sale') {
        totalStockNotForSaleProducts += 1;
        totalStockUncountedPcs += rem;
      } else if (status === 'available' && rem > 0) {
        totalStockAvailableProducts += 1;
        totalStockCountedPcs += rem;
      } else {
        totalStockUnavailableProducts += 1;
        totalStockCountedPcs += rem;
      }
    });

    const pendingSales = salesList.filter(s => s.status === 'pending');
    const settledSales = salesList.filter(s => s.status === 'settled');
    const totalPendingSalesCount = pendingSales.length;
    const totalPendingSalesNet = pendingSales.reduce((s, o) => s + o.netPayout, 0);
    const totalSettledSalesCount = settledSales.length;
    const totalSettledSalesNet = settledSales.reduce((s, o) => s + o.netPayout, 0);

    const now = new Date();
    const lastUpdated = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';

    return {
      totalRevenue,
      totalHPP,
      grossProfit,
      totalExpenses,
      netProfit,
      totalCash,
      totalReceivables,
      totalInventory,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isTrialBalanced,
      trialBalanceDiff,
      lastUpdated,
      totalInventoryForSaleValue,
      totalInventoryInternalValue,
      totalStockAvailableProducts,
      totalStockUnavailableProducts,
      totalStockNotForSaleProducts,
      totalStockCountedPcs,
      totalStockUncountedPcs,
      totalPendingSalesCount,
      totalPendingSalesNet,
      totalSettledSalesCount,
      totalSettledSalesNet
    };
  };

  const getLocalHPP = (): SavedCalculation[] => {
    try {
      const saved = localStorage.getItem('threemister_hpp_calcs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Notice parsing HPP from localStorage:', e);
    }
    return [];
  };

  const getLocalMarketplaceHistory = (): MarketplacePricingHistory[] => {
    try {
      const saved = localStorage.getItem('threemister_marketplace_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Notice parsing Marketplace History from localStorage:', e);
    }
    return [];
  };

  // ================= REAL-TIME DEBOUNCED AUTO-SYNC TO GOOGLE SHEETS =================
  const autoSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialSheetSyncRef = useRef<string | null>(null);

  const markLocalEdits = () => {
    try {
      localStorage.setItem('finance_has_local_edits', 'true');
    } catch {}
  };

  const triggerAutoSync = (
    updatedAccs?: Account[],
    updatedTxs?: Transaction[],
    updatedSales?: SaleOrder[],
    updatedInv?: InventoryItem[]
  ) => {
    markLocalEdits();
    if (!oauthToken || oauthToken === 'offline-demo-token' || !spreadsheetId) return;

    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }

    autoSyncTimeoutRef.current = setTimeout(async () => {
      const accsToSync = updatedAccs || accounts;
      const txsToSync = updatedTxs || transactions;
      const salesToSync = updatedSales || sales;
      const invToSync = updatedInv || inventory;
      const hppToSync = getLocalHPP();
      const mpHistoryToSync = getLocalMarketplaceHistory();
      const summary = computeFinancialSummary(accsToSync, txsToSync, invToSync, salesToSync);

      try {
        setIsSyncing(true);
        const { addedSheets } = await pushAllDataToSheets(
          spreadsheetId,
          {
            accounts: accsToSync,
            transactions: txsToSync,
            sales: salesToSync,
            inventory: invToSync,
            hppCalcs: hppToSync,
            marketplaceHistory: mpHistoryToSync,
            summary
          },
          oauthToken
        );
        setSyncError(null);
        setSyncSuccess(`Auto-sync berhasil disimpan ke Google Sheets (${summary.lastUpdated}).`);
        if (addedSheets && addedSheets.length > 0) {
          addNotification(
            '✨ Sheet Fitur Baru Otomatis Ditambahkan',
            `Lembar kerja baru (${addedSheets.join(', ')}) telah otomatis dibuat dan disinkronkan ke Google Spreadsheet Anda.`,
            'success'
          );
        }
      } catch (err: any) {
        console.warn('Auto-sync to sheets note:', err.message);
        if (err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('Izin Google Sheets')) {
          clearExpiredToken();
          setOauthToken(null);
          setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan hubungkan ulang akun Google Anda.');
        }
      } finally {
        setIsSyncing(false);
      }
    }, 1200);
  };

  // Safe Initial Cloud Sync on startup / login:
  // - Never blindly overwrites Google Sheets with defaultData when opening the GitHub Pages website!
  // - If this browser has no local edits yet (e.g. newly opened GitHub website), automatically pulls from Google Sheets.
  // - If connected with OAuth token, ensures all 8 feature sheets exist first.
  useEffect(() => {
    if (!spreadsheetId || !user || !oauthToken) return;
    const syncKey = `${spreadsheetId}-${oauthToken}`;
    if (hasInitialSheetSyncRef.current === syncKey) return;
    hasInitialSheetSyncRef.current = syncKey;

    const performInitialSmartSync = async () => {
      const hasLocalEdits = localStorage.getItem('finance_has_local_edits') === 'true';
      const isRealToken = oauthToken !== 'offline-demo-token';

      try {
        if (isRealToken) {
          await ensureSheetsExist(spreadsheetId, oauthToken).catch(() => []);
        }

        // If this browser/website (e.g. GitHub Pages) hasn't been edited locally yet, pull latest data from Google Sheets
        if (!hasLocalEdits) {
          const [
            pulledAccounts,
            pulledTransactions,
            pulledHPP,
            pulledInventory,
            pulledSales,
            pulledMarketplace
          ] = await Promise.all([
            pullAccountsFromSheets(spreadsheetId, oauthToken).catch(() => []),
            pullTransactionsFromSheets(spreadsheetId, oauthToken).catch(() => []),
            pullHPPFromSheets(spreadsheetId, oauthToken).catch(() => []),
            pullInventoryFromSheets(spreadsheetId, oauthToken).catch(() => []),
            pullSalesFromSheets(spreadsheetId, oauthToken).catch(() => []),
            pullMarketplaceHistoryFromSheets(spreadsheetId, oauthToken).catch(() => [])
          ]);

          const hasCloudData =
            pulledAccounts.length > 0 ||
            pulledInventory.length > 0 ||
            pulledSales.length > 0 ||
            pulledTransactions.length > 0;

          if (hasCloudData) {
            const finalInventory = pulledInventory.length > 0 ? pulledInventory : inventory;
            if (pulledInventory.length > 0) {
              setInventory(pulledInventory);
              localStorage.setItem('finance_inventory', JSON.stringify(pulledInventory));
            }
            if (pulledAccounts.length > 0) {
              const syncedPulledAccounts = syncInventoryToAccounts(pulledAccounts, finalInventory);
              setAccounts(syncedPulledAccounts);
              localStorage.setItem('finance_accounts', JSON.stringify(syncedPulledAccounts));
            }
            if (pulledSales.length > 0) {
              setSales(pulledSales);
              localStorage.setItem('finance_sales', JSON.stringify(pulledSales));
            }
            if (pulledTransactions.length > 0) {
              setTransactions(pulledTransactions);
              localStorage.setItem('finance_transactions', JSON.stringify(pulledTransactions));
            }
            if (pulledHPP.length > 0) {
              localStorage.setItem('threemister_hpp_calcs', JSON.stringify(pulledHPP));
              window.dispatchEvent(new CustomEvent('hpp_updated'));
            }
            if (pulledMarketplace.length > 0) {
              localStorage.setItem('threemister_marketplace_history', JSON.stringify(pulledMarketplace));
              window.dispatchEvent(new CustomEvent('marketplace_updated'));
            }
            setSyncSuccess('Data terbaru dari Google Spreadsheet berhasil dimuat otomatis.');
            return;
          }
        }

        // Only push if we have a real OAuth token and either local edits exist or the sheet was empty
        if (isRealToken && accounts.length > 0) {
          const hppToSync = getLocalHPP();
          const mpHistoryToSync = getLocalMarketplaceHistory();
          const summary = computeFinancialSummary(accounts, transactions, inventory, sales);
          await pushAllDataToSheets(
            spreadsheetId,
            {
              accounts,
              transactions,
              sales,
              inventory,
              hppCalcs: hppToSync,
              marketplaceHistory: mpHistoryToSync,
              summary
            },
            oauthToken
          );
        }
      } catch (err) {
        console.warn('Initial smart sync note:', err);
      }
    };

    performInitialSmartSync();
  }, [oauthToken, spreadsheetId, user]);

  // Listen to HPP & Marketplace Pricing updates across the app
  useEffect(() => {
    const handleFeatureStorageUpdate = () => {
      triggerAutoSync();
    };
    window.addEventListener('hpp_updated', handleFeatureStorageUpdate);
    window.addEventListener('marketplace_updated', handleFeatureStorageUpdate);
    return () => {
      window.removeEventListener('hpp_updated', handleFeatureStorageUpdate);
      window.removeEventListener('marketplace_updated', handleFeatureStorageUpdate);
    };
  }, [oauthToken, spreadsheetId, accounts, transactions, sales, inventory]);

  // Helper to compare account codes naturally (e.g. 1-1001 < 1-1002 < 2-1001)
  const compareAccountCodes = (codeA: string, codeB: string) => {
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  };

  // ================= FINANCIAL STATE MUTATORS (LOCAL) =================
  const handleAddAccount = (newAcc: Account, autoSortByCode = true) => {
    let updated = [...accounts, newAcc];
    if (autoSortByCode) {
      updated = [...updated].sort((a, b) => compareAccountCodes(a.code, b.code));
    }
    setAccounts(updated);
    localStorage.setItem('finance_accounts', JSON.stringify(updated));
    addNotification(
      'Akun Ditambahkan',
      `Akun baru [${newAcc.code}] "${newAcc.name}" telah terdaftar${autoSortByCode ? ' dan diurutkan otomatis sesuai kode akun' : ''}.`,
      'info'
    );
    triggerAutoSync(updated, transactions, sales, inventory);
  };

  const handleEditAccount = (updatedAcc: Account, originalCode?: string, autoSortByCode = false) => {
    const targetCode = originalCode || updatedAcc.code;
    let updated = accounts.map(a => a.code === targetCode ? updatedAcc : a);
    if (autoSortByCode) {
      updated = [...updated].sort((a, b) => compareAccountCodes(a.code, b.code));
    }
    setAccounts(updated);
    localStorage.setItem('finance_accounts', JSON.stringify(updated));
    addNotification('Akun Diupdate', `Informasi akun [${updatedAcc.code}] "${updatedAcc.name}" berhasil diubah.`, 'info');
    triggerAutoSync(updated, transactions, sales, inventory);
  };

  const handleReorderAccounts = (reordered: Account[], customNotice?: string) => {
    setAccounts(reordered);
    localStorage.setItem('finance_accounts', JSON.stringify(reordered));
    if (customNotice) {
      addNotification('Urutan Akun Diperbarui', customNotice, 'info');
    }
    triggerAutoSync(reordered, transactions, sales, inventory);
  };

  const handleDeleteAccount = (code: string) => {
    const accToDelete = accounts.find(a => a.code === code);
    const updated = accounts.filter(a => a.code !== code);
    setAccounts(updated);
    localStorage.setItem('finance_accounts', JSON.stringify(updated));
    if (accToDelete) {
      addNotification('Akun Dihapus', `Akun [${code}] "${accToDelete.name}" telah dihapus secara permanen.`, 'warning');
    }
    triggerAutoSync(updated, transactions, sales, inventory);
  };

  const handleAddTransaction = (newTx: Transaction | Transaction[]) => {
    const txList = Array.isArray(newTx) ? newTx : [newTx];
    setTransactions(prev => {
      const updated = [...txList, ...prev];
      localStorage.setItem('finance_transactions', JSON.stringify(updated));
      checkFinancialTriggers(updated, accounts);
      triggerAutoSync(accounts, updated, sales, inventory);
      return updated;
    });
  };

  const handleEditTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updated);
    localStorage.setItem('finance_transactions', JSON.stringify(updated));
    addNotification('Transaksi Diubah', `Transaksi No Ref ${updatedTx.refNum} berhasil direvisi di dashboard admin.`, 'info');
    checkFinancialTriggers(updated, accounts);
    triggerAutoSync(accounts, updated, sales, inventory);
  };

  const handleDeleteTransaction = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('finance_transactions', JSON.stringify(updated));
    if (txToDelete) {
      addNotification(
        'Transaksi Dihapus', 
        `Pencatatan keuangan No Ref ${txToDelete.refNum} senilai ${formatIDR(txToDelete.amount)} telah dihapus secara permanen dari sistem.`, 
        'warning'
      );
    }
    checkFinancialTriggers(updated, accounts);
    triggerAutoSync(accounts, updated, sales, inventory);
  };

  // ================= SALES & PENDING ESCROW MUTATORS =================
  const handleAddSale = (newSale: SaleOrder, autoTransactions?: Transaction[]) => {
    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    localStorage.setItem('finance_sales', JSON.stringify(updatedSales));

    if (autoTransactions && autoTransactions.length > 0) {
      const updatedTxs = [...autoTransactions, ...transactions];
      setTransactions(updatedTxs);
      localStorage.setItem('finance_transactions', JSON.stringify(updatedTxs));
      checkFinancialTriggers(updatedTxs, accounts);
      triggerAutoSync(accounts, updatedTxs, updatedSales, inventory);
      addNotification(
        '✅ Penjualan Langsung Cair & Dijurnal',
        `Penjualan ${newSale.invoiceNum} (${newSale.channel}) senilai bersih ${formatIDR(newSale.netPayout)} otomatis tercatat ke Transaksi Keuangan & Jurnal Umum.`,
        'success'
      );
    } else {
      triggerAutoSync(accounts, transactions, updatedSales, inventory);
      addNotification(
        '⏳ Penjualan Pending Disimpan',
        `Pesanan ${newSale.invoiceNum} (${newSale.channel}) senilai bersih ${formatIDR(newSale.netPayout)} disimpan di daftar Pending. Lepas pending saat dana cair untuk otomatis masuk ke Jurnal Umum.`,
        'info'
      );
    }
  };

  const handleEditSale = (updatedSale: SaleOrder) => {
    const updatedSales = sales.map(s => s.id === updatedSale.id ? updatedSale : s);
    setSales(updatedSales);
    localStorage.setItem('finance_sales', JSON.stringify(updatedSales));
    triggerAutoSync(accounts, transactions, updatedSales, inventory);
    addNotification(
      'Penjualan Diperbarui',
      `Data pesanan penjualan ${updatedSale.invoiceNum} berhasil diperbarui.`,
      'info'
    );
  };

  const handleDeleteSale = (saleId: string, removeLinkedTransactions = true) => {
    const targetSale = sales.find(s => s.id === saleId);
    const updatedSales = sales.filter(s => s.id !== saleId);
    setSales(updatedSales);
    localStorage.setItem('finance_sales', JSON.stringify(updatedSales));

    let updatedTxs = transactions;
    if (removeLinkedTransactions && targetSale?.linkedTransactionIds && targetSale.linkedTransactionIds.length > 0) {
      const linkedSet = new Set(targetSale.linkedTransactionIds);
      updatedTxs = transactions.filter(t => !linkedSet.has(t.id) && t.refNum !== targetSale.invoiceNum && t.refNum !== `FEE-${targetSale.invoiceNum}` && t.refNum !== `HPP-${targetSale.invoiceNum}`);
      setTransactions(updatedTxs);
      localStorage.setItem('finance_transactions', JSON.stringify(updatedTxs));
    }

    triggerAutoSync(accounts, updatedTxs, updatedSales, inventory);

    if (targetSale) {
      addNotification(
        'Penjualan Dihapus',
        `Pesanan penjualan ${targetSale.invoiceNum} telah dihapus dari sistem.`,
        'warning'
      );
    }
  };

  const handleReleasePendingSales = (
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
  ) => {
    const idSet = new Set(saleIds);
    const salesToRelease = sales.filter(s => idSet.has(s.id) && s.status === 'pending');
    if (salesToRelease.length === 0) return;

    const newTransactions: Transaction[] = [];
    const linkedMap: Record<string, string[]> = {};
    const nowIso = new Date().toISOString();

    salesToRelease.forEach((sale, idx) => {
      const txIdsForThisSale: string[] = [];
      const baseTime = Date.now() + idx * 10;

      if (releaseConfig.recordFeeSeparately && sale.marketplaceFee > 0) {
        const revTxId = `TX-SLS-${baseTime}-${Math.floor(Math.random() * 100000)}`;
        txIdsForThisSale.push(revTxId);
        newTransactions.push({
          id: revTxId,
          date: releaseConfig.settledDate,
          refNum: sale.invoiceNum,
          description: `Pencairan Penjualan ${sale.channel} (${sale.productName} x${sale.qty} pcs) - ${sale.customerName}`,
          debitAccount: releaseConfig.targetAccountCode,
          creditAccount: releaseConfig.revenueAccountCode,
          amount: sale.grossTransacted,
          createdAt: nowIso
        });

        const feeTxId = `TX-FEE-${baseTime + 1}-${Math.floor(Math.random() * 100000)}`;
        txIdsForThisSale.push(feeTxId);
        newTransactions.push({
          id: feeTxId,
          date: releaseConfig.settledDate,
          refNum: `FEE-${sale.invoiceNum}`,
          description: `Potongan Admin & Komisi ${sale.channel} atas Pesanan ${sale.invoiceNum}`,
          debitAccount: releaseConfig.feeAccountCode,
          creditAccount: releaseConfig.targetAccountCode,
          amount: sale.marketplaceFee,
          createdAt: nowIso
        });
      } else {
        const netTxId = `TX-SLS-${baseTime}-${Math.floor(Math.random() * 100000)}`;
        txIdsForThisSale.push(netTxId);
        newTransactions.push({
          id: netTxId,
          date: releaseConfig.settledDate,
          refNum: sale.invoiceNum,
          description: `Pencairan Penjualan Bersih ${sale.channel} (${sale.productName} x${sale.qty} pcs) - ${sale.customerName}`,
          debitAccount: releaseConfig.targetAccountCode,
          creditAccount: releaseConfig.revenueAccountCode,
          amount: sale.netPayout,
          createdAt: nowIso
        });
      }

      if (releaseConfig.recordHppAuto && sale.totalHpp > 0) {
        const hppTxId = `TX-HPP-${baseTime + 2}-${Math.floor(Math.random() * 100000)}`;
        txIdsForThisSale.push(hppTxId);
        newTransactions.push({
          id: hppTxId,
          date: releaseConfig.settledDate,
          refNum: `HPP-${sale.invoiceNum}`,
          description: `HPP Penjualan ${sale.productName} (${sale.qty} pcs) Ref ${sale.invoiceNum}`,
          debitAccount: releaseConfig.hppDebitAccountCode,
          creditAccount: releaseConfig.hppCreditAccountCode,
          amount: sale.totalHpp,
          createdAt: nowIso
        });
      }

      linkedMap[sale.id] = txIdsForThisSale;
    });

    const updatedSales = sales.map(s => {
      if (idSet.has(s.id) && s.status === 'pending') {
        return {
          ...s,
          status: 'settled' as const,
          settledDate: releaseConfig.settledDate,
          targetAccountCode: releaseConfig.targetAccountCode,
          revenueAccountCode: releaseConfig.revenueAccountCode,
          feeAccountCode: releaseConfig.feeAccountCode,
          recordFeeSeparately: releaseConfig.recordFeeSeparately,
          recordHppAuto: releaseConfig.recordHppAuto,
          hppDebitAccountCode: releaseConfig.hppDebitAccountCode,
          hppCreditAccountCode: releaseConfig.hppCreditAccountCode,
          linkedTransactionIds: linkedMap[s.id] || []
        };
      }
      return s;
    });
    setSales(updatedSales);
    localStorage.setItem('finance_sales', JSON.stringify(updatedSales));

    const updatedTxs = [...newTransactions, ...transactions];
    setTransactions(updatedTxs);
    localStorage.setItem('finance_transactions', JSON.stringify(updatedTxs));
    checkFinancialTriggers(updatedTxs, accounts);
    triggerAutoSync(accounts, updatedTxs, updatedSales, inventory);

    const totalNetReleased = salesToRelease.reduce((sum, s) => sum + s.netPayout, 0);
    addNotification(
      '💸 Dana Pending Cair & Masuk Jurnal Umum',
      `${salesToRelease.length} pesanan penjualan senilai bersih ${formatIDR(totalNetReleased)} telah dilepas dari Pending dan otomatis dicatat ke Pencatatan Transaksi Keuangan & Jurnal Umum.`,
      'success'
    );
  };

  const handleRevertSaleToPending = (saleId: string) => {
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;

    const linkedSet = new Set(targetSale.linkedTransactionIds || []);
    const updatedTxs = transactions.filter(
      t =>
        !linkedSet.has(t.id) &&
        t.refNum !== targetSale.invoiceNum &&
        t.refNum !== `FEE-${targetSale.invoiceNum}` &&
        t.refNum !== `HPP-${targetSale.invoiceNum}`
    );
    setTransactions(updatedTxs);
    localStorage.setItem('finance_transactions', JSON.stringify(updatedTxs));

    const updatedSales = sales.map(s =>
      s.id === saleId
        ? { ...s, status: 'pending' as const, settledDate: undefined, linkedTransactionIds: [] }
        : s
    );
    setSales(updatedSales);
    localStorage.setItem('finance_sales', JSON.stringify(updatedSales));

    triggerAutoSync(accounts, updatedTxs, updatedSales, inventory);

    addNotification(
      '↩️ Penjualan Dikembalikan ke Pending',
      `Pesanan ${targetSale.invoiceNum} dikembalikan ke status Pending dan jurnal terkait telah ditarik kembali.`,
      'warning'
    );
  };

  // Helper to sync Inventory remaining values directly into COA Accounts (initialBalance)
  // WITHOUT adding anything to Pencatatan Transaksi Keuangan or Jurnal Umum
  const syncInventoryToAccounts = (accList: Account[], invList: InventoryItem[]): Account[] => {
    const invAccountCodes = new Set(['1-1005', '1-1006', '1-2001']);
    invList.forEach(item => {
      if (item.accountCode) invAccountCodes.add(item.accountCode);
    });

    const totalsByAcc: Record<string, number> = {};
    invAccountCodes.forEach(code => {
      totalsByAcc[code] = 0;
    });

    invList.forEach(item => {
      const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
      const val = rem * item.unitCost;
      const code = item.accountCode || (item.category === 'for_sale' ? '1-1005' : '1-1006');
      totalsByAcc[code] = (totalsByAcc[code] || 0) + val;
    });

    const updated = accList.map(acc => {
      if (invAccountCodes.has(acc.code)) {
        return {
          ...acc,
          initialBalance: totalsByAcc[acc.code] || 0
        };
      }
      return acc;
    });

    // Balance initialBalance in 3-1001 Modal Pemilik so Neraca Saldo remains balanced
    let otherDebitInit = 0;
    let otherCreditInit = 0;
    updated.forEach(acc => {
      if (acc.code === '3-1001') return;
      if (acc.normalBalance === 'Debit') otherDebitInit += acc.initialBalance;
      else otherCreditInit += acc.initialBalance;
    });
    const modalBalanceNeeded = Math.max(0, otherDebitInit - otherCreditInit);

    return updated.map(acc =>
      acc.code === '3-1001' ? { ...acc, initialBalance: modalBalanceNeeded } : acc
    );
  };

  // ================= INVENTORY STATE MUTATORS (SYNC TO COA, NO JOURNAL/TX) =================
  const handleAddInventory = (newItem: InventoryItem) => {
    const updatedInv = [newItem, ...inventory];
    setInventory(updatedInv);
    localStorage.setItem('finance_inventory', JSON.stringify(updatedInv));

    const updatedAccs = syncInventoryToAccounts(accounts, updatedInv);
    setAccounts(updatedAccs);
    localStorage.setItem('finance_accounts', JSON.stringify(updatedAccs));
    triggerAutoSync(updatedAccs, transactions, sales, updatedInv);

    addNotification(
      '📦 Barang Inventory Ditambahkan',
      `"${newItem.name}" (${newItem.remainingQty} ${newItem.unit}) senilai ${formatIDR(newItem.totalRemainingValue)} masuk ke Akun [${newItem.accountCode}] tanpa masuk ke Jurnal Umum.`,
      'info'
    );
  };

  const handleEditInventory = (updatedItem: InventoryItem) => {
    const updatedInv = inventory.map(i => (i.id === updatedItem.id ? updatedItem : i));
    setInventory(updatedInv);
    localStorage.setItem('finance_inventory', JSON.stringify(updatedInv));

    const updatedAccs = syncInventoryToAccounts(accounts, updatedInv);
    setAccounts(updatedAccs);
    localStorage.setItem('finance_accounts', JSON.stringify(updatedAccs));
    triggerAutoSync(updatedAccs, transactions, sales, updatedInv);
  };

  const handleDeleteInventory = (id: string) => {
    const target = inventory.find(i => i.id === id);
    const updatedInv = inventory.filter(i => i.id !== id);
    setInventory(updatedInv);
    localStorage.setItem('finance_inventory', JSON.stringify(updatedInv));

    const updatedAccs = syncInventoryToAccounts(accounts, updatedInv);
    setAccounts(updatedAccs);
    localStorage.setItem('finance_accounts', JSON.stringify(updatedAccs));
    triggerAutoSync(updatedAccs, transactions, sales, updatedInv);

    if (target) {
      addNotification(
        'Barang Inventory Dihapus',
        `"${target.name}" telah dihapus dan saldo Akun [${target.accountCode}] telah disesuaikan.`,
        'warning'
      );
    }
  };

  const handleResetToDefaults = () => {
    const syncedDefaultAccounts = syncInventoryToAccounts(defaultAccounts, defaultInventory);
    setAccounts(syncedDefaultAccounts);
    setTransactions(defaultTransactions);
    setSales(defaultSales);
    setInventory(defaultInventory);
    localStorage.setItem('finance_accounts', JSON.stringify(syncedDefaultAccounts));
    localStorage.setItem('finance_transactions', JSON.stringify(defaultTransactions));
    localStorage.setItem('finance_sales', JSON.stringify(defaultSales));
    localStorage.setItem('finance_inventory', JSON.stringify(defaultInventory));
    addNotification(
      'Sistem Di-reset',
      'Daftar akun, inventory, penjualan, dan transaksi contoh telah di-reset ke data bawaan baru.',
      'success'
    );
    triggerAutoSync(syncedDefaultAccounts, defaultTransactions, defaultSales, defaultInventory);
  };

  // Mark all notifications as read
  const handleMarkNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Toggle single notification read/unread state
  const handleToggleNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
  };

  // Delete single notification
  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  // Change Spreadsheet ID
  const handleSpreadsheetIdChange = (id: string) => {
    // Extract ID automatically if user pasted a full Google Sheets URL
    let cleanId = id.trim();
    const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }
    setSpreadsheetId(cleanId);
    localStorage.setItem('finance_spreadsheet_id', cleanId);
    setSyncSuccess(`ID Spreadsheet diperbarui ke: ${cleanId}`);
  };

  // ================= CROSS-DOMAIN CLOUD SYNC KEY & FILE BACKUP (GITHUB PAGES SUPPORT) =================
  const handleGenerateCloudSyncKey = (): string => {
    const payload = {
      v: 1,
      s: spreadsheetId,
      t: oauthToken && oauthToken !== 'offline-demo-token' ? oauthToken : '',
      e: user?.email || 'ersgroup2002@gmail.com'
    };
    return 'TM-SYNC:' + btoa(encodeURIComponent(JSON.stringify(payload)));
  };

  const handleApplyCloudSyncKey = async (rawInput: string): Promise<boolean> => {
    const trimmed = (rawInput || '').trim();
    if (!trimmed) {
      setSyncError('Masukkan Kunci Sinkronisasi Cloud atau Token Akses Google terlebih dahulu.');
      return false;
    }

    let extractedToken = '';
    let extractedSheetId = spreadsheetId;
    let extractedEmail = 'ersgroup2002@gmail.com';

    try {
      if (trimmed.startsWith('TM-SYNC:')) {
        const base64Part = trimmed.slice('TM-SYNC:'.length).trim();
        const decoded = JSON.parse(decodeURIComponent(atob(base64Part)));
        if (decoded.s) extractedSheetId = decoded.s;
        if (decoded.t) extractedToken = decoded.t;
        if (decoded.e) extractedEmail = decoded.e;
      } else if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.spreadsheetId || parsed.s) extractedSheetId = parsed.spreadsheetId || parsed.s;
        if (parsed.token || parsed.t || parsed.oauthToken) extractedToken = parsed.token || parsed.t || parsed.oauthToken;
        if (parsed.email || parsed.e) extractedEmail = parsed.email || parsed.e;
      } else {
        // Assume direct Google OAuth2 access token (e.g. ya29....)
        extractedToken = trimmed;
      }
    } catch {
      setSyncError('Format Kunci Sinkronisasi Cloud tidak valid. Pastikan Anda menyalin seluruh kunci dengan benar.');
      return false;
    }

    if (extractedSheetId) {
      setSpreadsheetId(extractedSheetId);
      localStorage.setItem('finance_spreadsheet_id', extractedSheetId);
    }

    if (extractedToken && extractedToken !== 'offline-demo-token') {
      saveManualCloudToken(extractedToken, extractedEmail);
      setUser({
        email: extractedEmail,
        displayName: 'THREE MISTER Cloud Sync',
        uid: 'threemister-cloud-sync'
      });
      setOauthToken(extractedToken);
      setUnauthorizedDomain(null);
      setPopupBlocked(false);
      setSyncError(null);
      setSyncSuccess(`Kunci Cloud berhasil diaktifkan untuk ${extractedEmail}! Menyinkronkan data dari Google Sheets...`);
      addNotification(
        '🔑 Kunci Sinkronisasi Cloud Aktif',
        `Website berhasil terhubung ke Google Sheets (${extractedEmail}). Sekarang Anda dapat Simpan Data & Unduh Data secara langsung.`,
        'success'
      );
      return true;
    } else {
      setSyncError('Kunci yang dimasukkan belum memiliki Token Google aktif. Login Google di AI Studio lalu klik "Salin Kunci Cloud".');
      return false;
    }
  };

  const handleExportBackupData = () => {
    const hppCalcs = getLocalHPP();
    const marketplaceHistory = getLocalMarketplaceHistory();
    const backupPayload = {
      app: 'THREE_MISTER_ACCOUNTING',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      spreadsheetId,
      cloudToken: oauthToken && oauthToken !== 'offline-demo-token' ? oauthToken : undefined,
      cloudEmail: user?.email,
      data: {
        accounts,
        inventory,
        sales,
        transactions,
        hppCalcs,
        marketplaceHistory
      }
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `THREE_MISTER_Data_Sinkronisasi_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSyncError(null);
    setSyncSuccess(
      `File data berhasil diunduh (THREE_MISTER_Data_Sinkronisasi_${dateStr}.json). Muat file ini di website GitHub Anda untuk langsung sinkron 100%!`
    );
    addNotification(
      '💾 File Data Berhasil Diunduh',
      `Seluruh data (${accounts.length} Akun, ${inventory.length} Stock/Inventory, ${sales.length} Penjualan, ${transactions.length} Transaksi, & ${hppCalcs.length} HPP) berhasil disimpan ke file .JSON.`,
      'success'
    );
  };

  const handleImportBackupData = async (input: File | string) => {
    try {
      const jsonContent = typeof input === 'string' ? input : await input.text();
      const parsed = JSON.parse(jsonContent);
      const dataRoot = parsed.data || parsed;

      const impInventory: InventoryItem[] = Array.isArray(dataRoot.inventory) ? dataRoot.inventory : inventory;
      const impAccounts: Account[] = Array.isArray(dataRoot.accounts) ? dataRoot.accounts : accounts;
      const impSales: SaleOrder[] = Array.isArray(dataRoot.sales) ? dataRoot.sales : sales;
      const impTransactions: Transaction[] = Array.isArray(dataRoot.transactions) ? dataRoot.transactions : transactions;
      const impHpp: SavedCalculation[] = Array.isArray(dataRoot.hppCalcs) ? dataRoot.hppCalcs : [];
      const impMp: MarketplacePricingHistory[] = Array.isArray(dataRoot.marketplaceHistory) ? dataRoot.marketplaceHistory : [];

      if (impAccounts.length === 0 && impInventory.length === 0 && impTransactions.length === 0) {
        throw new Error('File JSON tidak berisi data pembukuan THREE MISTER yang valid.');
      }

      markLocalEdits();

      if (impInventory.length > 0) {
        setInventory(impInventory);
        localStorage.setItem('finance_inventory', JSON.stringify(impInventory));
      }

      const syncedImpAccounts = syncInventoryToAccounts(impAccounts, impInventory);
      setAccounts(syncedImpAccounts);
      localStorage.setItem('finance_accounts', JSON.stringify(syncedImpAccounts));

      setSales(impSales);
      localStorage.setItem('finance_sales', JSON.stringify(impSales));

      setTransactions(impTransactions);
      localStorage.setItem('finance_transactions', JSON.stringify(impTransactions));

      if (impHpp.length > 0) {
        localStorage.setItem('threemister_hpp_calcs', JSON.stringify(impHpp));
        window.dispatchEvent(new CustomEvent('hpp_updated'));
      }

      if (impMp.length > 0) {
        localStorage.setItem('threemister_marketplace_history', JSON.stringify(impMp));
        window.dispatchEvent(new CustomEvent('marketplace_updated'));
      }

      if (parsed.spreadsheetId) {
        setSpreadsheetId(parsed.spreadsheetId);
        localStorage.setItem('finance_spreadsheet_id', parsed.spreadsheetId);
      }

      let activeToken = oauthToken;
      if (parsed.cloudToken && parsed.cloudToken !== 'offline-demo-token') {
        const email = parsed.cloudEmail || 'ersgroup2002@gmail.com';
        saveManualCloudToken(parsed.cloudToken, email);
        setUser({
          email,
          displayName: 'THREE MISTER Cloud Sync',
          uid: 'threemister-cloud-sync'
        });
        setOauthToken(parsed.cloudToken);
        activeToken = parsed.cloudToken;
      }

      setSyncError(null);
      setSyncSuccess(
        `Berhasil memuat & menyinkronkan data: ${syncedImpAccounts.length} Akun, ${impInventory.length} Stock SKU & Inventory, ${impSales.length} Penjualan, ${impTransactions.length} Transaksi, dan ${impHpp.length} HPP!`
      );
      addNotification(
        '✅ Data Berhasil Dimuat & Disinkronkan',
        `Seluruh data dari file cadangan (${syncedImpAccounts.length} Akun, ${impInventory.length} Inventory/SKU, ${impSales.length} Penjualan, ${impTransactions.length} Transaksi) berhasil diterapkan ke website ini.`,
        'success'
      );

      // Also push to Google Sheets if a valid token is available
      if (activeToken && activeToken !== 'offline-demo-token' && (parsed.spreadsheetId || spreadsheetId)) {
        const targetSheetId = parsed.spreadsheetId || spreadsheetId;
        const summary = computeFinancialSummary(syncedImpAccounts, impTransactions, impInventory, impSales);
        await pushAllDataToSheets(
          targetSheetId,
          {
            accounts: syncedImpAccounts,
            transactions: impTransactions,
            sales: impSales,
            inventory: impInventory,
            hppCalcs: impHpp.length > 0 ? impHpp : getLocalHPP(),
            marketplaceHistory: impMp.length > 0 ? impMp : getLocalMarketplaceHistory(),
            summary
          },
          activeToken
        ).catch(() => {});
      }
    } catch (err: any) {
      setSyncError(`Gagal memuat file data: ${err.message || 'File tidak valid'}`);
      addNotification('Gagal Muat File Data', err.message || 'File tidak valid', 'danger');
    }
  };

  // ================= GOOGLE SHEETS SYNC CONTROLS =================
  const handleBypassLogin = () => {
    try {
      localStorage.setItem('threemister_is_demo_mode', 'true');
    } catch {
      // Ignore storage errors
    }
    const guestUser = {
      email: 'admin@threemister.com',
      displayName: 'THREE MISTER Admin',
      uid: 'threemister-offline-admin',
    };
    setUser(guestUser);
    setOauthToken('offline-demo-token');
    setPopupBlocked(false);
    setUnauthorizedDomain(null);
    setSyncError(null);
    addNotification(
      'Mode Demo Aktif',
      'Anda masuk menggunakan Akun THREE MISTER (Mode Demo Offline). Semua fitur pencatatan, kalkulator HPP, dan laporan keuangan aktif.',
      'info'
    );
  };

  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    setPopupBlocked(false);
    setUnauthorizedDomain(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setOauthToken(res.accessToken);
        try {
          localStorage.removeItem('threemister_is_demo_mode');
          localStorage.setItem('threemister_cloud_user_email', res.user.email || 'ersgroup2002@gmail.com');
        } catch {
          // Ignore storage errors
        }
        setSyncSuccess(`Terhubung ke Google Sheets sebagai ${res.user.email}.`);
        addNotification(
          'Google Sheets Terhubung',
          `Sesi berhasil diotorisasi dengan aman untuk ${res.user.email}. Google Sheets API siap dijalankan.`,
          'success'
        );
      }
    } catch (err: any) {
      const isBlocked = 
        err?.code === 'auth/popup-blocked' || 
        err?.message?.includes('popup-blocked') ||
        err?.message?.includes('Pop-up');
      const isClosedByUser = 
        err?.code === 'auth/popup-closed-by-user' || 
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user');
      const isUnauthorized = 
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('auth/unauthorized-domain');
      
      if (isClosedByUser) {
        console.info('Sign-in cancelled or popup closed by user.');
      } else if (isUnauthorized) {
        const detectedDomain = err?.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
        setUnauthorizedDomain(detectedDomain || 'domain ini');
        setPopupBlocked(false);
        setSyncError(`Domain "${detectedDomain}" belum terdaftar di Firebase Authorized Domains (auth/unauthorized-domain). Gunakan fitur "Tempel Kunci Cloud" atau tambahkan domain "${detectedDomain}" di Firebase Console.`);
        addNotification(
          'Domain Belum Diizinkan',
          `Domain ${detectedDomain} belum terdaftar di Authorized Domains Firebase. Anda tetap bisa menyinkronkan data dengan "Tempel Kunci Cloud", "Unduh Data dari Sheets", atau "Muat File Data (.JSON)".`,
          'warning'
        );
      } else if (isBlocked) {
        console.warn('Google sign-in popup was blocked:', err);
        setPopupBlocked(true);
        setUnauthorizedDomain(null);
        setSyncError('Pop-up otorisasi diblokir oleh browser di dalam lingkungan pratinjau (iframe).');
      } else {
        setUnauthorizedDomain(null);
        console.warn('Sign in catch in App.tsx:', err?.message || err);
        setSyncError(err.message || 'Gagal login dengan akun Google.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsSyncing(true);
    try {
      await logout();
      try {
        localStorage.removeItem('threemister_is_demo_mode');
        localStorage.removeItem('threemister_cloud_user_email');
      } catch {
        // Ignore storage errors
      }
      setUser(null);
      setOauthToken(null);
      setPopupBlocked(false);
      setSyncError(null);
      setSyncSuccess(null);
      addNotification(
        'Google Sheets Diputuskan',
        'Akun Google dideotorisasi dengan sukses. Data lokal tetap tersimpan utuh.',
        'info'
      );
    } catch (err: any) {
      setSyncError(err.message || 'Gagal logout.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!oauthToken || oauthToken === 'offline-demo-token') {
      setSyncError('Untuk membuat Spreadsheet baru di Google Drive, silakan klik "Otorisasi Akun Google" atau tempel "Kunci Cloud" terlebih dahulu.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const { spreadsheetId: newId } = await createNewSpreadsheet(
        'THREE MISTER - Pembukuan & Akuntansi',
        oauthToken
      );
      setSpreadsheetId(newId);
      localStorage.setItem('finance_spreadsheet_id', newId);

      const hppCalcs = getLocalHPP();
      const marketplaceHistory = getLocalMarketplaceHistory();
      const summary = computeFinancialSummary(accounts, transactions, inventory, sales);
      await pushAllDataToSheets(newId, {
        accounts,
        transactions,
        sales,
        inventory,
        hppCalcs,
        marketplaceHistory,
        summary,
      }, oauthToken);

      setSyncSuccess(`Spreadsheet baru berhasil dibuat (${newId}) dan seluruh 8 sheet fitur telah terisi!`);
      addNotification(
        'Google Sheet Berhasil Dibuat!',
        'Spreadsheet baru dibuat di Google Drive Anda dengan seluruh sheet fitur (AKUN, STOCK_SKU, INVENTORY, PENJUALAN, TRANSAKSI, HPP_PRODUK, HARGA_MARKETPLACE, RINGKASAN_KEUANGAN) dan data langsung terisi.',
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken('offline-demo-token');
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan klik tombol "Otorisasi Akun Google" atau tempel "Kunci Cloud" terbaru.');
        addNotification('Sesi Google Kedaluwarsa', 'Token akses Google Anda telah kedaluwarsa. Silakan login ulang.', 'warning');
      } else {
        setSyncError(`Gagal membuat Google Sheet otomatis: ${err.message}`);
        addNotification('Gagal Buat Sheet', err.message, 'danger');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInitializeSheets = async () => {
    if (!oauthToken || oauthToken === 'offline-demo-token') {
      setSyncError('Silakan klik "Otorisasi Akun Google" atau tempel "Kunci Cloud" terlebih dahulu untuk memperbarui struktur sheet.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const hppCalcs = getLocalHPP();
      const marketplaceHistory = getLocalMarketplaceHistory();
      const summary = computeFinancialSummary(accounts, transactions, inventory, sales);
      const { addedSheets } = await pushAllDataToSheets(spreadsheetId, {
        accounts,
        transactions,
        sales,
        inventory,
        hppCalcs,
        marketplaceHistory,
        summary,
      }, oauthToken);

      setSyncSuccess(
        addedSheets.length > 0
          ? `Sheet fitur baru (${addedSheets.join(', ')}) berhasil dibuat dan seluruh data telah disinkronkan!`
          : 'Seluruh 8 lembar kerja fitur telah lengkap dan tersinkronisasi!'
      );
      addNotification(
        'Inisialisasi & Sinkronisasi Sukses',
        addedSheets.length > 0
          ? `Sheet fitur baru (${addedSheets.join(', ')}) telah otomatis ditambahkan dan seluruh data telah disinkronkan.`
          : 'Seluruh 8 lembar kerja fitur (AKUN, STOCK_SKU, INVENTORY, PENJUALAN, TRANSAKSI, HPP_PRODUK, HARGA_MARKETPLACE, RINGKASAN_KEUANGAN) telah lengkap dan data sinkron.',
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken('offline-demo-token');
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan hubungkan ulang akun Google Anda atau tempel Kunci Cloud.');
        addNotification('Sesi Google Kedaluwarsa', 'Token Google telah kedaluwarsa. Silakan hubungkan ulang akun Google.', 'warning');
      } else {
        setSyncError(`Inisialisasi lembar kerja gagal: ${err.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToSheets = async () => {
    if (!spreadsheetId) {
      setSyncError('ID Spreadsheet belum diatur. Klik "Buat Sheet Otomatis" atau masukkan ID Spreadsheet.');
      return;
    }
    if (!oauthToken || oauthToken === 'offline-demo-token') {
      setSyncError(
        'Mode Offline Aktif: Untuk menyimpan langsung ke Google Sheets dari website ini, klik "Otorisasi Akun Google", tempel "Kunci Sinkronisasi Cloud" dari AI Studio, atau gunakan "Simpan File Data (.JSON)" di bawah.'
      );
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const hppCalcs = getLocalHPP();
      const marketplaceHistory = getLocalMarketplaceHistory();
      const summary = computeFinancialSummary(accounts, transactions, inventory, sales);
      const { addedSheets } = await pushAllDataToSheets(spreadsheetId, {
        accounts,
        transactions,
        sales,
        inventory,
        hppCalcs,
        marketplaceHistory,
        summary,
      }, oauthToken);

      markLocalEdits();
      setSyncSuccess(
        `Berhasil menyimpan seluruh data ke Google Sheets (${accounts.length} Akun, ${inventory.length} Stock SKU & Inventory, ${sales.length} Penjualan, ${transactions.length} Transaksi, & ${hppCalcs.length} HPP)${addedSheets.length > 0 ? ` + Sheet baru: ${addedSheets.join(', ')}` : ''}!`
      );
      addNotification(
        'Data Tersimpan ke Sheets',
        `Berhasil menyimpan ${accounts.length} Akun, ${inventory.length} Stock SKU & Inventory, ${sales.length} Penjualan, ${transactions.length} Transaksi, ${hppCalcs.length} HPP Produk, dan Ringkasan Keuangan ke Google Sheets${addedSheets.length > 0 ? ` (Sheet baru otomatis ditambahkan: ${addedSheets.join(', ')})` : ''}.`,
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken('offline-demo-token');
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan klik "Otorisasi Akun Google" atau tempel "Kunci Cloud" terbaru.');
        addNotification('Sesi Google Kedaluwarsa', 'Token Google telah habis masa berlakunya. Silakan hubungkan ulang akun Google.', 'warning');
      } else {
        setSyncError(`Gagal menyimpan data ke Google Sheets: ${err.message}`);
        addNotification('Gagal Simpan Data', err.message, 'danger');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSheets = async (bypassConfirm?: boolean | any) => {
    if (!spreadsheetId) {
      setSyncError('ID Spreadsheet belum diatur.');
      return;
    }

    const isConfirmed = bypassConfirm === true;
    if (!isConfirmed) {
      setIsPullConfirmOpen(true);
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const hasRealToken = Boolean(oauthToken && oauthToken !== 'offline-demo-token');
      if (hasRealToken && oauthToken) {
        await ensureSheetsExist(spreadsheetId, oauthToken).catch(() => []);
      }

      const [
        pulledAccounts,
        pulledTransactions,
        pulledHPP,
        pulledInventory,
        pulledSales,
        pulledMarketplace
      ] = await Promise.all([
        pullAccountsFromSheets(spreadsheetId, oauthToken),
        pullTransactionsFromSheets(spreadsheetId, oauthToken),
        pullHPPFromSheets(spreadsheetId, oauthToken),
        pullInventoryFromSheets(spreadsheetId, oauthToken),
        pullSalesFromSheets(spreadsheetId, oauthToken),
        pullMarketplaceHistoryFromSheets(spreadsheetId, oauthToken)
      ]);

      if (
        pulledAccounts.length === 0 &&
        pulledTransactions.length === 0 &&
        pulledHPP.length === 0 &&
        pulledInventory.length === 0 &&
        pulledSales.length === 0
      ) {
        throw new Error(
          hasRealToken
            ? 'Spreadsheet kosong atau lembar kerja belum memiliki baris data. Klik "Simpan Data ke Sheets" terlebih dahulu pada website sumber.'
            : 'Tidak dapat membaca data dari Spreadsheet. Pastikan akses berbagi Google Sheet diatur ke "Siapa saja yang memiliki link" (Anyone with the link) atau hubungkan Kunci Cloud / Otorisasi Google.'
        );
      }

      markLocalEdits();

      const finalInventory = pulledInventory.length > 0 ? pulledInventory : inventory;
      if (pulledInventory.length > 0) {
        setInventory(pulledInventory);
        localStorage.setItem('finance_inventory', JSON.stringify(pulledInventory));
      }

      if (pulledAccounts.length > 0) {
        const syncedPulledAccounts = syncInventoryToAccounts(pulledAccounts, finalInventory);
        setAccounts(syncedPulledAccounts);
        localStorage.setItem('finance_accounts', JSON.stringify(syncedPulledAccounts));
      }

      if (pulledSales.length > 0) {
        setSales(pulledSales);
        localStorage.setItem('finance_sales', JSON.stringify(pulledSales));
      }

      if (pulledTransactions.length > 0) {
        setTransactions(pulledTransactions);
        localStorage.setItem('finance_transactions', JSON.stringify(pulledTransactions));
      }

      if (pulledHPP.length > 0) {
        localStorage.setItem('threemister_hpp_calcs', JSON.stringify(pulledHPP));
        window.dispatchEvent(new CustomEvent('hpp_updated'));
      }

      if (pulledMarketplace.length > 0) {
        localStorage.setItem('threemister_marketplace_history', JSON.stringify(pulledMarketplace));
        window.dispatchEvent(new CustomEvent('marketplace_updated'));
      }

      setSyncSuccess(
        `Unduh Data Berhasil! Dimuat: ${pulledAccounts.length} Akun, ${pulledInventory.length} Stock SKU & Inventory, ${pulledSales.length} Penjualan, ${pulledTransactions.length} Transaksi, & ${pulledHPP.length} HPP.`
      );
      addNotification(
        'Unduh Data Berhasil',
        `Berhasil mengunduh data awan: ${pulledAccounts.length} Akun, ${pulledInventory.length} Stock SKU & Inventory, ${pulledSales.length} Penjualan, ${pulledTransactions.length} Transaksi, dan ${pulledHPP.length} HPP Produk telah dimuat.`,
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken('offline-demo-token');
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan klik "Otorisasi Akun Google", tempel "Kunci Cloud", atau pastikan akses Google Sheet diatur ke "Siapa saja yang memiliki link".');
        addNotification('Sesi Google Kedaluwarsa', 'Token akses Google Anda telah kedaluwarsa. Silakan hubungkan ulang akun Google.', 'warning');
      } else {
        setSyncError(`Gagal mengunduh data dari Google Sheets: ${err.message}`);
        addNotification('Gagal Unduh Data', err.message, 'danger');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const unreadNotisCount = notifications.filter(n => !n.isRead).length;
  const pendingSalesCount = sales.filter(s => s.status === 'pending').length;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center text-slate-800">
        <div className="space-y-5 max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-200 p-1.5 overflow-hidden">
            <img
              src={LOGO_URL}
              alt="THREE MISTER Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold tracking-widest text-[#580001] uppercase">THREE MISTER</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">MANAGEMENT SYSTEM</p>
            <p className="text-xs text-slate-400 font-medium pt-1">Memuat sistem keuangan & otorisasi aman...</p>
          </div>
          <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-[#580001] rounded-full w-1/2 animate-[pulse_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !oauthToken) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 text-slate-800 selection:bg-[#580001] selection:text-white relative">
        <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 sm:p-9 space-y-7 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header / Logo */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-200 p-2 overflow-hidden">
                <img
                  src={LOGO_URL}
                  alt="THREE MISTER Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div className="space-y-0.5 text-center flex flex-col items-center justify-center">
                <h1 className="text-xl font-black tracking-wider text-[#580001] uppercase text-center">
                  THREE MISTER
                </h1>
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase text-center w-full block">
                  MANAGEMENT SYSTEM
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-200/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sistem Akuntansi Terintegrasi Google Sheets
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Platform pembukuan double-entry profesional yang otomatis memetakan transaksi ke Jurnal Umum, Neraca Saldo, dan Laporan Keuangan (Laba Rugi & Arus Kas).
              </p>
              
              <ul className="space-y-2 pt-2 border-t border-slate-200">
                <li className="flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="bg-[#580001]/10 text-[#580001] p-0.5 rounded-full mt-0.5 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800">Otomatisasi Cloud:</span> Sinkronisasi satu ketukan dengan Google Sheets.
                  </div>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="bg-[#580001]/10 text-[#580001] p-0.5 rounded-full mt-0.5 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800">Sistem Double-Entry:</span> Jaminan akurasi pembukuan tanpa selisih debit-kredit.
                  </div>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="bg-[#580001]/10 text-[#580001] p-0.5 rounded-full mt-0.5 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800">Dashboard Akurat:</span> Laba Rugi, Posisi Kas, dan Monitoring HPP real-time.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            {/* Solution Boxes: Unauthorized Domain OR Pop-up Blocked OR General Sync Error */}
            {unauthorizedDomain ? (
              <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4.5 space-y-3.5 text-left animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                      auth/unauthorized-domain
                    </div>
                    <h4 className="font-bold text-xs text-amber-950 pt-0.5">
                      Domain Belum Terdaftar di Firebase
                    </h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Firebase Authentication membatasi login Google hanya dari domain yang diizinkan (whitelisted).
                    </p>
                  </div>
                </div>

                {/* Domain Card with Copy Button */}
                <div className="bg-white rounded-xl p-3 border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Domain Saat Ini:</div>
                    <div className="font-mono text-xs font-bold text-slate-900 truncate">
                      {unauthorizedDomain}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(unauthorizedDomain);
                        setDomainCopied(true);
                        setTimeout(() => setDomainCopied(false), 3000);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0"
                  >
                    {domainCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick 3-Step Guide */}
                <div className="space-y-1.5 text-[11px] text-slate-700 bg-white/70 rounded-xl p-3 border border-amber-200/60">
                  <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <span>Langkah Mengaktifkan (1 Menit):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                    <li>
                      Buka{' '}
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0924079852/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#580001] underline hover:text-red-800 inline-flex items-center gap-0.5"
                      >
                        Firebase Console Settings ↗
                      </a>
                    </li>
                    <li>
                      Di bagian <strong>Authorized domains</strong>, klik tombol <strong>Add domain</strong>.
                    </li>
                    <li>
                      Tempel <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono text-amber-900 font-bold">{unauthorizedDomain}</code> (atau <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono text-amber-900 font-bold">github.io</code>), lalu klik <strong>Save</strong>.
                    </li>
                  </ol>
                </div>

                {/* Instant Entry Solution */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleBypassLogin}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#580001] hover:bg-[#730002] active:bg-[#400001] text-white py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Masuk Mode Demo Offline (Tanpa Menunggu)</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-1.5">
                    * Semua fitur jurnal, neraca saldo, HPP, & cetak PDF tetap berfungsi penuh secara lokal.
                  </p>
                </div>
              </div>
            ) : popupBlocked ? (
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4.5 space-y-3.5 text-left animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-amber-900">
                      Pop-up Otorisasi Google Diblokir
                    </h4>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      Lingkungan pratinjau (iframe) membatasi pembukaan jendela pop-up otorisasi otomatis. Pilih salah satu solusi berikut:
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Solution 1: Open in New Tab */}
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#580001] hover:bg-[#730002] active:bg-[#400001] text-white py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide shadow-xs transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka di Tab Baru ↗ (Bebas Blokir)</span>
                  </a>

                  {/* Solution 2: Demo Mode Offline */}
                  <button
                    type="button"
                    onClick={handleBypassLogin}
                    className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-amber-300 py-2.5 px-4 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Gunakan Mode Demo Offline (Langsung Masuk)</span>
                  </button>
                </div>

                <p className="text-[10px] text-amber-700/80 text-center leading-normal">
                  * Seluruh fitur (Jurnal, Neraca Saldo, Laporan Keuangan, & Kalkulator HPP) tetap berjalan penuh dalam mode offline.
                </p>
              </div>
            ) : syncError ? (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-xl text-center leading-relaxed space-y-1">
                <p className="font-semibold">{syncError}</p>
                <button
                  type="button"
                  onClick={handleBypassLogin}
                  className="text-[11px] text-[#580001] font-bold underline underline-offset-2 cursor-pointer inline-block mt-1"
                >
                  Beralih ke Mode Demo Offline →
                </button>
              </div>
            ) : null}

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSyncing}
              className="w-full bg-[#580001] hover:bg-[#730002] active:bg-[#400001] text-white py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2.5 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menghubungkan Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-white" />
                  <span>Masuk Dengan Google & Sinkronisasi</span>
                </>
              )}
            </button>

            {/* Offline / Demo Mode Button */}
            <button
              type="button"
              onClick={handleBypassLogin}
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Masuk Mode Demo Offline (Tanpa Login Google)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased lg:pl-16">
      {/* Pinned Icon-Only Navigation Rail at the Far Left Edge (Desktop) */}
      <aside
        id="desktop-left-navigation-rail"
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 bg-white border-r border-slate-200 z-50 flex-col items-center py-3.5 select-none shadow-xs justify-between"
      >
        {/* Top Section: Monogram Logo & Nav Icons */}
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-xs border border-slate-200 p-1.5 hover:border-[#580001] transition cursor-pointer overflow-hidden group"
            title="THREE MISTER - Kembali ke Dashboard"
            aria-label="Dashboard THREE MISTER"
          >
            <img
              src={LOGO_URL}
              alt="THREE MISTER Logo"
              className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
            />
          </button>
          
          <div className="w-8 h-px bg-slate-200/80" />

          {/* Icon-Only Navigation Buttons */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2" aria-label="Menu Navigasi Samping">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'akun', label: 'Daftar Akun (COA)', icon: FileBox },
              { id: 'stock', label: 'Stock & Kode SKU Otomatis', icon: Tag },
              { id: 'inventory', label: 'Inventory (Nilai Belum Terjual & Dipakai)', icon: Package },
              { id: 'penjualan', label: 'Penjualan & Uang Pending Marketplace', icon: ShoppingBag, badge: pendingSalesCount },
              { id: 'transaksi', label: 'Pencatatan Transaksi Keuangan', icon: ReceiptText },
              { id: 'jurnal', label: 'Jurnal Umum', icon: BookOpen },
              { id: 'neraca-saldo', label: 'Neraca Saldo', icon: Scale },
              { id: 'laporan', label: 'Laporan Keuangan', icon: FileSpreadsheet },
              { id: 'hpp', label: 'Kalkulator HPP', icon: Calculator },
              { id: 'marketplace', label: 'Harga Marketplace (Shopee/TikTok/Lazada)', icon: Store },
            ].map((item) => {
              const isActive = currentScreen === item.id;
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative group w-full flex justify-center">
                  <button
                    onClick={() => setCurrentScreen(item.id as Screen)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer relative ${
                      isActive
                        ? 'bg-[#580001] text-white shadow-sm ring-2 ring-[#580001]/20'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5" />
                    {item.badge ? (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                        {item.badge}
                      </span>
                    ) : null}
                    {isActive && (
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#580001] rounded-r-full" />
                    )}
                  </button>
                  {/* Floating tooltip on hover */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Double Entry Ledger Status Badge */}
        <div className="flex flex-col items-center gap-2 pb-1">
          <div className="relative group flex justify-center">
            <div
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-[#580001] cursor-help transition shadow-2xs"
              title="Double Entry Ledger System"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="absolute left-full bottom-2 ml-3 w-56 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-bold text-[#580001] bg-white px-1.5 py-0.5 rounded text-[10px] uppercase">
                  Double Entry Ledger
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Laba rugi, neraca saldo, & arus kas dihitung otomatis dari transaksi aktif.
              </p>
              <div className="absolute right-full bottom-3.5 border-4 border-transparent border-r-slate-900" />
            </div>
          </div>
        </div>
      </aside>

      {/* Drawer Overlay for Mobile & Tablet */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-[#580001]/50 backdrop-blur-sm z-50 transition-opacity lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer Panel for Mobile & Tablet */}
      <div className={`fixed top-0 bottom-0 left-0 w-80 bg-white border-r border-slate-200 shadow-2xl z-50 flex flex-col p-6 transition-transform duration-300 ease-out lg:hidden ${
        isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-white p-1 rounded-xl flex items-center justify-center shadow-xs border border-slate-200 w-10 h-10 overflow-hidden shrink-0">
              <img
                src={LOGO_URL}
                alt="THREE MISTER Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-wide text-[#580001] uppercase">THREE MISTER</h2>
              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">MANAGEMENT SYSTEM</p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <span className="text-[10px] uppercase font-bold text-slate-400 px-3.5 tracking-wider mb-2">
          Modul Keuangan
        </span>

        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          <button
            onClick={() => {
              setCurrentScreen('dashboard');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'dashboard'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            Dashboard
          </button>

          <button
            onClick={() => {
              setCurrentScreen('akun');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'akun'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <FileBox className="w-4.5 h-4.5" />
            Daftar Akun (COA)
          </button>

          <button
            onClick={() => {
              setCurrentScreen('stock');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'stock'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <Tag className="w-4.5 h-4.5" />
            Stock & Kode SKU
          </button>

          <button
            onClick={() => {
              setCurrentScreen('inventory');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'inventory'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <Package className="w-4.5 h-4.5" />
            Inventory (Nilai Total Harga)
          </button>

          <button
            onClick={() => {
              setCurrentScreen('penjualan');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
              currentScreen === 'penjualan'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <span className="flex items-center gap-3">
              <ShoppingBag className="w-4.5 h-4.5" />
              Penjualan (Pending/Cair)
            </span>
            {pendingSalesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {pendingSalesCount} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setCurrentScreen('transaksi');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'transaksi'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <ReceiptText className="w-4.5 h-4.5" />
            Pencatatan Transaksi
          </button>

          <button
            onClick={() => {
              setCurrentScreen('jurnal');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'jurnal'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            Jurnal Umum
          </button>

          <button
            onClick={() => {
              setCurrentScreen('neraca-saldo');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'neraca-saldo'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <Scale className="w-4.5 h-4.5" />
            Neraca Saldo
          </button>

          <button
            onClick={() => {
              setCurrentScreen('laporan');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'laporan'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            Laporan Keuangan
          </button>

          <button
            onClick={() => {
              setCurrentScreen('hpp');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'hpp'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <Calculator className="w-4.5 h-4.5" />
            Kalkulator HPP
          </button>

          <button
            onClick={() => {
              setCurrentScreen('marketplace');
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition cursor-pointer ${
              currentScreen === 'marketplace'
                ? 'bg-[#580001] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#580001]'
            }`}
          >
            <Store className="w-4.5 h-4.5" />
            Harga Marketplace (Shopee/TikTok/Lazada)
          </button>
        </nav>

        {/* Quick Info inside Drawer */}
        <div className="mt-auto bg-slate-50 text-slate-600 p-4 rounded-xl border border-slate-200 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 bg-[#580001]/10 text-[#580001] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded">
            Double Entry Ledger
          </span>
          <p className="text-[10px] leading-relaxed text-slate-500">
            Sistem otomatis memetakan transaksi ke Jurnal Umum, Neraca Saldo, dan Laporan Keuangan secara real-time.
          </p>
        </div>
      </div>

      {/* Top Banner Navigation (Accurate Online Enterprise Bar) */}
      <header className="bg-white text-slate-800 shadow-xs border-b border-slate-200 shrink-0 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button for Mobile Drawer */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
              title="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Monogram */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xs border border-slate-200 p-1 overflow-hidden shrink-0">
                <img
                  src={LOGO_URL}
                  alt="THREE MISTER Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-[#580001] truncate">
                    THREE MISTER
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Kantor Pusat
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold tracking-widest uppercase truncate">
                  MANAGEMENT SYSTEM
                </p>
              </div>
            </div>
          </div>

          {/* Center Search Input (Accurate Online Quick Search) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi, menu, atau akun COA..."
                aria-label="Cari transaksi, menu, atau akun COA"
                className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#580001] focus:ring-1 focus:ring-[#580001] rounded-lg pl-8.5 pr-14 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none transition"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                Ctrl K
              </span>
            </div>
          </div>

          {/* Right Area: Clock, Notification & User Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Clock Component */}
            <div className="hidden lg:block">
              <Clock />
            </div>

            {/* Notification Dropdown Trigger - Only appears when clicked */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen(prev => !prev)}
                className={`relative p-2 rounded-lg transition cursor-pointer border ${
                  isNotificationOpen
                    ? 'bg-[#580001] text-white border-[#580001] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                }`}
                title={unreadNotisCount > 0 ? `${unreadNotisCount} Notifikasi Belum Dibaca` : 'Pusat Notifikasi'}
                aria-expanded={isNotificationOpen}
                aria-label="Notifikasi Sistem"
              >
                <Bell className={`w-4 h-4 ${isNotificationOpen ? 'text-white' : 'text-slate-600'}`} />
                {unreadNotisCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadNotisCount > 9 ? '9+' : unreadNotisCount}
                  </span>
                )}
              </button>

              {/* FLOATING NOTIFICATION POPOVER - ONLY APPEARS WHEN CLICKED */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-left animate-in fade-in duration-150">
                  <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#580001]/10 rounded-lg text-[#580001]">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">Pusat Notifikasi</h4>
                        <p className="text-[10px] text-slate-400">
                          {unreadNotisCount > 0 ? `${unreadNotisCount} belum dibaca` : 'Semua telah dibaca'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {unreadNotisCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkNotificationsRead}
                          className="text-[11px] text-[#580001] hover:text-[#430001] hover:bg-[#580001]/10 font-semibold px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1"
                          title="Tandai semua telah dibaca"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Baca Semua</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllNotifications}
                          className="text-[11px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition cursor-pointer"
                          title="Hapus semua notifikasi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNotificationOpen(false)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition cursor-pointer ml-1"
                        title="Tutup panel notifikasi"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notification Items List */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 text-xs">
                    {notifications.length > 0 ? (
                      notifications.map((noti) => {
                        const isRead = noti.isRead;
                        return (
                          <div
                            key={noti.id}
                            onClick={() => handleToggleNotificationRead(noti.id)}
                            className={`p-3.5 transition flex items-start gap-3 cursor-pointer group ${
                              isRead ? 'bg-white hover:bg-slate-50/80 text-slate-600' : 'bg-[#580001]/5 hover:bg-[#580001]/10 text-slate-900'
                            }`}
                          >
                            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                              noti.type === 'danger'
                                ? 'bg-rose-100 text-rose-700'
                                : noti.type === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : noti.type === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {noti.type === 'danger' ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : noti.type === 'warning' ? (
                                <AlertCircle className="w-3.5 h-3.5" />
                              ) : noti.type === 'success' ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Info className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs font-bold truncate ${isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                                  {noti.title}
                                </p>
                                {!isRead && (
                                  <span className="w-2 h-2 rounded-full bg-[#580001] shrink-0" title="Belum dibaca" />
                                )}
                              </div>
                              <p className="text-[11px] leading-relaxed text-slate-500 break-words">
                                {noti.message}
                              </p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(noti.timestamp).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotification(noti.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition p-0.5 rounded text-[10px]"
                                  title="Hapus notifikasi ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-10 px-4 text-center">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-2">
                          <Bell className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Tidak ada notifikasi</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Audit keuangan dan catatan sistem akan muncul di sini saat tersedia.
                        </p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Klik baris untuk ubah status baca</span>
                      <button
                        type="button"
                        onClick={() => setIsNotificationOpen(false)}
                        className="font-semibold text-slate-700 hover:text-[#580001] cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-[#580001]/10 border border-[#580001]/20 flex items-center justify-center text-[#580001] font-bold text-xs">
                TM
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">THREE MISTER</p>
                <p className="text-[10px] text-slate-400">Admin Keuangan</p>
              </div>
              {user && (
                <button
                  onClick={handleGoogleSignOut}
                  title="Logout / Keluar"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ACCURATE ONLINE NAVIGATION ICON STRIP (FLUSH LEFT, ICON-ONLY, TIDY DESKTOP LAYOUT) */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 sm:px-6 py-1.5 flex items-center justify-start gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'akun', label: 'Daftar Akun (COA)', icon: FileBox },
              { id: 'stock', label: 'Stock & Kode SKU', icon: Tag },
              { id: 'inventory', label: 'Inventory (Nilai Harga)', icon: Package },
              { id: 'penjualan', label: 'Penjualan (Pending/Cair)', icon: ShoppingBag, badge: pendingSalesCount },
              { id: 'transaksi', label: 'Pencatatan Transaksi', icon: ReceiptText },
              { id: 'jurnal', label: 'Jurnal Umum', icon: BookOpen },
              { id: 'neraca-saldo', label: 'Neraca Saldo', icon: Scale },
              { id: 'laporan', label: 'Laporan Keuangan', icon: FileSpreadsheet },
              { id: 'hpp', label: 'Kalkulator HPP', icon: Calculator },
              { id: 'marketplace', label: 'Harga Marketplace', icon: Store },
            ].map((tab) => {
              const isActive = currentScreen === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`nav-btn-${tab.id}`}
                  onClick={() => setCurrentScreen(tab.id as Screen)}
                  title={tab.label}
                  aria-label={tab.label}
                  className={`relative group w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl transition duration-150 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#580001] text-white shadow-xs ring-1 ring-[#580001]'
                      : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-[#580001] border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  {tab.badge ? (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                      {tab.badge}
                    </span>
                  ) : null}
                  
                  {/* Desktop Hover Tooltip */}
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-medium py-0.5 px-2 rounded-md shadow-md whitespace-nowrap z-50">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Content Section */}
        <main className="w-full min-w-0">
          {currentScreen === 'dashboard' && (
            <AdminDashboard
              accounts={accounts}
              transactions={transactions}
              notifications={notifications}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onToggleNotificationRead={handleToggleNotificationRead}
              spreadsheetId={spreadsheetId}
              onSpreadsheetIdChange={handleSpreadsheetIdChange}
              user={user}
              token={oauthToken}
              isSyncing={isSyncing}
              syncError={syncError}
              syncSuccess={syncSuccess}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
              onPushToSheets={handlePushToSheets}
              onPullFromSheets={() => handlePullFromSheets(false)}
              onInitializeSheets={handleInitializeSheets}
              onCreateNewSheet={handleCreateNewSheet}
              onGenerateCloudSyncKey={handleGenerateCloudSyncKey}
              onApplyCloudSyncKey={handleApplyCloudSyncKey}
              onExportBackupData={handleExportBackupData}
              onImportBackupData={handleImportBackupData}
              onDeleteTransaction={handleDeleteTransaction}
              onNavigateToTransactions={() => setCurrentScreen('transaksi')}
              onNavigateToScreen={(screen) => setCurrentScreen(screen as Screen)}
            />
          )}

          {currentScreen === 'akun' && (
            <COAManager
              accounts={accounts}
              transactions={transactions}
              inventory={inventory}
              onAddAccount={handleAddAccount}
              onEditAccount={handleEditAccount}
              onDeleteAccount={handleDeleteAccount}
              onReorderAccounts={handleReorderAccounts}
              onResetToDefaults={handleResetToDefaults}
              onNavigateToInventory={() => setCurrentScreen('inventory')}
            />
          )}

          {currentScreen === 'stock' && (
            <StockSkuManager
              inventory={inventory}
              onAddInventory={handleAddInventory}
              onEditInventory={handleEditInventory}
              onDeleteInventory={handleDeleteInventory}
              onNavigateToInventory={() => setCurrentScreen('inventory')}
            />
          )}

          {currentScreen === 'inventory' && (
            <InventoryManager
              accounts={accounts}
              inventory={inventory}
              onAddInventory={handleAddInventory}
              onEditInventory={handleEditInventory}
              onDeleteInventory={handleDeleteInventory}
              onNavigateToCOA={() => setCurrentScreen('akun')}
              onNavigateToStockSku={() => setCurrentScreen('stock')}
            />
          )}

          {currentScreen === 'penjualan' && (
            <SalesManager
              accounts={accounts}
              transactions={transactions}
              sales={sales}
              onAddSale={handleAddSale}
              onEditSale={handleEditSale}
              onDeleteSale={handleDeleteSale}
              onReleasePendingSales={handleReleasePendingSales}
              onRevertSaleToPending={handleRevertSaleToPending}
              onNavigateToTransactions={() => setCurrentScreen('transaksi')}
              onNavigateToJournal={() => setCurrentScreen('jurnal')}
            />
          )}

          {currentScreen === 'transaksi' && (
            <TransactionManager
              accounts={accounts}
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {currentScreen === 'jurnal' && (
            <JournalViewer
              accounts={accounts}
              transactions={transactions}
            />
          )}

          {currentScreen === 'neraca-saldo' && (
            <TrialBalanceViewer
              accounts={accounts}
              transactions={transactions}
            />
          )}

          {currentScreen === 'laporan' && (
            <Reports
              accounts={accounts}
              transactions={transactions}
            />
          )}

          {currentScreen === 'hpp' && (
            <HPPCalculator
              accounts={accounts}
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onNavigateToMarketplace={() => setCurrentScreen('marketplace')}
            />
          )}

          {currentScreen === 'marketplace' && (
            <MarketplaceCalculator />
          )}
        </main>

      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 shrink-0 text-center py-4 text-slate-400 text-[11px] tracking-wide font-medium mt-auto">
        &copy; {new Date().getFullYear()} <strong className="text-[#580001]">THREE MISTER</strong> • MANAGEMENT SYSTEM. All Rights Reserved. Double-Entry Accounting Ledger.
      </footer>

      {/* Pull confirmation modal (Iframe safe) */}
      {isPullConfirmOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Tarik Data Google Sheets</h3>
              <button
                onClick={() => setIsPullConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100">
                <CloudLightning className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  Timpa Data Lokal Dengan Data Sheets?
                </p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Apakah Anda yakin ingin menarik data dari Google Sheets? Tindakan ini akan menggantikan seluruh daftar akun dan transaksi lokal Anda saat ini secara permanen.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPullConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    handlePullFromSheets(true);
                    setIsPullConfirmOpen(false);
                  }}
                  className="px-4 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Ya, Sinkronisasi Tarik
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
