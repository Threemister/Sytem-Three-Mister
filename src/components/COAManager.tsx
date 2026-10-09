/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useMemo } from 'react';
import { Account, AccountType, NormalBalance, Transaction, InventoryItem } from '../types';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  FileText,
  Check,
  RotateCcw,
  Sparkles,
  Package,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckCircle2,
  GripVertical
} from 'lucide-react';

interface COAManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  inventory?: InventoryItem[];
  onAddAccount: (account: Account, autoSortByCode?: boolean) => void;
  onEditAccount: (account: Account, originalCode?: string, autoSortByCode?: boolean) => void;
  onDeleteAccount: (code: string) => void;
  onReorderAccounts?: (reordered: Account[], customNotice?: string) => void;
  onResetToDefaults?: () => void;
  onNavigateToInventory?: () => void;
}

const compareAccountCodes = (codeA: string, codeB: string) => {
  return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
};

export default function COAManager({
  accounts,
  transactions,
  inventory = [],
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onReorderAccounts,
  onResetToDefaults,
  onNavigateToInventory
}: COAManagerProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType | 'Semua'>('Semua');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [draggedCode, setDraggedCode] = useState<string | null>(null);
  const [dragOverCode, setDragOverCode] = useState<string | null>(null);
  const [lastMovedCode, setLastMovedCode] = useState<string | null>(null);

  // Auto-sort when adding/editing account (persisted in localStorage, defaults to true)
  const [autoSortByCode, setAutoSortByCode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('finance_coa_auto_sort');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoSort = (nextVal: boolean) => {
    setAutoSortByCode(nextVal);
    try {
      localStorage.setItem('finance_coa_auto_sort', String(nextVal));
    } catch {
      // ignore storage errors
    }
    if (nextVal && onReorderAccounts) {
      const sorted = [...accounts].sort((a, b) => compareAccountCodes(a.code, b.code));
      onReorderAccounts(sorted, 'Daftar akun telah diurutkan otomatis sesuai Kode Akun.');
    }
  };

  // Delete Confirm State
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    code: string;
    name: string;
    isUsed: boolean;
  }>({
    isOpen: false,
    code: '',
    name: '',
    isUsed: false
  });

  // Reset Confirm State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Aktiva');
  const [normalBalance, setNormalBalance] = useState<NormalBalance>('Debit');
  const [initialBalance, setInitialBalance] = useState(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Suggest next sequential account code based on AccountType
  const getSuggestedAccountCode = (accType: AccountType, currentAccounts: Account[] = accounts): string => {
    const prefixMap: Record<AccountType, string> = {
      Aktiva: '1',
      Kewajiban: '2',
      Modal: '3',
      Pendapatan: '4',
      Beban: '5'
    };
    const mainDigit = prefixMap[accType] || '1';
    const matchingNumbers: number[] = [];

    currentAccounts.forEach(a => {
      const match = a.code.match(/^(\d)-(\d{4})$/);
      if (match && match[1] === mainDigit) {
        const num = parseInt(match[2], 10);
        // For Aktiva, keep standard current asset series 1001..1999 unless user chooses 2xxx
        if (!isNaN(num) && num < 2000) {
          matchingNumbers.push(num);
        }
      }
    });

    if (matchingNumbers.length === 0) {
      return `${mainDigit}-1001`;
    }
    const maxNum = Math.max(...matchingNumbers);
    const nextNum = String(maxNum + 1).padStart(4, '0');
    return `${mainDigit}-${nextNum}`;
  };

  // Check if current accounts array is sorted by code
  const isSortedByCode = useMemo(() => {
    if (accounts.length <= 1) return true;
    for (let i = 1; i < accounts.length; i++) {
      if (compareAccountCodes(accounts[i - 1].code, accounts[i].code) > 0) {
        return false;
      }
    }
    return true;
  }, [accounts]);

  // 1-click Sort all accounts by Account Code
  const handleSortAccountsByCode = () => {
    if (!onReorderAccounts) return;
    const sorted = [...accounts].sort((a, b) => compareAccountCodes(a.code, b.code));
    onReorderAccounts(sorted, 'Seluruh pos Daftar Akun (COA) berhasil dirapikan sesuai urutan Kode Akun.');
  };

  // Handle Edit Click
  const handleEditClick = (acc: Account) => {
    setEditingAccount(acc);
    setCode(acc.code);
    setName(acc.name);
    setType(acc.type);
    setNormalBalance(acc.normalBalance);
    setInitialBalance(acc.initialBalance);
    setDescription(acc.description || '');
    setError('');
    setIsFormOpen(true);
  };

  // Handle Add Click
  const handleAddClick = () => {
    const defaultType: AccountType = selectedType !== 'Semua' ? selectedType : 'Aktiva';
    const defaultNorm: NormalBalance = defaultType === 'Aktiva' || defaultType === 'Beban' ? 'Debit' : 'Kredit';
    const suggested = getSuggestedAccountCode(defaultType, accounts);
    setEditingAccount(null);
    setCode(suggested);
    setName('');
    setType(defaultType);
    setNormalBalance(defaultNorm);
    setInitialBalance(0);
    setDescription('');
    setError('');
    setIsFormOpen(true);
  };

  // Check if account is being used in transactions
  const isAccountUsed = (accCode: string) => {
    return transactions.some(t => t.debitAccount === accCode || t.creditAccount === accCode);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || !name.trim()) {
      setError('Kode Akun dan Nama Akun wajib diisi.');
      return;
    }

    // Format validation (optional, but keep it flexible. Usually is X-XXXX)
    const codePattern = /^\d-\d{4}$/;
    if (!codePattern.test(code)) {
      setError('Format Kode Akun harus X-XXXX (Contoh: 1-1000 untuk Kas/Bank).');
      return;
    }

    if (!editingAccount) {
      // Add Mode: Check if code already exists
      const exists = accounts.some(a => a.code === code);
      if (exists) {
        setError('Kode Akun sudah digunakan.');
        return;
      }
      onAddAccount(
        {
          code,
          name,
          type,
          normalBalance,
          initialBalance,
          description
        },
        autoSortByCode
      );
      setLastMovedCode(code);
      setTimeout(() => setLastMovedCode(null), 2000);
    } else {
      // Edit Mode: Code shouldn't change if used, or we just allow updates
      if (editingAccount.code !== code) {
        const exists = accounts.some(a => a.code === code);
        if (exists) {
          setError('Kode Akun baru sudah digunakan oleh akun lain.');
          return;
        }
        if (isAccountUsed(editingAccount.code)) {
          setError('Kode Akun tidak dapat diubah karena akun telah digunakan dalam transaksi.');
          return;
        }
      }
      onEditAccount(
        {
          code,
          name,
          type,
          normalBalance,
          initialBalance,
          description
        },
        editingAccount.code,
        autoSortByCode
      );
      setLastMovedCode(code);
      setTimeout(() => setLastMovedCode(null), 2000);
    }

    setIsFormOpen(false);
  };

  // Auto-set normal balance and suggested code based on Account Type
  const handleTypeChange = (newType: AccountType) => {
    setType(newType);
    if (newType === 'Aktiva' || newType === 'Beban') {
      setNormalBalance('Debit');
    } else {
      setNormalBalance('Kredit');
    }
    if (!editingAccount) {
      setCode(getSuggestedAccountCode(newType, accounts));
    }
  };

  const handleDelete = (accCode: string, accName: string) => {
    const isUsed = isAccountUsed(accCode);
    setDeleteConfirmState({
      isOpen: true,
      code: accCode,
      name: accName,
      isUsed
    });
  };

  // Filter and Search Accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.name.toLowerCase().includes(search.toLowerCase()) || 
      acc.code.includes(search);
    const matchesType = selectedType === 'Semua' || acc.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Move account up or down in the list (works seamlessly both in 'Semua' view and category filter view)
  const handleMoveAccount = (accCode: string, direction: 'up' | 'down') => {
    if (!onReorderAccounts) return;
    const visIndex = filteredAccounts.findIndex(a => a.code === accCode);
    if (visIndex === -1) return;

    const targetVisIndex = direction === 'up' ? visIndex - 1 : visIndex + 1;
    if (targetVisIndex < 0 || targetVisIndex >= filteredAccounts.length) return;

    const neighborCode = filteredAccounts[targetVisIndex].code;
    const masterIdxA = accounts.findIndex(a => a.code === accCode);
    const masterIdxB = accounts.findIndex(a => a.code === neighborCode);
    if (masterIdxA === -1 || masterIdxB === -1) return;

    const nextAccounts = [...accounts];
    const temp = nextAccounts[masterIdxA];
    nextAccounts[masterIdxA] = nextAccounts[masterIdxB];
    nextAccounts[masterIdxB] = temp;

    setLastMovedCode(accCode);
    setTimeout(() => setLastMovedCode(null), 1200);
    onReorderAccounts(nextAccounts);
  };

  // Drag & drop reorder handler
  const handleDropOnAccount = (targetCode: string) => {
    if (!onReorderAccounts || !draggedCode || draggedCode === targetCode) {
      setDraggedCode(null);
      setDragOverCode(null);
      return;
    }

    const fromIdx = accounts.findIndex(a => a.code === draggedCode);
    const toIdx = accounts.findIndex(a => a.code === targetCode);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedCode(null);
      setDragOverCode(null);
      return;
    }

    const nextAccounts = [...accounts];
    const [movedItem] = nextAccounts.splice(fromIdx, 1);
    nextAccounts.splice(toIdx, 0, movedItem);

    const movedCode = draggedCode;
    setDraggedCode(null);
    setDragOverCode(null);
    setLastMovedCode(movedCode);
    setTimeout(() => setLastMovedCode(null), 1200);
    onReorderAccounts(nextAccounts);
  };

  // Group accounts for layout summaries
  const countByType = (t: AccountType) => accounts.filter(a => a.type === t).length;

  return (
    <div id="coa-manager" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header and Search */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-semibold text-slate-800">Daftar Akun (Chart of Accounts)</h2>
              {isSortedByCode ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Urutan Rapi Sesuai Kode Akun
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                  Urutan Kustom Manual
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Kelola klasifikasi rekening akuntansi, naik-turunkan posisi pos akun, atau rapikan urutan otomatis sesuai Kode Akun.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSortAccountsByCode}
              className={`inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-xl border transition duration-150 cursor-pointer shadow-2xs ${
                isSortedByCode
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 shadow-xs'
              }`}
              title="Rapikan seluruh pos akun secara berurutan sesuai Kode Akun (1-1001 s/d 5-9999)"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Urutkan Sesuai Kode Akun</span>
            </button>

            {onResetToDefaults && (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl transition duration-150 cursor-pointer shadow-2xs"
                title="Reset ke Daftar Akun Bawaan Baru"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Bawaan</span>
              </button>
            )}
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#430001] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Akun Baru</span>
            </button>
          </div>
        </div>

        {/* Ordering Control Strip */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <div className="p-1.5 rounded-lg bg-[#580001]/10 text-[#580001] shrink-0">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800">Pengaturan Posisi & Urutan Pos Akun:</span>{' '}
              <span>
                Gunakan tombol <strong>▲ Naik</strong> / <strong>▼ Turun</strong> (atau tahan & geser baris) untuk mengatur posisi pos, atau aktifkan urutan otomatis sesuai Kode Akun.
              </span>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer shrink-0 select-none">
            <input
              type="checkbox"
              checked={autoSortByCode}
              onChange={(e) => handleToggleAutoSort(e.target.checked)}
              className="rounded accent-[#580001] w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-slate-800">
              Otomatis Urut Sesuai Kode saat Tambah/Ubah
            </span>
          </label>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama akun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] transition"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['Semua', 'Aktiva', 'Kewajiban', 'Modal', 'Pendapatan', 'Beban'] as const).map((typeOpt) => (
              <button
                key={typeOpt}
                onClick={() => setSelectedType(typeOpt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  selectedType === typeOpt
                    ? 'bg-[#580001] text-white border-[#580001] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-[#580001]/5 hover:text-[#580001]'
                }`}
              >
                {typeOpt} {typeOpt !== 'Semua' && `(${countByType(typeOpt)})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts List Table */}
      {accounts.length === 0 ? (
        <div className="p-12 text-center max-w-xl mx-auto my-8 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-12 h-12 bg-[#580001]/10 text-[#580001] rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800 text-base">Bagan Akun (Chart of Accounts) Kosong</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Sistem akuntansi Anda saat ini belum memiliki daftar akun. Klik tombol di bawah ini untuk mengaktifkan bagan akun otomatis berstandar profesional untuk brand pakaian Anda secara instan.
            </p>
          </div>
          {onResetToDefaults && (
            <button
              onClick={onResetToDefaults}
              className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              Buat Daftar Akun Otomatis
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#580001]/20 bg-[#580001]/5 text-[#580001] text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-28 text-center">Posisi / Urutan</th>
                <th className="py-3.5 px-4">Kode Akun</th>
                <th className="py-3.5 px-6">Nama Akun</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Saldo Normal</th>
                <th className="py-3.5 px-6 text-right">Saldo Awal</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc, index) => {
                  const isUsed = isAccountUsed(acc.code);
                  const linkedInvItems = inventory.filter(i => i.accountCode === acc.code);
                  const invQty = linkedInvItems.reduce((sum, i) => sum + Math.max(0, i.totalQty - i.usedOrSoldQty), 0);
                  const invValue = linkedInvItems.reduce((sum, i) => sum + Math.max(0, i.totalQty - i.usedOrSoldQty) * i.unitCost, 0);
                  const canMoveUp = index > 0;
                  const canMoveDown = index < filteredAccounts.length - 1;
                  const isHighlighted = lastMovedCode === acc.code;
                  const isDragOver = dragOverCode === acc.code && draggedCode !== acc.code;

                  return (
                    <tr
                      key={acc.code}
                      draggable={!!onReorderAccounts}
                      onDragStart={() => setDraggedCode(acc.code)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverCode !== acc.code) setDragOverCode(acc.code);
                      }}
                      onDragLeave={() => {
                        if (dragOverCode === acc.code) setDragOverCode(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropOnAccount(acc.code);
                      }}
                      onDragEnd={() => {
                        setDraggedCode(null);
                        setDragOverCode(null);
                      }}
                      className={`transition ${
                        isHighlighted
                          ? 'bg-amber-50/90 ring-1 ring-amber-300'
                          : isDragOver
                          ? 'bg-[#580001]/5 border-t-2 border-t-[#580001]'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Kolom Posisi / Naik-Turun Pos */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5"
                            title="Tahan & geser untuk memindahkan baris pos akun"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-400 w-5 text-center">
                            {index + 1}
                          </span>
                          <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => handleMoveAccount(acc.code, 'up')}
                              disabled={!canMoveUp}
                              title={canMoveUp ? `Naikkan posisi [${acc.code}] ${acc.name}` : 'Sudah berada di posisi paling atas'}
                              className="p-1 rounded-md text-slate-600 hover:text-[#580001] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveAccount(acc.code, 'down')}
                              disabled={!canMoveDown}
                              title={canMoveDown ? `Turunkan posisi [${acc.code}] ${acc.name}` : 'Sudah berada di posisi paling bawah'}
                              className="p-1 rounded-md text-slate-600 hover:text-[#580001] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#580001] whitespace-nowrap">
                        <span className="bg-[#580001]/5 border border-[#580001]/15 px-2 py-1 rounded-lg">
                          {acc.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">{acc.name}</span>
                            {linkedInvItems.length > 0 && (
                              <button
                                type="button"
                                onClick={onNavigateToInventory}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[10px] font-bold transition cursor-pointer"
                                title="Klik untuk melihat rincian di Modul Inventory"
                              >
                                <Package className="w-3 h-3 text-[#580001]" />
                                <span>
                                  Inventory: {invQty} unit/pcs ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(invValue)})
                                </span>
                              </button>
                            )}
                          </div>
                          {acc.description && (
                            <p className="text-slate-400 text-xs mt-0.5 font-light">{acc.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          acc.type === 'Aktiva' ? 'bg-blue-50 text-blue-700' :
                          acc.type === 'Kewajiban' ? 'bg-amber-50 text-amber-700' :
                          acc.type === 'Modal' ? 'bg-purple-50 text-purple-700' :
                          acc.type === 'Pendapatan' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-600 text-xs">{acc.normalBalance}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-slate-700">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(acc.initialBalance)}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(acc)}
                            title="Ubah Akun"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(acc.code, acc.name)}
                            title={isUsed ? "Akun sudah memiliki transaksi (tidak bisa dihapus)" : "Hapus Akun"}
                            className={`p-1.5 rounded-lg transition ${
                              isUsed 
                                ? 'text-slate-200 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm">Tidak ada akun yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#580001]/5">
              <h3 className="font-bold text-[#580001]">
                {editingAccount ? 'Ubah Akun Keuangan' : 'Tambah Akun Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                    Tipe Akun
                  </label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as AccountType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                  >
                    <option value="Aktiva">Aktiva (1-xxxx)</option>
                    <option value="Kewajiban">Kewajiban (2-xxxx)</option>
                    <option value="Modal">Modal (3-xxxx)</option>
                    <option value="Pendapatan">Pendapatan (4-xxxx)</option>
                    <option value="Beban">Beban (5-xxxx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                    Saldo Normal
                  </label>
                  <select
                    value={normalBalance}
                    onChange={(e) => setNormalBalance(e.target.value as NormalBalance)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Kredit">Kredit</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    Kode Akun (Format: X-XXXX)
                  </label>
                  {(!editingAccount || !isAccountUsed(editingAccount.code)) && (
                    <button
                      type="button"
                      onClick={() => setCode(getSuggestedAccountCode(type, accounts))}
                      className="text-[11px] font-bold text-[#580001] hover:underline cursor-pointer"
                    >
                      Gunakan Kode Otomatis ({getSuggestedAccountCode(type, accounts)})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 1-1000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!editingAccount && isAccountUsed(editingAccount.code)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] disabled:bg-slate-50 disabled:text-slate-400"
                />
                {editingAccount && isAccountUsed(editingAccount.code) && (
                  <p className="text-slate-400 text-[10px] mt-1 font-light">
                    Kode terkunci karena akun sudah memiliki data transaksi.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Nama Akun
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kas Toko, Persediaan Kain"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Saldo Awal (Rupiah)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={initialBalance || ''}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat mengenai kegunaan akun ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] resize-none"
                />
              </div>

              {/* Opsi Otomatis Urut Sesuai Kode Akun */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={autoSortByCode}
                  onChange={(e) => handleToggleAutoSort(e.target.checked)}
                  className="rounded accent-[#580001] w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 block">
                    Otomatis urutkan pos sesuai Kode Akun ({code || 'X-XXXX'})
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-relaxed">
                    Saat disimpan, akun akan otomatis ditempatkan secara berurutan sesuai nomor kode akun agar daftar tetap rapi.
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation & Info Modal */}
      {deleteConfirmState.isOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">
                {deleteConfirmState.isUsed ? 'Akun Tidak Dapat Dihapus' : 'Konfirmasi Hapus Akun'}
              </h3>
              <button
                onClick={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {deleteConfirmState.isUsed ? (
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Akun "{deleteConfirmState.name}" ({deleteConfirmState.code}) Sedang Aktif
                    </p>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Sistem akuntansi double-entry melarang penghapusan akun yang sudah digunakan dalam transaksi keuangan. Hal ini demi menjaga integritas, keseimbangan, serta validitas laporan Jurnal Umum, Laba Rugi, dan Neraca Saldo Anda.
                    </p>
                  </div>
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
                      className="px-5 py-2.5 bg-[#580001] hover:bg-[#430001] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Mengerti
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-100">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Apakah Anda yakin ingin menghapus akun ini?
                    </p>
                    <p className="text-slate-600 text-xs font-mono bg-slate-50 py-2 px-3 rounded-xl border border-slate-100 inline-block">
                      {deleteConfirmState.code} - {deleteConfirmState.name}
                    </p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Tindakan ini bersifat permanen. Rekening ini akan dihapus dari bagan akun (COA) secara permanen.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))}
                      className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        onDeleteAccount(deleteConfirmState.code);
                        setDeleteConfirmState(prev => ({ ...prev, isOpen: false }));
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      Ya, Hapus Akun
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800">Konfirmasi Reset Data</h3>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  Kembalikan ke Pengaturan & Data Bawaan?
                </p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Langkah ini akan me-reset daftar akun (Chart of Accounts) dan seluruh riwayat transaksi kembali ke data bawaan simulasi. Seluruh perubahan kustom Anda saat ini akan dihapus secara permanen.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (onResetToDefaults) onResetToDefaults();
                    setIsResetConfirmOpen(false);
                  }}
                  className="px-4 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Ya, Reset Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
