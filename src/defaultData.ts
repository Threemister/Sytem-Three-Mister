/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Transaction, SaleOrder, InventoryItem } from './types';

export const defaultAccounts: Account[] = [
  // AKTIVA
  { code: '1-1001', name: 'Kas', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Lancar' },
  { code: '1-1002', name: 'Bank BCA', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Lancar' },
  { code: '1-1003', name: 'Sea Bank', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Lancar' },
  { code: '1-1004', name: 'Piutang Dagang', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Lancar' },
  { code: '1-1005', name: 'Persediaan Barang', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Lancar' },
  { code: '1-1006', name: 'Perlengkapan', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Lancar' },
  { code: '1-2001', name: 'Peralatan', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Tetap' },
  { code: '1-2002', name: 'Akum. Penyusutan Peralatan', type: 'Aktiva', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Aktiva Tetap' },
  { code: '1-2003', name: 'Kendaraan', type: 'Aktiva', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Aktiva Tetap' },

  // KEWAJIBAN
  { code: '2-1001', name: 'Utang Dagang', type: 'Kewajiban', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Kewajiban Lancar' },
  { code: '2-1002', name: 'Utang Gaji', type: 'Kewajiban', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Kewajiban Lancar' },
  { code: '2-1003', name: 'Utang Pajak', type: 'Kewajiban', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Kewajiban Lancar' },
  { code: '2-2001', name: 'Utang Bank Jangka Panjang', type: 'Kewajiban', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Kewajiban Jangka Panjang' },

  // MODAL
  { code: '3-1001', name: 'Modal Pemilik', type: 'Modal', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Modal' },
  { code: '3-1002', name: 'Laba Ditahan', type: 'Modal', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Modal' },
  { code: '3-1003', name: 'Prive', type: 'Modal', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Modal' },

  // PENDAPATAN
  { code: '4-1001', name: 'Pendapatan Penjualan', type: 'Pendapatan', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Pendapatan Usaha' },
  { code: '4-1002', name: 'Pendapatan Jasa', type: 'Pendapatan', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Pendapatan Usaha' },
  { code: '4-1003', name: 'Pendapatan Lain-lain', type: 'Pendapatan', normalBalance: 'Kredit', initialBalance: 0, description: 'Kelompok: Pendapatan Lain' },

  // BEBAN
  { code: '5-1001', name: 'Harga Pokok Penjualan', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Pokok' },
  { code: '5-1002', name: 'Beban Gaji', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Operasional' },
  { code: '5-1003', name: 'Beban Sewa', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Operasional' },
  { code: '5-1004', name: 'Beban Listrik & Air', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Operasional' },
  { code: '5-1005', name: 'Beban Transportasi', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Operasional' },
  { code: '5-1006', name: 'Beban Pemasaran', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Operasional' },
  { code: '5-1007', name: 'Beban Penyusutan', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Operasional' },
  { code: '5-1008', name: 'Beban Administrasi', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Operasional' },
  { code: '5-1009', name: 'Beban Lain-lain', type: 'Beban', normalBalance: 'Debit', initialBalance: 0, description: 'Kelompok: Beban Lain' }
];

export const defaultTransactions: Transaction[] = [
  {
    id: 'TX-001',
    date: '2026-07-02',
    refNum: 'SLS-1001',
    description: 'Penjualan Retail Pakaian',
    debitAccount: '1-1001', // Kas
    creditAccount: '4-1001', // Pendapatan Penjualan
    amount: 7500000,
    createdAt: '2026-07-02T10:15:00Z'
  },
  {
    id: 'TX-002',
    date: '2026-07-03',
    refNum: 'HPP-1001',
    description: 'Pencatatan HPP Pakaian Terjual',
    debitAccount: '5-1001', // Harga Pokok Penjualan
    creditAccount: '1-1005', // Persediaan Barang
    amount: 2000000,
    createdAt: '2026-07-03T11:00:00Z'
  },
  {
    id: 'TX-003',
    date: '2026-07-05',
    refNum: 'EXP-1001',
    description: 'Pembelian Perlengkapan Kantor/Toko',
    debitAccount: '1-1006', // Perlengkapan
    creditAccount: '1-1001', // Kas
    amount: 650000,
    createdAt: '2026-07-05T14:30:00Z'
  },
  {
    id: 'TX-004',
    date: '2026-07-08',
    refNum: 'MKT-1001',
    description: 'Pembayaran Beban Pemasaran',
    debitAccount: '5-1006', // Beban Pemasaran
    creditAccount: '1-1002', // Bank BCA
    amount: 1500000,
    createdAt: '2026-07-08T09:00:00Z'
  },
  {
    id: 'TX-005',
    date: '2026-07-10',
    refNum: 'SLS-1002',
    description: 'Pendapatan Jasa Penjahitan Seragam',
    debitAccount: '1-1002', // Bank BCA
    creditAccount: '4-1002', // Pendapatan Jasa
    amount: 14000000,
    createdAt: '2026-07-10T16:20:00Z'
  },
  {
    id: 'TX-007',
    date: '2026-07-12',
    refNum: 'EXP-1002',
    description: 'Pembayaran Beban Listrik & Air',
    debitAccount: '5-1004', // Beban Listrik & Air
    creditAccount: '1-1001', // Kas
    amount: 1250000,
    createdAt: '2026-07-12T10:45:00Z'
  },
  {
    id: 'TX-008',
    date: '2026-07-14',
    refNum: 'PAY-1001',
    description: 'Pembayaran Beban Gaji',
    debitAccount: '5-1002', // Beban Gaji
    creditAccount: '1-1001', // Kas
    amount: 4500000,
    createdAt: '2026-07-14T18:00:00Z'
  },
  {
    id: 'TX-010',
    date: '2026-05-15',
    refNum: 'SLS-1003',
    description: 'Penjualan Batch Kaus Polo',
    debitAccount: '1-1002', // Bank BCA
    creditAccount: '4-1001', // Pendapatan Penjualan
    amount: 12000000,
    createdAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 'TX-011',
    date: '2026-05-16',
    refNum: 'HPP-1002',
    description: 'HPP Penjualan Kaus Polo',
    debitAccount: '5-1001', // HPP
    creditAccount: '1-1005', // Persediaan Barang
    amount: 4000000,
    createdAt: '2026-05-16T11:00:00Z'
  },
  {
    id: 'TX-012',
    date: '2026-05-20',
    refNum: 'MKT-1002',
    description: 'Beban Iklan Instagram Ads',
    debitAccount: '5-1006', // Beban Pemasaran
    creditAccount: '1-1001', // Kas
    amount: 1500000,
    createdAt: '2026-05-20T14:00:00Z'
  },
  {
    id: 'TX-013',
    date: '2026-06-10',
    refNum: 'SLS-1004',
    description: 'Penjualan Grosir Jaket Bomber',
    debitAccount: '1-1002', // Bank BCA
    creditAccount: '4-1001', // Pendapatan Penjualan
    amount: 18500000,
    createdAt: '2026-06-10T09:30:00Z'
  },
  {
    id: 'TX-014',
    date: '2026-06-12',
    refNum: 'HPP-1003',
    description: 'HPP Penjualan Jaket Bomber',
    debitAccount: '5-1001', // HPP
    creditAccount: '1-1005', // Persediaan Barang
    amount: 6000000,
    createdAt: '2026-06-12T10:00:00Z'
  },
  {
    id: 'TX-015',
    date: '2026-06-15',
    refNum: 'EXP-1003',
    description: 'Pembayaran Sewa Studio Ritel',
    debitAccount: '5-1003', // Beban Sewa
    creditAccount: '1-1002', // Bank BCA
    amount: 3000000,
    createdAt: '2026-06-15T15:00:00Z'
  },
  {
    id: 'TX-016',
    date: '2026-08-05',
    refNum: 'SLS-1005',
    description: 'Penjualan Pre-order Kaus Oversized',
    debitAccount: '1-1002', // Bank BCA
    creditAccount: '4-1001', // Pendapatan Penjualan
    amount: 22000000,
    createdAt: '2026-08-05T13:00:00Z'
  },
  {
    id: 'TX-017',
    date: '2026-08-07',
    refNum: 'HPP-1004',
    description: 'HPP Kaus Oversized',
    debitAccount: '5-1001', // HPP
    creditAccount: '1-1005', // Persediaan Barang
    amount: 7500000,
    createdAt: '2026-08-07T14:00:00Z'
  },
  {
    id: 'TX-018',
    date: '2026-08-10',
    refNum: 'MKT-1003',
    description: 'Beban Endorsement Influencer',
    debitAccount: '5-1006', // Beban Pemasaran
    creditAccount: '1-1001', // Kas
    amount: 2500000,
    createdAt: '2026-08-10T16:00:00Z'
  }
];

export const defaultSales: SaleOrder[] = [
  {
    id: 'SALE-001',
    orderDate: '2026-10-06',
    invoiceNum: 'SHP-261006-8821',
    channel: 'Shopee',
    customerName: 'rizky_pratama99',
    productName: 'Kaos Polos Cotton Combed 24s (Sablon Plastisol)',
    qty: 3,
    unitPrice: 165000,
    discountAmount: 45000,
    grossTransacted: 450000,
    marketplaceFee: 54000,
    netPayout: 396000,
    hppPerPiece: 58900,
    totalHpp: 176700,
    estimatedNetProfit: 219300,
    status: 'pending',
    targetAccountCode: '1-1003', // Sea Bank
    revenueAccountCode: '4-1001', // Pendapatan Penjualan
    feeAccountCode: '5-1008', // Beban Administrasi
    recordFeeSeparately: true,
    recordHppAuto: true,
    hppDebitAccountCode: '5-1001',
    hppCreditAccountCode: '1-1005',
    notes: 'Paket dalam pengiriman J&T Express, menunggu konfirmasi pesanan diterima pembeli.',
    createdAt: '2026-10-06T09:30:00Z'
  },
  {
    id: 'SALE-002',
    orderDate: '2026-10-07',
    invoiceNum: 'TTS-261007-4410',
    channel: 'TikTok Shop',
    customerName: 'dimas.streetwear',
    productName: 'Hoodie Fleece Cotton 330gsm (Heavyweight)',
    qty: 2,
    unitPrice: 325000,
    discountAmount: 50000,
    grossTransacted: 600000,
    marketplaceFee: 66000,
    netPayout: 534000,
    hppPerPiece: 132000,
    totalHpp: 264000,
    estimatedNetProfit: 270000,
    status: 'pending',
    targetAccountCode: '1-1002', // Bank BCA
    revenueAccountCode: '4-1001',
    feeAccountCode: '5-1008',
    recordFeeSeparately: true,
    recordHppAuto: true,
    hppDebitAccountCode: '5-1001',
    hppCreditAccountCode: '1-1005',
    notes: 'Order dari Live Streaming malam, barang sudah dikirim.',
    createdAt: '2026-10-07T14:15:00Z'
  },
  {
    id: 'SALE-003',
    orderDate: '2026-10-08',
    invoiceNum: 'LZD-261008-1092',
    channel: 'Lazada',
    customerName: 'andika_fashion',
    productName: 'Kaos Oversized Heavyweight 20s Boxy Fit',
    qty: 4,
    unitPrice: 185000,
    discountAmount: 40000,
    grossTransacted: 700000,
    marketplaceFee: 73500,
    netPayout: 626500,
    hppPerPiece: 68500,
    totalHpp: 274000,
    estimatedNetProfit: 352500,
    status: 'pending',
    targetAccountCode: '1-1002', // Bank BCA
    revenueAccountCode: '4-1001',
    feeAccountCode: '5-1008',
    recordFeeSeparately: true,
    recordHppAuto: true,
    hppDebitAccountCode: '5-1001',
    hppCreditAccountCode: '1-1005',
    notes: 'Menunggu penyelesaian otomatis sistem Lazada.',
    createdAt: '2026-10-08T08:00:00Z'
  },
  {
    id: 'SALE-004',
    orderDate: '2026-07-02',
    settledDate: '2026-07-02',
    invoiceNum: 'SLS-1001',
    channel: 'Offline / Toko',
    customerName: 'Pelanggan Walk-in Store',
    productName: 'Paket Penjualan Retail Pakaian Distro',
    qty: 50,
    unitPrice: 150000,
    discountAmount: 0,
    grossTransacted: 7500000,
    marketplaceFee: 0,
    netPayout: 7500000,
    hppPerPiece: 40000,
    totalHpp: 2000000,
    estimatedNetProfit: 5500000,
    status: 'settled',
    targetAccountCode: '1-1001', // Kas
    revenueAccountCode: '4-1001',
    feeAccountCode: '5-1008',
    recordFeeSeparately: false,
    recordHppAuto: true,
    hppDebitAccountCode: '5-1001',
    hppCreditAccountCode: '1-1005',
    linkedTransactionIds: ['TX-001', 'TX-002'],
    notes: 'Tunai langsung masuk Kas dan tercatat di Jurnal Umum.',
    createdAt: '2026-07-02T10:15:00Z'
  }
];

export const defaultInventory: InventoryItem[] = [
  // ================= KATEGORI 1: BARANG UNTUK DIJUAL (FOR SALE) =================
  {
    id: 'INV-SALE-001',
    sku: 'TM-LP-REG-SPL-BLK-01',
    name: 'Kaos Polos Cotton Combed 24s (Sablon Plastisol)',
    productSleeve: 'Lengan Pendek',
    designStyle: 'Regular Fit',
    designGraphic: 'Sablon Plastisol',
    productColor: 'Hitam',
    designNumber: '01',
    category: 'for_sale',
    subCategory: 'Kaos / T-Shirt',
    unit: 'pcs',
    totalQty: 120,
    usedOrSoldQty: 45,
    remainingQty: 75,
    unitCost: 58900,
    sellingPrice: 165000,
    totalRemainingValue: 75 * 58900, // 4.417.500
    accountCode: '1-1005', // Persediaan Barang
    location: 'Rak Gudang A1 • Etalase Shopee & TikTok',
    variants: [
      { id: 'V-101', variantName: 'S', skuCode: 'TM-LP-REG-SPL-BLK-01-S', totalQty: 20, usedOrSoldQty: 8, remainingQty: 12 },
      { id: 'V-102', variantName: 'M', skuCode: 'TM-LP-REG-SPL-BLK-01-M', totalQty: 35, usedOrSoldQty: 15, remainingQty: 20 },
      { id: 'V-103', variantName: 'L', skuCode: 'TM-LP-REG-SPL-BLK-01-L', totalQty: 35, usedOrSoldQty: 12, remainingQty: 23 },
      { id: 'V-104', variantName: 'XL', skuCode: 'TM-LP-REG-SPL-BLK-01-XL', totalQty: 20, usedOrSoldQty: 0, remainingQty: 20 },
      { id: 'V-105', variantName: 'XXL', skuCode: 'TM-LP-REG-SPL-BLK-01-XXL', totalQty: 10, usedOrSoldQty: 10, remainingQty: 0 }
    ],
    notes: 'Ukuran S, M, L, XL ready di rak gudang utama (XXL habis).',
    updatedAt: '2026-10-08T09:00:00Z'
  },
  {
    id: 'INV-SALE-002',
    sku: 'TM-LPJ-HVW-TYP-BLK-02',
    name: 'Hoodie Fleece Cotton 330gsm (Heavyweight)',
    productSleeve: 'Lengan Panjang',
    designStyle: 'Heavyweight',
    designGraphic: 'Typography',
    productColor: 'Hitam',
    designNumber: '02',
    category: 'for_sale',
    subCategory: 'Hoodie / Outerwear',
    unit: 'pcs',
    totalQty: 60,
    usedOrSoldQty: 22,
    remainingQty: 38,
    unitCost: 132000,
    sellingPrice: 325000,
    totalRemainingValue: 38 * 132000, // 5.016.000
    accountCode: '1-1005', // Persediaan Barang
    location: 'Rak Gudang B2 • Etalase Utama',
    variants: [
      { id: 'V-201', variantName: 'M', skuCode: 'TM-LPJ-HVW-TYP-BLK-02-M', totalQty: 20, usedOrSoldQty: 9, remainingQty: 11 },
      { id: 'V-202', variantName: 'L', skuCode: 'TM-LPJ-HVW-TYP-BLK-02-L', totalQty: 25, usedOrSoldQty: 8, remainingQty: 17 },
      { id: 'V-203', variantName: 'XL', skuCode: 'TM-LPJ-HVW-TYP-BLK-02-XL', totalQty: 15, usedOrSoldQty: 5, remainingQty: 10 }
    ],
    notes: 'Artikel best seller musim hujan, stok sisa 38 pcs belum terjual.',
    updatedAt: '2026-10-08T09:15:00Z'
  },
  {
    id: 'INV-SALE-003',
    sku: 'TM-LP-BXY-SMR-WHT-03',
    name: 'Kaos Oversized Heavyweight 20s Boxy Fit',
    productSleeve: 'Lengan Pendek',
    designStyle: 'Boxy Oversize',
    designGraphic: 'Samurai',
    productColor: 'Putih',
    designNumber: '03',
    category: 'for_sale',
    subCategory: 'Kaos / T-Shirt',
    unit: 'pcs',
    totalQty: 100,
    usedOrSoldQty: 36,
    remainingQty: 64,
    unitCost: 68500,
    sellingPrice: 185000,
    totalRemainingValue: 64 * 68500, // 4.384.000
    accountCode: '1-1005', // Persediaan Barang
    location: 'Rak Gudang A2 • Etalase Shopee, TikTok & Lazada',
    variants: [
      { id: 'V-301', variantName: 'S', skuCode: 'TM-LP-BXY-SMR-WHT-03-S', totalQty: 15, usedOrSoldQty: 15, remainingQty: 0 },
      { id: 'V-302', variantName: 'M', skuCode: 'TM-LP-BXY-SMR-WHT-03-M', totalQty: 30, usedOrSoldQty: 10, remainingQty: 20 },
      { id: 'V-303', variantName: 'L', skuCode: 'TM-LP-BXY-SMR-WHT-03-L', totalQty: 35, usedOrSoldQty: 7, remainingQty: 28 },
      { id: 'V-304', variantName: 'XL', skuCode: 'TM-LP-BXY-SMR-WHT-03-XL', totalQty: 20, usedOrSoldQty: 4, remainingQty: 16 }
    ],
    notes: 'Batch produksi ke-2 siap jual untuk etalase Shopee & TikTok.',
    updatedAt: '2026-10-08T09:30:00Z'
  },
  {
    id: 'INV-SALE-004',
    sku: 'TM-LP-WRK-BRD-NVY-04',
    name: 'Kemeja Workshirt Twill Canvas Bordir',
    productSleeve: 'Lengan Pendek',
    designStyle: 'Workshirt',
    designGraphic: 'Logo Bordir',
    productColor: 'Navy',
    designNumber: '04',
    category: 'for_sale',
    subCategory: 'Kemeja / Workshirt',
    unit: 'pcs',
    totalQty: 50,
    usedOrSoldQty: 15,
    remainingQty: 35,
    unitCost: 95000,
    sellingPrice: 235000,
    totalRemainingValue: 35 * 95000, // 3.325.000
    accountCode: '1-1005', // Persediaan Barang
    location: 'Rak Gudang C1 • Studio & Marketplace',
    variants: [
      { id: 'V-401', variantName: 'M', skuCode: 'TM-LP-WRK-BRD-NVY-04-M', totalQty: 15, usedOrSoldQty: 6, remainingQty: 9 },
      { id: 'V-402', variantName: 'L', skuCode: 'TM-LP-WRK-BRD-NVY-04-L', totalQty: 20, usedOrSoldQty: 5, remainingQty: 15 },
      { id: 'V-403', variantName: 'XL', skuCode: 'TM-LP-WRK-BRD-NVY-04-XL', totalQty: 15, usedOrSoldQty: 4, remainingQty: 11 }
    ],
    notes: 'Stok etalase studio & marketplace.',
    updatedAt: '2026-10-08T09:45:00Z'
  },

  // ================= KATEGORI 2: BARANG UNTUK DIPAKAI / TIDAK BISA DIJUAL (INTERNAL USE) =================
  {
    id: 'INV-USE-001',
    sku: 'OP-PZMP-100-PCK',
    name: 'Plastik Ziplock Matte & Polymailer Packing (100 pcs/pack)',
    category: 'internal_use',
    subCategory: 'Perlengkapan Packing (Habis Pakai)',
    unit: 'pack',
    totalQty: 25,
    usedOrSoldQty: 9,
    remainingQty: 16,
    unitCost: 55000,
    sellingPrice: 0,
    totalRemainingValue: 16 * 55000, // 880.000
    accountCode: '1-1006', // Perlengkapan
    location: 'Meja Packing Gudang',
    variants: [
      { id: 'V-501', variantName: 'Ziplock Matte L', skuCode: 'OP-PZMP-100-PCK-ZPL', totalQty: 15, usedOrSoldQty: 5, remainingQty: 10 },
      { id: 'V-502', variantName: 'Polymailer Hitam', skuCode: 'OP-PZMP-100-PCK-PLY', totalQty: 10, usedOrSoldQty: 4, remainingQty: 6 }
    ],
    notes: 'Khusus dipakai untuk kemas paket orderan, tidak untuk dijual.',
    updatedAt: '2026-10-08T10:00:00Z'
  },
  {
    id: 'INV-USE-002',
    sku: 'OP-KLRT-100-LKB',
    name: 'Kertas Label Resi Thermal 100x150mm & Lakban Pengiriman',
    category: 'internal_use',
    subCategory: 'Perlengkapan Toko (Habis Pakai)',
    unit: 'roll',
    totalQty: 40,
    usedOrSoldQty: 15,
    remainingQty: 25,
    unitCost: 22000,
    sellingPrice: 0,
    totalRemainingValue: 25 * 22000, // 550.000
    accountCode: '1-1006', // Perlengkapan
    location: 'Meja Admin Resi',
    variants: [
      { id: 'V-601', variantName: 'Label Thermal A6', skuCode: 'OP-KLRT-100-LKB-LBL', totalQty: 25, usedOrSoldQty: 10, remainingQty: 15 },
      { id: 'V-602', variantName: 'Lakban Bening', skuCode: 'OP-KLRT-100-LKB-LKB', totalQty: 15, usedOrSoldQty: 5, remainingQty: 10 }
    ],
    notes: 'Stok perlengkapan cetak resi harian admin gudang.',
    updatedAt: '2026-10-08T10:10:00Z'
  },
  {
    id: 'INV-USE-003',
    sku: 'OP-SUPS-SHK-DSP',
    name: 'Steamer Uap Pakaian Standing + Set Hanger Kayu Display',
    category: 'internal_use',
    subCategory: 'Peralatan Studio & Display',
    unit: 'set',
    totalQty: 2,
    usedOrSoldQty: 0,
    remainingQty: 2,
    unitCost: 950000,
    sellingPrice: 0,
    totalRemainingValue: 2 * 950000, // 1.900.000
    accountCode: '1-2001', // Peralatan
    location: 'Studio Live & Showroom',
    variants: [
      { id: 'V-701', variantName: 'Unit Studio', skuCode: 'OP-SUPS-SHK-DSP-STD', totalQty: 2, usedOrSoldQty: 0, remainingQty: 2 }
    ],
    notes: 'Inventaris operasional toko & live streaming, tidak dijual.',
    updatedAt: '2026-10-08T10:20:00Z'
  },
  {
    id: 'INV-USE-004',
    sku: 'OP-PTBR-RBG-5SS',
    name: 'Printer Thermal Bluetooth Resi + Rak Besi Gudang 5 Susun',
    category: 'internal_use',
    subCategory: 'Peralatan Gudang & Admin',
    unit: 'unit',
    totalQty: 3,
    usedOrSoldQty: 0,
    remainingQty: 3,
    unitCost: 1150000,
    sellingPrice: 0,
    totalRemainingValue: 3 * 1150000, // 3.450.000
    accountCode: '1-2001', // Peralatan
    location: 'Ruang Admin & Gudang Utama',
    variants: [
      { id: 'V-801', variantName: 'Unit Gudang', skuCode: 'OP-PTBR-RBG-5SS-GDG', totalQty: 3, usedOrSoldQty: 0, remainingQty: 3 }
    ],
    notes: 'Aset inventaris operasional gudang THREE MISTER.',
    updatedAt: '2026-10-08T10:30:00Z'
  }
];


