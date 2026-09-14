/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Account, Transaction } from '../types';
import { Plus, Search, Edit2, Trash2, X, AlertCircle, Sparkles, Filter, RefreshCw } from 'lucide-react';

interface TransactionManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddTransaction: (trx: Transaction | Transaction[]) => void;
  onEditTransaction: (trx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

interface QuickTemplate {
  name: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  defaultRef: string;
}

export default function TransactionManager({
  accounts,
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction
}: TransactionManagerProps) {
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [refNum, setRefNum] = useState('');
  const [description, setDescription] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState('');

  // Automatic HPP / COGS posting states
  const [cogsEnabled, setCogsEnabled] = useState(false);
  const [cogsAmount, setCogsAmount] = useState(0);
  const [cogsDebitAccount, setCogsDebitAccount] = useState('5-1001'); // Harga Pokok Penjualan
  const [cogsCreditAccount, setCogsCreditAccount] = useState('1-1005'); // Persediaan Barang
  const [cogsQty, setCogsQty] = useState(0);
  const [cogsCostPerPiece, setCogsCostPerPiece] = useState(0);

  // Delete confirmation modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; refNum: string } | null>(null);

  // Quick transaction templates for clothing brand
  const quickTemplates: QuickTemplate[] = [
    {
      name: 'Penjualan Retail (Tunai/MDR)',
      description: 'Penjualan pakaian secara retail langsung ke pelanggan tunai/debit',
      debitAccount: '1-1000', // Kas dan Bank
      creditAccount: '4-1000', // Pendapatan Retail
      defaultRef: 'SLS-RET-'
    },
    {
      name: 'Penjualan Grosir (Invoice/Reseller)',
      description: 'Penjualan partai besar ke reseller atau mitra distributor',
      debitAccount: '1-1000', // Kas dan Bank (or Piutang)
      creditAccount: '4-1100', // Pendapatan Grosir
      defaultRef: 'SLS-GROS-'
    },
    {
      name: 'Produksi / Pembelian Bahan Baku',
      description: 'Pengeluaran kas untuk belanja kain, benang, kancing, atau makloon jahit',
      debitAccount: '1-1300', // Persediaan Bahan Baku
      creditAccount: '1-1000', // Kas dan Bank
      defaultRef: 'PROD-'
    },
    {
      name: 'Pembelian Kemasan (Packaging)',
      description: 'Beli kotak baju, plastik polymailer, sticker pack, bubble wrap',
      debitAccount: '5-1500', // Beban Kemasan & Packaging
      creditAccount: '1-1100', // Kas Kecil
      defaultRef: 'PKG-'
    },
    {
      name: 'Biaya Iklan (Instagram / Tiktok Ads)',
      description: 'Pembayaran budget iklan media sosial atau endorsement influencer',
      debitAccount: '5-1400', // Beban Pemasaran & Iklan
      creditAccount: '1-1000', // Kas dan Bank
      defaultRef: 'MKT-ADS-'
    },
    {
      name: 'Pembayaran Gaji Karyawan',
      description: 'Transfer gaji staff toko, admin medsos, atau tukang pola & jahit',
      debitAccount: '5-1100', // Beban Gaji
      creditAccount: '1-1000', // Kas dan Bank
      defaultRef: 'PAY-GAJI-'
    },
    {
      name: 'Pembayaran Utilitas (Listrik & Wifi)',
      description: 'Pembayaran bulanan listrik ruko, air, dan biaya internet toko',
      debitAccount: '5-1300', // Beban Utilitas
      creditAccount: '1-1000', // Kas dan Bank
      defaultRef: 'UTIL-'
    },
    {
      name: 'Prive / Penarikan Pribadi Pemilik',
      description: 'Penarikan uang perusahaan untuk keperluan pribadi owner',
      debitAccount: '3-1200', // Prive Pemilik
      creditAccount: '1-1000', // Kas dan Bank
      defaultRef: 'PRV-'
    }
  ];

  const applyTemplate = (tpl: QuickTemplate) => {
    setDebitAccount(tpl.debitAccount);
    setCreditAccount(tpl.creditAccount);
    setDescription(tpl.name + ' - ');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setRefNum(tpl.defaultRef + randomSuffix);
  };

  const handleAddClick = () => {
    setEditingTrx(null);
    setDate(new Date().toISOString().split('T')[0]);
    setRefNum('TRX-' + Math.floor(1000 + Math.random() * 9000));
    setDescription('');
    setDebitAccount('');
    setCreditAccount('');
    setAmount(0);
    setError('');

    // Reset HPP states
    setCogsEnabled(false);
    setCogsAmount(0);
    setCogsQty(0);
    setCogsCostPerPiece(0);

    setIsFormOpen(true);
  };

  const handleEditClick = (trx: Transaction) => {
    setEditingTrx(trx);
    setDate(trx.date);
    setRefNum(trx.refNum);
    setDescription(trx.description);
    setDebitAccount(trx.debitAccount);
    setCreditAccount(trx.creditAccount);
    setAmount(trx.amount);
    setError('');
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, ref: string) => {
    setDeleteTarget({ id, refNum: ref });
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDeleteTransaction(deleteTarget.id);
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date || !refNum.trim() || !description.trim() || !debitAccount || !creditAccount || amount <= 0) {
      setError('Harap isi semua kolom formulir dengan benar dan pastikan nilai nominal transaksi lebih dari Rp0.');
      return;
    }

    if (debitAccount === creditAccount) {
      setError('Akun Debit dan Akun Kredit tidak boleh sama dalam pencatatan jurnal berpasangan.');
      return;
    }

    const transactionData: Transaction = {
      id: editingTrx ? editingTrx.id : `TX-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      date,
      refNum: refNum.trim(),
      description: description.trim(),
      debitAccount,
      creditAccount,
      amount,
      createdAt: editingTrx ? editingTrx.createdAt : new Date().toISOString()
    };

    if (editingTrx) {
      onEditTransaction(transactionData);
    } else {
      if (cogsEnabled && cogsAmount > 0) {
        // Create secondary HPP transaction
        const cogsTransaction: Transaction = {
          id: `TX-${Date.now() + 1}-${Math.floor(Math.random() * 100000)}`,
          date,
          refNum: `HPP-${refNum.trim()}`,
          description: `HPP atas Penjualan Ref ${refNum.trim()}` + (cogsQty > 0 ? ` (${cogsQty} pcs)` : ''),
          debitAccount: cogsDebitAccount,
          creditAccount: cogsCreditAccount,
          amount: cogsAmount,
          createdAt: new Date().toISOString()
        };
        onAddTransaction([transactionData, cogsTransaction]);
      } else {
        onAddTransaction(transactionData);
      }
    }

    setIsFormOpen(false);
  };

  const getAccountName = (code: string) => {
    return accounts.find(a => a.code === code)?.name || code;
  };

  // Reset Filters
  const resetFilters = () => {
    setSearch('');
    setFilterAccount('');
    setStartDate('');
    setEndDate('');
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter(trx => {
    const matchesSearch = 
      trx.description.toLowerCase().includes(search.toLowerCase()) ||
      trx.refNum.toLowerCase().includes(search.toLowerCase());
    
    const matchesAccount = 
      !filterAccount || 
      trx.debitAccount === filterAccount || 
      trx.creditAccount === filterAccount;

    const matchesStartDate = !startDate || trx.date >= startDate;
    const matchesEndDate = !endDate || trx.date <= endDate;

    return matchesSearch && matchesAccount && matchesStartDate && matchesEndDate;
  }).sort((a, b) => b.date.localeCompare(a.date)); // Sort newest date first

  const totalVolume = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div id="transaction-manager" className="space-y-6">
      {/* Search and Filters Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Pencatatan Transaksi Keuangan</h2>
            <p className="text-slate-500 text-sm mt-1">Kelola mutasi kas, penjualan, biaya produksi, dan operasional pakaian.</p>
          </div>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#430001] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Transaksi Baru
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari deskripsi atau No Ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] focus:bg-white transition"
            />
          </div>

          <div>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] focus:bg-white"
            >
              <option value="">Semua Rekening Akun</option>
              {accounts.map(acc => (
                <option key={acc.code} value={acc.code}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Mulai Tanggal"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Sampai Tanggal"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Histori Transaksi Terdaftar</span>
          <div className="text-right text-xs">
            <span className="text-slate-400">Total Volume Periode:</span>{' '}
            <strong className="text-slate-700 font-semibold font-mono text-sm ml-1">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalVolume)}
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Tanggal</th>
                <th className="py-3.5 px-6">No Ref</th>
                <th className="py-3.5 px-6">Keterangan</th>
                <th className="py-3.5 px-6">Akun Debit</th>
                <th className="py-3.5 px-6">Akun Kredit</th>
                <th className="py-3.5 px-6 text-right">Nominal</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 whitespace-nowrap text-slate-600 text-xs font-mono">{trx.date}</td>
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-800">{trx.refNum}</td>
                    <td className="py-3.5 px-6">
                      <div className="max-w-[280px] truncate text-slate-900 font-medium" title={trx.description}>
                        {trx.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-xs">
                      <div>
                        <span className="font-mono text-slate-500 mr-1 bg-slate-100 px-1 py-0.5 rounded text-[10px]">{trx.debitAccount}</span>
                        <span className="text-slate-700">{getAccountName(trx.debitAccount)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-xs">
                      <div>
                        <span className="font-mono text-slate-500 mr-1 bg-slate-100 px-1 py-0.5 rounded text-[10px]">{trx.creditAccount}</span>
                        <span className="text-slate-700">{getAccountName(trx.creditAccount)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-900">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(trx.amount)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(trx)}
                          title="Ubah Transaksi"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(trx.id, trx.refNum)}
                          title="Hapus Transaksi"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm">Tidak ada transaksi ditemukan pada periode filter ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#580001]/5">
              <h3 className="font-bold text-[#580001]">
                {editingTrx ? 'Ubah Transaksi Keuangan' : 'Catat Transaksi Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6 max-h-[80vh] overflow-y-auto">
              {/* Left Form: Form Input */}
              <div className="md:col-span-3 space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Tanggal Buku
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        No Referensi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: SLS-1001"
                        value={refNum}
                        onChange={(e) => setRefNum(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                      Keterangan / Deskripsi Transaksi
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan deskripsi detail barang atau transaksi..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Akun Debit (+)
                      </label>
                      <select
                        value={debitAccount}
                        onChange={(e) => setDebitAccount(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                      >
                        <option value="">Pilih Akun Debit</option>
                        {accounts.map(acc => (
                          <option key={acc.code} value={acc.code}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Akun Kredit (-)
                      </label>
                      <select
                        value={creditAccount}
                        onChange={(e) => setCreditAccount(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                      >
                        <option value="">Pilih Akun Kredit</option>
                        {accounts.map(acc => (
                          <option key={acc.code} value={acc.code}>
                            [{acc.code}] {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                      Nominal Transaksi (Rupiah)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-medium text-sm">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={amount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setAmount(val);
                          // If HPP is enabled and amount is updated, reset or prefill default
                          if (cogsEnabled && cogsAmount === 0 && val > 0) {
                            setCogsAmount(Math.round(val * 0.4));
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                      />
                    </div>
                  </div>

                  {/* Simultaneous COGS / HPP Option for Revenue Credit Accounts */}
                  {!editingTrx && creditAccount && (creditAccount.startsWith('4-') || accounts.find(a => a.code === creditAccount)?.type === 'Pendapatan') && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 mt-2">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cogsEnabled}
                          onChange={(e) => {
                            setCogsEnabled(e.target.checked);
                            if (e.target.checked && cogsAmount === 0 && amount > 0) {
                              setCogsAmount(Math.round(amount * 0.4)); // Default estimate 40% HPP
                            }
                          }}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 w-4 h-4 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            Sertakan Jurnal Pengurangan Persediaan & Beban HPP
                          </span>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Otomatis mencatat pengurangan aset persediaan baju (Kredit) dan pengakuan beban pokok penjualan (Debit) bersamaan dengan transaksi pendapatan ini.
                          </p>
                        </div>
                      </label>

                      {cogsEnabled && (
                        <div className="pt-3 border-t border-slate-200 space-y-3.5 animate-in fade-in duration-150">
                          {/* Quick calculation sub-panel */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-slate-500 font-medium mb-1">Jumlah Terjual (Qty Pcs)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={cogsQty || ''}
                                onChange={(e) => {
                                  const q = parseInt(e.target.value) || 0;
                                  setCogsQty(q);
                                  setCogsAmount(q * cogsCostPerPiece);
                                }}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-500 font-medium mb-1">Estimasi HPP Satuan (Rp/pcs)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={cogsCostPerPiece || ''}
                                onChange={(e) => {
                                  const cpp = parseFloat(e.target.value) || 0;
                                  setCogsCostPerPiece(cpp);
                                  setCogsAmount(cogsQty * cpp);
                                }}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                              <label className="block text-slate-600 text-[10px] font-bold mb-1 uppercase tracking-wider">Nominal HPP Total</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">Rp</span>
                                <input
                                  type="number"
                                  value={cogsAmount || ''}
                                  onChange={(e) => setCogsAmount(parseFloat(e.target.value) || 0)}
                                  className="w-full pl-7 pr-2 py-1.5 border border-slate-250 rounded-xl text-xs font-mono font-bold text-slate-800"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-600 text-[10px] font-bold mb-1 uppercase tracking-wider">Debit HPP (+)</label>
                              <select
                                value={cogsDebitAccount}
                                onChange={(e) => setCogsDebitAccount(e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
                              >
                                {accounts.filter(a => a.type === 'Beban' || a.code === '5-1001').map(acc => (
                                  <option key={acc.code} value={acc.code}>
                                    [{acc.code}] {acc.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-600 text-[10px] font-bold mb-1 uppercase tracking-wider">Kredit Persediaan (-)</label>
                              <select
                                value={cogsCreditAccount}
                                onChange={(e) => setCogsCreditAccount(e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
                              >
                                {accounts.filter(a => a.type === 'Aktiva' || a.code === '1-1005').map(acc => (
                                  <option key={acc.code} value={acc.code}>
                                    [{acc.code}] {acc.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Visual Ledger Entry Preview for HPP */}
                          {cogsAmount > 0 && (
                            <div className="bg-[#580001] text-white/90 p-3 rounded-xl border border-[#580001] text-[10px] space-y-1.5 font-mono shadow-xs">
                              <p className="text-amber-300 font-bold uppercase text-[9px] tracking-wider">Pratinjau Jurnal HPP Tambahan:</p>
                              <div className="flex justify-between">
                                <span>Debit: ({cogsDebitAccount}) - {accounts.find(a=>a.code === cogsDebitAccount)?.name}</span>
                                <span className="text-white font-bold">+{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cogsAmount)}</span>
                              </div>
                              <div className="flex justify-between pl-4 text-white/70">
                                <span>Kredit: ({cogsCreditAccount}) - {accounts.find(a=>a.code === cogsCreditAccount)?.name}</span>
                                <span className="font-bold text-white/90">-{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cogsAmount)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                      Simpan Transaksi
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Panel: Quick Templates */}
              <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5 h-fit">
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Template Cepat (Clothing)</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Gunakan template siap-pakai ini untuk mengisi akun debit & kredit secara otomatis dan mengurangi kesalahan akuntansi.
                </p>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {quickTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="w-full text-left p-2.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition text-xs flex flex-col gap-1 cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800">{tpl.name}</span>
                      <span className="text-slate-400 text-[10px] leading-snug line-clamp-2">{tpl.description}</span>
                      <div className="flex gap-2 text-[9px] font-mono mt-1 text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <span>Db: {tpl.debitAccount}</span>
                        <span>•</span>
                        <span>Kr: {tpl.creditAccount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal (Iframe safe) */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
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
              <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-100">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  Hapus Transaksi No Ref: <span className="font-mono text-rose-600 font-bold">{deleteTarget?.refNum}</span>?
                </p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini akan membatalkan catatan jurnal secara permanen dari sistem dan tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
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
