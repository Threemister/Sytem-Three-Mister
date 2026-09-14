/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Transaction } from './types';

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
