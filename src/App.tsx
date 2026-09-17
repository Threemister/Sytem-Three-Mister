/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Account, Transaction, FinanceNotification, SavedCalculation, FinancialSummaryData } from './types';
import { defaultAccounts, defaultTransactions } from './defaultData';
import { initAuth, googleSignIn, logout, getAccessToken, clearExpiredToken } from './firebase';
import { 
  createNewSpreadsheet,
  ensureSheetsExist, 
  pushAccountsToSheets, 
  pullAccountsFromSheets, 
  pushTransactionsToSheets, 
  pullTransactionsFromSheets,
  pushHPPToSheets,
  pullHPPFromSheets,
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

type Screen = 'dashboard' | 'akun' | 'transaksi' | 'jurnal' | 'neraca-saldo' | 'laporan' | 'hpp';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Core Financial State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);
  const [isPullConfirmOpen, setIsPullConfirmOpen] = useState(false);

  // Initial Load from localStorage or defaults
  useEffect(() => {
    // 1. Load Accounts
    const savedAccounts = localStorage.getItem('finance_accounts');
    let hasMigrated = false;
    if (savedAccounts) {
      try {
        const parsed = JSON.parse(savedAccounts);
        const hasOldAccounts = parsed.some((acc: any) => acc.code === '1-1000' || acc.code === '1-1100');
        if (hasOldAccounts) {
          setAccounts(defaultAccounts);
          localStorage.setItem('finance_accounts', JSON.stringify(defaultAccounts));
          hasMigrated = true;
        } else {
          setAccounts(parsed);
        }
      } catch {
        setAccounts(defaultAccounts);
      }
    } else {
      setAccounts(defaultAccounts);
    }

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
  const computeFinancialSummary = (accList: Account[], txList: Transaction[]): FinancialSummaryData => {
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
      lastUpdated
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
      console.error('Error parsing HPP from localStorage:', e);
    }
    return [];
  };

  // ================= REAL-TIME DEBOUNCED AUTO-SYNC TO GOOGLE SHEETS =================
  const autoSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSync = (updatedAccs?: Account[], updatedTxs?: Transaction[]) => {
    if (!oauthToken || !spreadsheetId) return;

    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }

    autoSyncTimeoutRef.current = setTimeout(async () => {
      const accsToSync = updatedAccs || accounts;
      const txsToSync = updatedTxs || transactions;
      const hppToSync = getLocalHPP();
      const summary = computeFinancialSummary(accsToSync, txsToSync);

      try {
        setIsSyncing(true);
        await pushAllDataToSheets(spreadsheetId, {
          accounts: accsToSync,
          transactions: txsToSync,
          hppCalcs: hppToSync,
          summary
        }, oauthToken);
        setSyncError(null);
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

  // Listen to HPP updates across the app
  useEffect(() => {
    const handleHPPUpdate = () => {
      triggerAutoSync();
    };
    window.addEventListener('hpp_updated', handleHPPUpdate);
    return () => window.removeEventListener('hpp_updated', handleHPPUpdate);
  }, [oauthToken, spreadsheetId, accounts, transactions]);

  // ================= FINANCIAL STATE MUTATORS (LOCAL) =================
  const handleAddAccount = (newAcc: Account) => {
    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem('finance_accounts', JSON.stringify(updated));
    addNotification('Akun Ditambahkan', `Akun baru [${newAcc.code}] "${newAcc.name}" telah terdaftar ke sistem.`, 'info');
    triggerAutoSync(updated, transactions);
  };

  const handleEditAccount = (updatedAcc: Account) => {
    const updated = accounts.map(a => a.code === updatedAcc.code ? updatedAcc : a);
    setAccounts(updated);
    localStorage.setItem('finance_accounts', JSON.stringify(updated));
    addNotification('Akun Diupdate', `Informasi akun [${updatedAcc.code}] "${updatedAcc.name}" berhasil diubah.`, 'info');
    triggerAutoSync(updated, transactions);
  };

  const handleDeleteAccount = (code: string) => {
    const accToDelete = accounts.find(a => a.code === code);
    const updated = accounts.filter(a => a.code !== code);
    setAccounts(updated);
    localStorage.setItem('finance_accounts', JSON.stringify(updated));
    if (accToDelete) {
      addNotification('Akun Dihapus', `Akun [${code}] "${accToDelete.name}" telah dihapus secara permanen.`, 'warning');
    }
    triggerAutoSync(updated, transactions);
  };

  const handleAddTransaction = (newTx: Transaction | Transaction[]) => {
    const txList = Array.isArray(newTx) ? newTx : [newTx];
    setTransactions(prev => {
      const updated = [...txList, ...prev];
      localStorage.setItem('finance_transactions', JSON.stringify(updated));
      checkFinancialTriggers(updated, accounts);
      triggerAutoSync(accounts, updated);
      return updated;
    });
  };

  const handleEditTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updated);
    localStorage.setItem('finance_transactions', JSON.stringify(updated));
    addNotification('Transaksi Diubah', `Transaksi No Ref ${updatedTx.refNum} berhasil direvisi di dashboard admin.`, 'info');
    checkFinancialTriggers(updated, accounts);
    triggerAutoSync(accounts, updated);
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
    triggerAutoSync(accounts, updated);
  };

  const handleResetToDefaults = () => {
    setAccounts(defaultAccounts);
    setTransactions(defaultTransactions);
    localStorage.setItem('finance_accounts', JSON.stringify(defaultAccounts));
    localStorage.setItem('finance_transactions', JSON.stringify(defaultTransactions));
    addNotification(
      'Sistem Di-reset',
      'Daftar akun dan transaksi contoh telah di-reset ke data bawaan baru.',
      'success'
    );
    triggerAutoSync(defaultAccounts, defaultTransactions);
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
    setSpreadsheetId(id);
    localStorage.setItem('finance_spreadsheet_id', id);
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
    setPopupBlocked(false);
    setUnauthorizedDomain(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setOauthToken(res.accessToken);
        try {
          localStorage.removeItem('threemister_is_demo_mode');
        } catch {
          // Ignore storage errors
        }
        addNotification(
          'Google Sheets Terhubung',
          `Sesi berhasil diotorisasi dengan aman untuk ${res.user.email}. Google Sheets API siap dijalankan.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Sign in catch in App.tsx:', err);
      const isBlocked = 
        err?.code === 'auth/popup-blocked' || 
        err?.message?.includes('popup-blocked') ||
        err?.message?.includes('Pop-up');
      
      const isUnauthorized = 
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('auth/unauthorized-domain');

      if (isUnauthorized) {
        const detectedDomain = err?.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
        setUnauthorizedDomain(detectedDomain || 'domain ini');
        setPopupBlocked(false);
        setSyncError(`Domain "${detectedDomain}" belum diizinkan di Firebase Console (auth/unauthorized-domain).`);
        addNotification(
          'Domain Belum Diizinkan',
          `Domain ${detectedDomain} belum terdaftar di Authorized Domains Firebase Authentication. Tambahkan domain ini di Firebase Console atau gunakan Mode Demo.`,
          'warning'
        );
      } else if (isBlocked) {
        setPopupBlocked(true);
        setUnauthorizedDomain(null);
        setSyncError('Pop-up otorisasi diblokir oleh browser di dalam lingkungan pratinjau (iframe).');
      } else {
        setUnauthorizedDomain(null);
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
      } catch {
        // Ignore storage errors
      }
      setUser(null);
      setOauthToken(null);
      setPopupBlocked(false);
      setSyncError(null);
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
    if (!oauthToken) {
      setSyncError('Silakan otorisasi akun Google Anda terlebih dahulu.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const { spreadsheetId: newId } = await createNewSpreadsheet(
        'THREE MISTER - Pembukuan & Akuntansi',
        oauthToken
      );
      setSpreadsheetId(newId);
      localStorage.setItem('finance_spreadsheet_id', newId);

      const hppCalcs = getLocalHPP();
      const summary = computeFinancialSummary(accounts, transactions);
      await pushAllDataToSheets(newId, {
        accounts,
        transactions,
        hppCalcs,
        summary,
      }, oauthToken);

      addNotification(
        'Google Sheet Berhasil Dibuat!',
        'Spreadsheet baru dibuat di Google Drive Anda dengan 4 sheet (AKUN, TRANSAKSI, HPP_PRODUK, RINGKASAN_KEUANGAN) dan data langsung terisi.',
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken(null);
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan klik tombol "Hubungkan Ulang Google" untuk memperbarui izin.');
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
    if (!oauthToken) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await ensureSheetsExist(spreadsheetId, oauthToken);
      const hppCalcs = getLocalHPP();
      const summary = computeFinancialSummary(accounts, transactions);
      await pushAllDataToSheets(spreadsheetId, {
        accounts,
        transactions,
        hppCalcs,
        summary,
      }, oauthToken);

      addNotification(
        'Inisialisasi & Sinkronisasi Sukses',
        'Lembar kerja (AKUN, TRANSAKSI, HPP_PRODUK, RINGKASAN_KEUANGAN) telah dipastikan lengkap dan data sinkron.',
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken(null);
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan login ulang dengan akun Google Anda.');
        addNotification('Sesi Google Kedaluwarsa', 'Token Google telah kedaluwarsa. Silakan hubungkan ulang akun Google.', 'warning');
      } else {
        setSyncError(`Inisialisasi lembar kerja gagal: ${err.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToSheets = async () => {
    if (!oauthToken) {
      setSyncError('Silakan otorisasi akun Google Anda terlebih dahulu.');
      return;
    }
    if (!spreadsheetId) {
      setSyncError('ID Spreadsheet belum diatur. Klik "Buat Sheet Otomatis" atau masukkan ID Spreadsheet.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const hppCalcs = getLocalHPP();
      const summary = computeFinancialSummary(accounts, transactions);
      await pushAllDataToSheets(spreadsheetId, {
        accounts,
        transactions,
        hppCalcs,
        summary,
      }, oauthToken);

      addNotification(
        'Data Tersimpan ke Sheets',
        `Berhasil menyimpan ${accounts.length} Akun, ${transactions.length} Transaksi, ${hppCalcs.length} HPP Produk, dan Ringkasan Keuangan ke Google Sheets.`,
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken(null);
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan login ulang dengan akun Google Anda.');
        addNotification('Sesi Google Kedaluwarsa', 'Token Google telah habis masa berlakunya. Silakan hubungkan ulang akun Google.', 'warning');
      } else {
        setSyncError(`Gagal menyimpan data ke Google Sheets: ${err.message}`);
        addNotification('Gagal Simpan Data', err.message, 'danger');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSheets = async (bypassConfirm = false) => {
    if (!oauthToken) {
      setSyncError('Silakan otorisasi akun Google terlebih dahulu.');
      return;
    }
    if (!spreadsheetId) {
      setSyncError('ID Spreadsheet belum diatur.');
      return;
    }
    
    if (!bypassConfirm) {
      setIsPullConfirmOpen(true);
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const pulledAccounts = await pullAccountsFromSheets(spreadsheetId, oauthToken);
      const pulledTransactions = await pullTransactionsFromSheets(spreadsheetId, oauthToken);
      const pulledHPP = await pullHPPFromSheets(spreadsheetId, oauthToken);

      if (pulledAccounts.length === 0 && pulledTransactions.length === 0 && pulledHPP.length === 0) {
        throw new Error('Spreadsheet kosong atau lembar kerja belum memiliki baris data.');
      }

      if (pulledAccounts.length > 0) {
        setAccounts(pulledAccounts);
        localStorage.setItem('finance_accounts', JSON.stringify(pulledAccounts));
      }
      if (pulledTransactions.length > 0) {
        setTransactions(pulledTransactions);
        localStorage.setItem('finance_transactions', JSON.stringify(pulledTransactions));
      }
      if (pulledHPP.length > 0) {
        localStorage.setItem('threemister_hpp_calcs', JSON.stringify(pulledHPP));
        window.dispatchEvent(new CustomEvent('hpp_updated'));
      }

      addNotification(
        'Unduh Data Berhasil',
        `Berhasil mengunduh data awan: ${pulledAccounts.length} Akun, ${pulledTransactions.length} Transaksi, dan ${pulledHPP.length} HPP Produk telah dimuat.`,
        'success'
      );
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
        clearExpiredToken();
        setOauthToken(null);
        setSyncError('Sesi Google Sheets telah kedaluwarsa (401). Silakan login ulang dengan akun Google Anda.');
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

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center text-slate-800">
        <div className="space-y-5 max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative mx-auto w-14 h-14 bg-[#580001] rounded-2xl flex items-center justify-center shadow-md">
            <span className="text-white font-black text-xl tracking-tighter">3M</span>
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
              <div className="mx-auto w-14 h-14 bg-[#580001] rounded-2xl flex items-center justify-center shadow-lg border border-[#580001]/20">
                <span className="text-white font-black text-xl tracking-tighter">3M</span>
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl font-black tracking-wider text-[#580001] uppercase">
                  THREE MISTER
                </h1>
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
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

            {/* Helper link for iframe users */}
            <div className="pt-1 text-center">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-[#580001] font-medium transition"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka di Tab Baru ↗ untuk Akses Bebas Frame</span>
              </a>
            </div>
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
            className="w-10 h-10 bg-[#580001] rounded-xl flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm hover:bg-[#730002] transition cursor-pointer"
            title="THREE MISTER - Kembali ke Dashboard"
            aria-label="Dashboard THREE MISTER"
          >
            3M
          </button>
          
          <div className="w-8 h-px bg-slate-200/80" />

          {/* Icon-Only Navigation Buttons */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2" aria-label="Menu Navigasi Samping">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'akun', label: 'Daftar Akun (COA)', icon: FileBox },
              { id: 'transaksi', label: 'Pencatatan Transaksi', icon: ReceiptText },
              { id: 'jurnal', label: 'Jurnal Umum', icon: BookOpen },
              { id: 'neraca-saldo', label: 'Neraca Saldo', icon: Scale },
              { id: 'laporan', label: 'Laporan Keuangan', icon: FileSpreadsheet },
              { id: 'hpp', label: 'Kalkulator HPP', icon: Calculator },
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
            <div className="bg-[#580001] p-2 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm tracking-tighter">3M</span>
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
              <div className="w-9 h-9 bg-[#580001] rounded-xl flex items-center justify-center shadow-xs text-white font-black text-base tracking-tighter">
                3M
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
              { id: 'transaksi', label: 'Pencatatan Transaksi', icon: ReceiptText },
              { id: 'jurnal', label: 'Jurnal Umum', icon: BookOpen },
              { id: 'neraca-saldo', label: 'Neraca Saldo', icon: Scale },
              { id: 'laporan', label: 'Laporan Keuangan', icon: FileSpreadsheet },
              { id: 'hpp', label: 'Kalkulator HPP', icon: Calculator },
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
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
              onPushToSheets={handlePushToSheets}
              onPullFromSheets={handlePullFromSheets}
              onInitializeSheets={handleInitializeSheets}
              onCreateNewSheet={handleCreateNewSheet}
              onDeleteTransaction={handleDeleteTransaction}
              onNavigateToTransactions={() => setCurrentScreen('transaksi')}
              onNavigateToScreen={(screen) => setCurrentScreen(screen as Screen)}
            />
          )}

          {currentScreen === 'akun' && (
            <COAManager
              accounts={accounts}
              transactions={transactions}
              onAddAccount={handleAddAccount}
              onEditAccount={handleEditAccount}
              onDeleteAccount={handleDeleteAccount}
              onResetToDefaults={handleResetToDefaults}
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
            />
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
