/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Account, InventoryItem, InventoryCategory, SavedCalculation } from '../types';
import { generateAutoSkuFromName } from './StockSkuManager';
import {
  Package,
  ShoppingBag,
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  FileBox,
  Layers,
  Ban,
  ArrowRight,
  Shirt,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface InventoryManagerProps {
  accounts: Account[];
  inventory: InventoryItem[];
  onAddInventory: (item: InventoryItem) => void;
  onEditInventory: (item: InventoryItem) => void;
  onDeleteInventory: (id: string) => void;
  onNavigateToCOA: () => void;
  onNavigateToStockSku?: () => void;
}

const FOR_SALE_SUBCATEGORIES = [
  'Kaos / T-Shirt',
  'Hoodie / Outerwear',
  'Kemeja / Workshirt',
  'Celana / Pants',
  'Aksesoris / Topi / Tas',
  'Artikel Pakaian Lainnya'
];

const INTERNAL_USE_SUBCATEGORIES = [
  'Perlengkapan Packing (Habis Pakai)',
  'Perlengkapan Toko (Habis Pakai)',
  'Peralatan Studio & Display',
  'Peralatan Gudang & Admin',
  'Inventaris Operasional Lainnya'
];

export default function InventoryManager({
  accounts,
  inventory,
  onAddInventory,
  onEditInventory,
  onDeleteInventory,
  onNavigateToCOA,
  onNavigateToStockSku
}: InventoryManagerProps) {
  const [activeTab, setActiveTab] = useState<'for_sale' | 'internal_use' | 'all'>('for_sale');
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('ALL');

  // Saved HPP articles for quick import into "Barang untuk Dijual"
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

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formError, setFormError] = useState('');

  const [category, setCategory] = useState<InventoryCategory>('for_sale');
  const [name, setName] = useState('');
  const [subCategory, setSubCategory] = useState(FOR_SALE_SUBCATEGORIES[0]);
  const [unit, setUnit] = useState('pcs');
  const [totalQty, setTotalQty] = useState<number>(50);
  const [usedOrSoldQty, setUsedOrSoldQty] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [accountCode, setAccountCode] = useState<string>('1-1005');
  const [notes, setNotes] = useState('');

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

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

  // Split inventory into 2 core categories
  const forSaleItems = useMemo(
    () => inventory.filter(i => i.category === 'for_sale'),
    [inventory]
  );
  const internalUseItems = useMemo(
    () => inventory.filter(i => i.category === 'internal_use'),
    [inventory]
  );

  // Metrics for "Barang untuk Dijual" (Total Barang Belum Terjual & Nilai Total Harganya)
  const forSaleMetrics = useMemo(() => {
    return forSaleItems.reduce(
      (acc, item) => {
        const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
        const unsoldVal = rem * item.unitCost;
        const potentialRev = rem * (item.sellingPrice || 0);
        acc.totalInQty += item.totalQty;
        acc.soldQty += item.usedOrSoldQty;
        acc.unsoldQty += rem;
        acc.unsoldValue += unsoldVal;
        acc.potentialRevenue += potentialRev;
        return acc;
      },
      { totalInQty: 0, soldQty: 0, unsoldQty: 0, unsoldValue: 0, potentialRevenue: 0 }
    );
  }, [forSaleItems]);

  // Metrics for "Barang untuk Dipakai / Tidak Dijual" (Internal Use & Nilai Total Harganya)
  const internalUseMetrics = useMemo(() => {
    return internalUseItems.reduce(
      (acc, item) => {
        const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
        const remVal = rem * item.unitCost;
        acc.totalInQty += item.totalQty;
        acc.usedQty += item.usedOrSoldQty;
        acc.remainingQty += rem;
        acc.remainingValue += remVal;
        return acc;
      },
      { totalInQty: 0, usedQty: 0, remainingQty: 0, remainingValue: 0 }
    );
  }, [internalUseItems]);

  // Account Breakdown Summary (Shows exact amount going to each COA Account)
  const accountValuationMap = useMemo(() => {
    const map: Record<
      string,
      { code: string; name: string; categoryLabel: string; itemCount: number; remainingQty: number; totalValue: number }
    > = {};
    inventory.forEach(item => {
      const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
      const val = rem * item.unitCost;
      const code = item.accountCode || (item.category === 'for_sale' ? '1-1005' : '1-1006');
      if (!map[code]) {
        map[code] = {
          code,
          name: getAccountName(code),
          categoryLabel:
            item.category === 'for_sale'
              ? 'Barang untuk Dijual (Belum Terjual)'
              : 'Barang untuk Dipakai (Tidak Dijual)',
          itemCount: 0,
          remainingQty: 0,
          totalValue: 0
        };
      }
      map[code].itemCount += 1;
      map[code].remainingQty += rem;
      map[code].totalValue += val;
    });
    return Object.values(map);
  }, [inventory, accounts]);

  // Filtered items based on tab & search
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      if (activeTab === 'for_sale' && item.category !== 'for_sale') return false;
      if (activeTab === 'internal_use' && item.category !== 'internal_use') return false;
      if (filterAccount !== 'ALL' && item.accountCode !== filterAccount) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSub = item.subCategory.toLowerCase().includes(q);
        if (!matchName && !matchSub) return false;
      }
      return true;
    });
  }, [inventory, activeTab, filterAccount, search]);

  // Handle Category switch inside form
  const handleFormCategoryChange = (newCat: InventoryCategory) => {
    setCategory(newCat);
    if (newCat === 'for_sale') {
      setSubCategory(FOR_SALE_SUBCATEGORIES[0]);
      setUnit('pcs');
      setAccountCode('1-1005'); // Persediaan Barang
    } else {
      setSubCategory(INTERNAL_USE_SUBCATEGORIES[0]);
      setUnit('pack');
      setSellingPrice(0);
      setAccountCode('1-1006'); // Perlengkapan
    }
  };

  // Open Add Modal
  const handleOpenAddModal = (defaultCat?: InventoryCategory) => {
    const targetCat = defaultCat || (activeTab === 'internal_use' ? 'internal_use' : 'for_sale');
    setEditingItem(null);
    setFormError('');
    setCategory(targetCat);
    if (targetCat === 'for_sale') {
      setSubCategory(FOR_SALE_SUBCATEGORIES[0]);
      setUnit('pcs');
      setAccountCode('1-1005');
      setTotalQty(50);
      setUsedOrSoldQty(0);
      setUnitCost(60000);
      setSellingPrice(165000);
    } else {
      setSubCategory(INTERNAL_USE_SUBCATEGORIES[0]);
      setUnit('pack');
      setAccountCode('1-1006');
      setTotalQty(10);
      setUsedOrSoldQty(0);
      setUnitCost(50000);
      setSellingPrice(0);
    }
    setName('');
    setNotes('');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormError('');
    setCategory(item.category);
    setName(item.name);
    setSubCategory(item.subCategory);
    setUnit(item.unit);
    setTotalQty(item.totalQty);
    setUsedOrSoldQty(item.usedOrSoldQty);
    setUnitCost(item.unitCost);
    setSellingPrice(item.sellingPrice || 0);
    setAccountCode(item.accountCode);
    setNotes(item.notes || '');
    setIsFormOpen(true);
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || totalQty < 0 || unitCost <= 0) {
      setFormError('Harap isi Nama Barang, Jumlah Barang, dan Harga Pokok/Perolehan Satuan lebih dari Rp 0.');
      return;
    }

    if (usedOrSoldQty > totalQty) {
      setFormError('Jumlah Terjual / Terpakai tidak boleh melebihi Total Barang Masuk.');
      return;
    }

    const remainingQty = Math.max(0, totalQty - usedOrSoldQty);
    const totalRemainingValue = remainingQty * unitCost;
    const autoSku = editingItem ? editingItem.sku : generateAutoSkuFromName(name, category, subCategory);

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      sku: autoSku,
      name: name.trim(),
      category,
      subCategory,
      unit: unit.trim() || 'pcs',
      totalQty,
      usedOrSoldQty,
      remainingQty,
      isAvailable: remainingQty > 0,
      unitCost,
      sellingPrice: category === 'for_sale' ? sellingPrice : 0,
      totalRemainingValue,
      accountCode,
      variants: editingItem?.variants,
      location: editingItem?.location,
      notes: notes.trim(),
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      onEditInventory(newItem);
    } else {
      onAddInventory(newItem);
    }
    setIsFormOpen(false);
  };

  const formRemainingQty = Math.max(0, totalQty - usedOrSoldQty);
  const formRemainingValue = formRemainingQty * unitCost;

  return (
    <div id="inventory-manager" className="space-y-6">
      {/* Top Banner & Explanation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#580001]/10 text-[#580001] text-[11px] font-bold uppercase tracking-wider">
              <Package className="w-3.5 h-3.5" />
              <span>Menu Khusus Nilai Total Harga Inventory (Terpisah dari Kode SKU & Stock)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Inventory: Total Barang Belum Terjual & Barang untuk Dipakai
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Lihat <strong>Nilai Total Harga (Rp)</strong> dari <strong>Barang yang Belum Terjual</strong> serta <strong>Barang untuk Dipakai (Tidak Bisa Dijual)</strong>. Nilai total harganya otomatis masuk ke <strong>Daftar Akun (COA)</strong> yang sesuai <strong>tanpa masuk ke Pencatatan Transaksi Keuangan dan Jurnal Umum</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal('for_sale')}
              className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Barang untuk Dijual</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('internal_use')}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Barang Dipakai (Non-Jual)</span>
            </button>
          </div>
        </div>

        {/* Account Sync & Separation Info Banner */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span>Fokus Nilai Total Harga (Rp) & Sinkronisasi ke Daftar Akun (COA)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Bebas Jurnal Umum
                </span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Untuk mengatur <strong>Kode SKU Otomatis, Rincian Ukuran, dan Edit Status Tersedia/Habis</strong> telah dipisahkan ke menu <strong>Stock & SKU</strong> agar tampilan nilai harga di sini tetap rapi dan tidak membingungkan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToStockSku && (
              <button
                type="button"
                onClick={onNavigateToStockSku}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-[#580001]" />
                <span>Ke Menu Stock & Kode SKU</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToCOA}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-[#580001] border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <FileBox className="w-3.5 h-3.5" />
              <span>Cek Daftar Akun (COA)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Split Cards: 1. Barang untuk Dijual vs 2. Barang untuk Dipakai + 3. Pemetaan Akun COA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Barang untuk Dijual (Total Belum Terjual & Nilai Harganya) */}
        <div
          onClick={() => setActiveTab('for_sale')}
          className={`rounded-2xl p-5 border-2 transition cursor-pointer flex flex-col justify-between space-y-4 ${
            activeTab === 'for_sale'
              ? 'bg-[#580001]/5 border-[#580001] shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#580001] bg-[#580001]/10 px-2.5 py-1 rounded-lg">
                <ShoppingBag className="w-3.5 h-3.5" />
                1. Barang untuk Dijual
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Bisa Dijual
              </span>
            </div>

            <div className="pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Nilai Total Harga Barang Belum Terjual (HPP):
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#580001] mt-0.5">
                {formatIDR(forSaleMetrics.unsoldValue)}
              </div>
              <div className="text-[11px] text-emerald-800 font-semibold mt-1">
                Estimasi Nilai Jual Etalase: <strong className="font-mono">{formatIDR(forSaleMetrics.potentialRevenue)}</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/80 text-center">
            <div className="bg-white p-2 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block">Total Masuk</span>
              <span className="font-mono font-bold text-xs text-slate-700">{forSaleMetrics.totalInQty} pcs</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block">Sudah Terjual</span>
              <span className="font-mono font-bold text-xs text-emerald-700">{forSaleMetrics.soldQty} pcs</span>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-300">
              <span className="text-[10px] font-bold text-amber-900 block">Belum Terjual</span>
              <span className="font-mono font-black text-xs text-amber-950">{forSaleMetrics.unsoldQty} pcs</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white/90 px-3 py-2 rounded-xl border border-slate-200/80">
            <span>Masuk ke Akun COA:</span>
            <strong className="font-mono text-[#580001]">[1-1005] Persediaan Barang</strong>
          </div>
        </div>

        {/* Card 2: Barang untuk Dipakai (Tidak Bisa Dijual & Nilai Total Harganya) */}
        <div
          onClick={() => setActiveTab('internal_use')}
          className={`rounded-2xl p-5 border-2 transition cursor-pointer flex flex-col justify-between space-y-4 ${
            activeTab === 'internal_use'
              ? 'bg-slate-900/5 border-slate-800 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-800 bg-slate-200/80 px-2.5 py-1 rounded-lg">
                <Wrench className="w-3.5 h-3.5" />
                2. Barang untuk Dipakai
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                <Ban className="w-3 h-3" />
                Tidak Bisa Dijual
              </span>
            </div>

            <div className="pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Nilai Total Harga Sisa Barang Dipakai:
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-0.5">
                {formatIDR(internalUseMetrics.remainingValue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Perlengkapan packing, resi, & peralatan studio/toko
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/80 text-center">
            <div className="bg-white p-2 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block">Total Unit</span>
              <span className="font-mono font-bold text-xs text-slate-700">{internalUseMetrics.totalInQty}</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block">Sudah Dipakai</span>
              <span className="font-mono font-bold text-xs text-rose-600">{internalUseMetrics.usedQty}</span>
            </div>
            <div className="bg-slate-100 p-2 rounded-xl border border-slate-300">
              <span className="text-[10px] font-bold text-slate-800 block">Sisa Barang</span>
              <span className="font-mono font-black text-xs text-slate-950">{internalUseMetrics.remainingQty}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white/90 px-3 py-2 rounded-xl border border-slate-200/80">
            <span>Masuk ke Akun COA:</span>
            <strong className="font-mono text-slate-900">[1-1006] Perlengkapan & [1-2001] Peralatan</strong>
          </div>
        </div>

        {/* Card 3: Rincian Nilai Total yang Masuk ke Akun COA */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                <FileBox className="w-3.5 h-3.5 text-blue-600" />
                Rekap Nilai Total per Akun COA
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Non-Jurnal</span>
            </div>

            <div className="space-y-2 pt-1">
              {accountValuationMap.map(accInfo => (
                <div
                  key={accInfo.code}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold bg-[#580001] text-white px-1.5 py-0.5 rounded">
                        {accInfo.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">{accInfo.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {accInfo.categoryLabel} ({accInfo.remainingQty} unit/pcs)
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-xs text-slate-900">
                      {formatIDR(accInfo.totalValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Total Keseluruhan Nilai Inventory:</span>
            <span className="font-mono font-black text-sm text-[#580001]">
              {formatIDR(forSaleMetrics.unsoldValue + internalUseMetrics.remainingValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Switcher Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('for_sale')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'for_sale'
                  ? 'bg-[#580001] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>1. Barang Belum Terjual (Untuk Dijual)</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                  activeTab === 'for_sale' ? 'bg-white/20 text-white' : 'bg-white text-slate-800'
                }`}
              >
                {formatIDR(forSaleMetrics.unsoldValue)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('internal_use')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'internal_use'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>2. Barang untuk Dipakai (Tidak Bisa Dijual)</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
                  activeTab === 'internal_use' ? 'bg-white/20 text-white' : 'bg-white text-slate-800'
                }`}
              >
                {formatIDR(internalUseMetrics.remainingValue)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Kategori ({inventory.length})</span>
            </button>
          </div>

          {/* Filter by COA Account */}
          <div className="flex items-center gap-2">
            <select
              value={filterAccount}
              onChange={e => setFilterAccount(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Akun COA Inventory</option>
              {accounts
                .filter(
                  a =>
                    a.type === 'Aktiva' &&
                    !a.code.startsWith('1-1001') &&
                    !a.code.startsWith('1-1002') &&
                    !a.code.startsWith('1-1003')
                )
                .map(acc => (
                  <option key={acc.code} value={acc.code}>
                    [{acc.code}] {acc.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama barang atau kategori..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#580001] focus:bg-white"
            />
          </div>

          {activeTab === 'for_sale' && (
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 bg-amber-50/90 border border-amber-200 px-3.5 py-2 rounded-xl text-xs">
              <div>
                <span className="text-amber-800">Total Belum Terjual:</span>{' '}
                <strong className="font-mono font-black text-amber-950">{forSaleMetrics.unsoldQty} pcs</strong>
              </div>
              <div className="h-3 w-px bg-amber-300" />
              <div>
                <span className="text-amber-800">Nilai Total Harga (HPP):</span>{' '}
                <strong className="font-mono font-black text-[#580001]">
                  {formatIDR(forSaleMetrics.unsoldValue)}
                </strong>
              </div>
            </div>
          )}

          {activeTab === 'internal_use' && (
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
              <div className="inline-flex items-center gap-1 text-rose-700 font-bold">
                <Ban className="w-3.5 h-3.5" />
                <span>Barang Dipakai (Tidak Dijual)</span>
              </div>
              <div className="h-3 w-px bg-slate-300" />
              <div>
                <span className="text-slate-600">Nilai Total Harga Sisa:</span>{' '}
                <strong className="font-mono font-black text-slate-900">
                  {formatIDR(internalUseMetrics.remainingValue)}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clean Inventory Valuation Table (Focused on Unsold / Used Quantities & Total Price Value) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Nama Barang & Kelompok</th>
                <th className="py-3.5 px-4">Kategori Penggunaan</th>
                <th className="py-3.5 px-4 text-center">
                  {activeTab === 'internal_use' ? 'Sisa Barang Dipakai' : 'Jumlah Belum Terjual'}
                </th>
                <th className="py-3.5 px-4 text-right">
                  {activeTab === 'internal_use' ? 'Harga Beli Satuan' : 'Harga Modal (HPP) Satuan'}
                </th>
                <th className="py-3.5 px-4 text-right bg-amber-50/60 text-[#580001]">
                  {activeTab === 'internal_use'
                    ? 'Nilai Total Harga Sisa (Rp)'
                    : 'Nilai Total Harga Belum Terjual (Rp)'}
                </th>
                {activeTab !== 'internal_use' && (
                  <th className="py-3.5 px-4 text-right">Nilai Total Harga Jual Etalase</th>
                )}
                <th className="py-3.5 px-4">Masuk ke Akun COA</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isForSale = item.category === 'for_sale';
                  const remainingQty = Math.max(0, item.totalQty - item.usedOrSoldQty);
                  const totalRemainingValue = remainingQty * item.unitCost;
                  const totalRetailValue = isForSale ? remainingQty * (item.sellingPrice || 0) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Subcategory */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.subCategory} • Total Masuk: {item.totalQty} {item.unit} ({item.usedOrSoldQty}{' '}
                          {isForSale ? 'terjual' : 'dipakai'})
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-4">
                        {isForSale ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <ShoppingBag className="w-3 h-3 text-emerald-600" />
                            Untuk Dijual
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                            <Ban className="w-3 h-3 text-rose-600" />
                            Dipakai (Tidak Dijual)
                          </span>
                        )}
                      </td>

                      {/* Remaining / Unsold Qty */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-amber-100 text-amber-950 border border-amber-300">
                          {remainingQty} {item.unit}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isForSale ? 'Belum Terjual' : 'Sisa Dipakai'}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-4 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatIDR(item.unitCost)}
                        <div className="text-[10px] text-slate-400 font-sans">per {item.unit}</div>
                      </td>

                      {/* Total Unsold / Remaining Value (HPP / Cost) */}
                      <td className="py-4 px-4 text-right bg-amber-50/40">
                        <div className="font-mono font-black text-sm text-[#580001]">
                          {formatIDR(totalRemainingValue)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {remainingQty} × {formatIDR(item.unitCost)}
                        </div>
                      </td>

                      {/* Total Potential Selling Price Value (only if not internal_use tab) */}
                      {activeTab !== 'internal_use' && (
                        <td className="py-4 px-4 text-right">
                          {isForSale && item.sellingPrice ? (
                            <div>
                              <div className="font-mono font-bold text-xs text-emerald-700">
                                {formatIDR(totalRetailValue)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{formatIDR(item.sellingPrice)}/{item.unit}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Tidak Dijual</span>
                          )}
                        </td>
                      )}

                      {/* Mapped COA Account */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
                          <span className="font-mono font-bold text-[#580001]">{item.accountCode}</span>
                          <span className="text-slate-700 font-medium truncate max-w-[125px]">
                            {getAccountName(item.accountCode)}
                          </span>
                        </div>
                      </td>

                      {/* Edit & Delete */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="px-2.5 py-1.5 text-slate-700 bg-slate-100 hover:bg-[#580001] hover:text-white rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Nilai</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Barang Inventory"
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
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Package className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Belum ada data barang pada kategori ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer Totals */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-[#580001] text-white font-bold text-xs">
                  <td colSpan={2} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    Total Nilai Harga Inventory (Masuk ke Akun COA):
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-amber-300">
                    {filteredItems.reduce((sum, i) => sum + Math.max(0, i.totalQty - i.usedOrSoldQty), 0)} unit/pcs
                  </td>
                  <td className="py-3.5 px-4"></td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-amber-300">
                    {formatIDR(
                      filteredItems.reduce(
                        (sum, i) => sum + Math.max(0, i.totalQty - i.usedOrSoldQty) * i.unitCost,
                        0
                      )
                    )}
                  </td>
                  {activeTab !== 'internal_use' && (
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-300">
                      {formatIDR(
                        filteredItems.reduce(
                          (sum, i) =>
                            sum +
                            (i.category === 'for_sale'
                              ? Math.max(0, i.totalQty - i.usedOrSoldQty) * (i.sellingPrice || 0)
                              : 0),
                          0
                        )
                      )}
                    </td>
                  )}
                  <td colSpan={2} className="py-3.5 px-4 text-right text-[10px] text-white/80 font-normal">
                    Otomatis Masuk ke Daftar Akun (Tanpa Jurnal)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ================= MODAL ADD / EDIT INVENTORY VALUATION ================= */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#580001]/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#580001] text-white">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#580001] text-sm sm:text-base">
                    {editingItem ? 'Edit Nilai Harga Barang Inventory' : 'Tambah Barang Inventory Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Nilai total harga sisa barang otomatis masuk ke Akun COA tanpa masuk ke Jurnal Umum.
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Pilih Kategori Inventory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleFormCategoryChange('for_sale')}
                  className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-start gap-2.5 ${
                    category === 'for_sale'
                      ? 'bg-[#580001]/5 border-[#580001]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      category === 'for_sale' ? 'bg-[#580001] text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">1. Barang untuk Dijual</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Masuk ke <strong>[1-1005] Persediaan Barang</strong>.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFormCategoryChange('internal_use')}
                  className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-start gap-2.5 ${
                    category === 'internal_use'
                      ? 'bg-slate-900/5 border-slate-800'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      category === 'internal_use' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">2. Barang Dipakai (Non-Jual)</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Masuk ke <strong>Perlengkapan / Peralatan</strong>.
                    </p>
                  </div>
                </button>
              </div>

              {/* Quick Fill from HPP Calculator if For Sale */}
              {category === 'for_sale' && savedHppArticles.length > 0 && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-[#580001]" />
                    <span>Ambil dari Kalkulator HPP:</span>
                  </span>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const art = savedHppArticles.find(a => a.id === e.target.value);
                      if (art) {
                        setName(art.productName);
                        setTotalQty(art.qty);
                        setUnitCost(art.hppPerPiece);
                        setSellingPrice(art.retailPrice);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="" disabled>
                      ⚡ Pilih Artikel HPP...
                    </option>
                    {savedHppArticles.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.productName} (HPP: {formatIDR(a.hppPerPiece)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase">
                  Nama Barang Inventory
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Kaos Polos Cotton Combed 24s / Plastik Packing"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase">Kelompok Barang</label>
                  <select
                    value={subCategory}
                    onChange={e => {
                      const val = e.target.value;
                      setSubCategory(val);
                      if (category === 'internal_use') {
                        if (val.toLowerCase().includes('peralatan')) {
                          setAccountCode('1-2001');
                          setUnit('unit');
                        } else {
                          setAccountCode('1-1006');
                          setUnit('pack');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold"
                  >
                    {(category === 'for_sale' ? FOR_SALE_SUBCATEGORIES : INTERNAL_USE_SUBCATEGORIES).map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase">Akun COA Tujuan</label>
                  <select
                    value={accountCode}
                    onChange={e => setAccountCode(e.target.value)}
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
              </div>

              {/* Quantities & Total Price Calculation */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">Total Masuk</label>
                    <input
                      type="number"
                      min={0}
                      value={totalQty}
                      onChange={e => setTotalQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">
                      {category === 'for_sale' ? 'Sudah Terjual' : 'Sudah Dipakai'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={totalQty}
                      value={usedOrSoldQty}
                      onChange={e => setUsedOrSoldQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-900 text-[11px] font-black mb-1">
                      {category === 'for_sale' ? 'Belum Terjual' : 'Sisa Dipakai'}
                    </label>
                    <div className="w-full px-3 py-2 bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-mono font-black text-amber-950">
                      {formRemainingQty} {unit}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">
                      {category === 'for_sale' ? 'Harga Modal / HPP Satuan (Rp)' : 'Harga Beli Satuan (Rp)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={unitCost || ''}
                      onChange={e => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  {category === 'for_sale' && (
                    <div>
                      <label className="block text-slate-600 text-[11px] font-bold mb-1">
                        Harga Jual Satuan (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={sellingPrice || ''}
                        onChange={e => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-[#580001] text-white p-3.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                      {category === 'for_sale'
                        ? `Nilai Total Harga Belum Terjual (${formRemainingQty} ${unit})`
                        : `Nilai Total Harga Sisa Barang Dipakai (${formRemainingQty} ${unit})`}
                    </span>
                    <span className="text-[11px] text-white/80">
                      Masuk ke [{accountCode}] {getAccountName(accountCode)}
                    </span>
                  </div>
                  <div className="font-mono font-black text-lg text-amber-300">{formatIDR(formRemainingValue)}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Nilai Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Hapus Barang Inventory</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">{deleteTarget.name}</p>
                <p className="text-xs text-slate-500">
                  Menghapus barang ini akan menyesuaikan nilai pada akun [{deleteTarget.accountCode}]{' '}
                  {getAccountName(deleteTarget.accountCode)}.
                </p>
              </div>
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
                    onDeleteInventory(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
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
