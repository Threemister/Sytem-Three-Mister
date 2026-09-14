/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Transaction, AccountType, NormalBalance, SavedCalculation, FinancialSummaryData } from './types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Helper to format currency for sheet readable cells
function formatRupiahText(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Helper to make Google API requests
async function makeRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT',
  token: string,
  body?: any
) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // fallback to statusText
    }
    console.error(`Google Sheets API Error [${response.status}]:`, errorDetail);
    if (response.status === 403 || response.status === 401) {
      throw new Error(`Izin Google Sheets (${response.status}): ${errorDetail}. Silakan keluar dan login ulang dengan akun Google Anda.`);
    }
    throw new Error(`Google Sheets API Error [${response.status}]: ${errorDetail}`);
  }

  return response.json();
}

/**
 * Membuat Spreadsheet Google baru secara otomatis dengan seluruh sheet
 * (AKUN, TRANSAKSI, HPP_PRODUK, RINGKASAN_KEUANGAN) dalam 1-klik.
 */
export async function createNewSpreadsheet(
  title: string,
  token: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheetTitle = title || 'THREE MISTER - Pembukuan & Akuntansi';
  const createPayload = {
    properties: {
      title: sheetTitle,
    },
    sheets: [
      { properties: { title: 'AKUN', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'TRANSAKSI', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'HPP_PRODUK', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'RINGKASAN_KEUANGAN', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const err = await response.json();
      if (err?.error?.message) msg = err.error.message;
    } catch {}
    throw new Error(`Gagal membuat spreadsheet baru: ${msg}`);
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write default headers
  await writeAllHeaders(spreadsheetId, token);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Memastikan semua sheet yang dibutuhkan website (AKUN, TRANSAKSI, HPP_PRODUK, RINGKASAN_KEUANGAN)
 * otomatis tersedia di Google Sheets. Jika ada sheet yang belum ada, akan otomatis ditambahkan (addSheet).
 */
export async function ensureSheetsExist(spreadsheetId: string, token: string): Promise<void> {
  const meta = await makeRequest(`/${spreadsheetId}`, 'GET', token);
  const existingTitles: string[] = meta.sheets?.map((s: any) => s.properties?.title) || [];

  const requiredSheets = ['AKUN', 'TRANSAKSI', 'HPP_PRODUK', 'RINGKASAN_KEUANGAN'];
  const missingSheets = requiredSheets.filter(title => !existingTitles.includes(title));

  if (missingSheets.length > 0) {
    const requests = missingSheets.map(title => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));

    await makeRequest(`/${spreadsheetId}:batchUpdate`, 'POST', token, { requests });
  }

  // Write headers for any missing or newly added sheets
  await writeAllHeaders(spreadsheetId, token);
}

// Alias for backward compatibility
export const initializeSpreadsheet = ensureSheetsExist;

async function writeAllHeaders(spreadsheetId: string, token: string) {
  // 1. Headers AKUN
  await writeHeaders(
    spreadsheetId,
    'AKUN',
    ['Kode Akun', 'Nama Akun', 'Tipe Akun', 'Saldo Normal', 'Saldo Awal (Rp)', 'Deskripsi'],
    token
  );

  // 2. Headers TRANSAKSI
  await writeHeaders(
    spreadsheetId,
    'TRANSAKSI',
    ['ID Transaksi', 'Tanggal', 'No Referensi', 'Keterangan', 'Akun Debit', 'Akun Kredit', 'Jumlah (Rp)', 'Waktu Dibuat'],
    token
  );

  // 3. Headers HPP_PRODUK
  await writeHeaders(
    spreadsheetId,
    'HPP_PRODUK',
    [
      'ID Artikel',
      'Nama Produk / Artikel',
      'Batch Qty (Pcs)',
      'Tipe Bahan',
      'Biaya Bahan Baku (Rp)',
      'Biaya Sablon/Bordir (Rp)',
      'Biaya Jahit/CMT (Rp)',
      'Biaya Aksesoris/Label (Rp)',
      'Biaya Kemasan (Rp)',
      'Biaya Lainnya (Rp)',
      'Total Biaya Batch (Rp)',
      'HPP per Pcs (Rp)',
      'Target Margin',
      'Harga Jual Retail (Rp)',
      'Harga Jual Grosir (Rp)',
      'Patokan Utama (Benchmark)',
      'Catatan',
      'Waktu Dibuat'
    ],
    token
  );

  // 4. Headers RINGKASAN_KEUANGAN
  await writeHeaders(
    spreadsheetId,
    'RINGKASAN_KEUANGAN',
    ['Indikator Keuangan', 'Nilai / Status', 'Keterangan Analisis'],
    token
  );
}

async function writeHeaders(spreadsheetId: string, sheetTitle: string, headers: string[], token: string) {
  try {
    const response = await makeRequest(`/${spreadsheetId}/values/${sheetTitle}!A1:Z1`, 'GET', token);
    const values = response.values || [];
    
    if (values.length === 0 || values[0].length === 0) {
      await makeRequest(
        `/${spreadsheetId}/values/${sheetTitle}!A1?valueInputOption=USER_ENTERED`,
        'PUT',
        token,
        { values: [headers] }
      );
    }
  } catch (e) {
    console.warn(`Could not verify/write headers for ${sheetTitle}:`, e);
  }
}

/**
 * Menyimpan seluruh data Akun ke Google Sheets
 */
export async function pushAccountsToSheets(
  spreadsheetId: string,
  accounts: Account[],
  token: string
): Promise<void> {
  // Clear old rows
  await makeRequest(`/${spreadsheetId}/values/AKUN!A2:Z1000:clear`, 'POST', token);

  const rows = accounts.map(acc => [
    acc.code,
    acc.name,
    acc.type,
    acc.normalBalance,
    acc.initialBalance,
    acc.description || ''
  ]);

  if (rows.length === 0) return;

  await makeRequest(
    `/${spreadsheetId}/values/AKUN!A2?valueInputOption=USER_ENTERED`,
    'PUT',
    token,
    { values: rows }
  );
}

/**
 * Menarik seluruh data Akun dari Google Sheets
 */
export async function pullAccountsFromSheets(
  spreadsheetId: string,
  token: string
): Promise<Account[]> {
  try {
    const response = await makeRequest(`/${spreadsheetId}/values/AKUN!A2:F1000`, 'GET', token);
    const rows = response.values || [];

    return rows.map((row: any) => {
      let rawType = row[2] || 'Aktiva';
      if (rawType === 'Aset') rawType = 'Aktiva';
      if (rawType === 'Ekuitas') rawType = 'Modal';
      return {
        code: row[0] || '',
        name: row[1] || '',
        type: rawType as AccountType,
        normalBalance: (row[3] as NormalBalance) || 'Debit',
        initialBalance: parseFloat(row[4]) || 0,
        description: row[5] || ''
      };
    }).filter((acc: Account) => acc.code && acc.name);
  } catch (err) {
    console.error('Failed to pull accounts:', err);
    return [];
  }
}

/**
 * Menyimpan seluruh data Transaksi ke Google Sheets
 */
export async function pushTransactionsToSheets(
  spreadsheetId: string,
  transactions: Transaction[],
  token: string
): Promise<void> {
  await makeRequest(`/${spreadsheetId}/values/TRANSAKSI!A2:Z10000:clear`, 'POST', token);

  const rows = transactions.map(trx => [
    trx.id,
    trx.date,
    trx.refNum,
    trx.description,
    trx.debitAccount,
    trx.creditAccount,
    trx.amount,
    trx.createdAt
  ]);

  if (rows.length === 0) return;

  await makeRequest(
    `/${spreadsheetId}/values/TRANSAKSI!A2?valueInputOption=USER_ENTERED`,
    'PUT',
    token,
    { values: rows }
  );
}

/**
 * Menarik seluruh data Transaksi dari Google Sheets
 */
export async function pullTransactionsFromSheets(
  spreadsheetId: string,
  token: string
): Promise<Transaction[]> {
  try {
    const response = await makeRequest(`/${spreadsheetId}/values/TRANSAKSI!A2:H10000`, 'GET', token);
    const rows = response.values || [];

    return rows.map((row: any) => ({
      id: row[0] || '',
      date: row[1] || '',
      refNum: row[2] || '',
      description: row[3] || '',
      debitAccount: row[4] || '',
      creditAccount: row[5] || '',
      amount: parseFloat(row[6]) || 0,
      createdAt: row[7] || ''
    })).filter((trx: Transaction) => trx.id && trx.debitAccount && trx.creditAccount);
  } catch (err) {
    console.error('Failed to pull transactions:', err);
    return [];
  }
}

/**
 * Menyimpan seluruh data Kalkulasi & Patokan HPP Produk ke Google Sheets
 */
export async function pushHPPToSheets(
  spreadsheetId: string,
  hppCalcs: SavedCalculation[],
  token: string
): Promise<void> {
  try {
    await makeRequest(`/${spreadsheetId}/values/HPP_PRODUK!A2:Z2000:clear`, 'POST', token);

    const rows = hppCalcs.map(c => [
      c.id,
      c.productName,
      c.qty,
      c.rawMaterialType === 'kain' ? 'Kain Roll (CMT)' : c.rawMaterialType === 'both' ? 'Kombinasi' : 'Baju Jadi',
      c.fabricCost,
      c.printCost || 0,
      c.cmtCost || 0,
      c.accessoriesCost || 0,
      c.packagingCost || 0,
      c.otherCost || 0,
      c.totalCost,
      c.hppPerPiece,
      `${c.targetMargin}%`,
      c.retailPrice,
      c.wholesalePrice || 0,
      c.isBenchmark ? '⭐ BENCHMARK UTAMA' : 'Kalkulasi Artikel',
      c.notes || '',
      c.createdAt || ''
    ]);

    if (rows.length === 0) return;

    await makeRequest(
      `/${spreadsheetId}/values/HPP_PRODUK!A2?valueInputOption=USER_ENTERED`,
      'PUT',
      token,
      { values: rows }
    );
  } catch (err) {
    console.error('Failed to push HPP to sheets:', err);
  }
}

/**
 * Menarik data HPP dari Google Sheets
 */
export async function pullHPPFromSheets(
  spreadsheetId: string,
  token: string
): Promise<SavedCalculation[]> {
  try {
    const response = await makeRequest(`/${spreadsheetId}/values/HPP_PRODUK!A2:R2000`, 'GET', token);
    const rows = response.values || [];

    return rows.map((row: any) => {
      const isBench = (row[15] || '').toString().toUpperCase().includes('BENCHMARK') || (row[15] || '').toString().toUpperCase() === 'YA';
      const marginRaw = (row[12] || '60').toString().replace('%', '').trim();
      return {
        id: row[0] || `HPP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productName: row[1] || 'Artikel Pakaian',
        qty: parseInt(row[2]) || 100,
        rawMaterialType: (row[3] || '').includes('Kain') ? 'kain' : (row[3] || '').includes('Kombinasi') ? 'both' : 'baju_jadi',
        fabricCost: parseFloat(row[4]) || 0,
        printCost: parseFloat(row[5]) || 0,
        cmtCost: parseFloat(row[6]) || 0,
        accessoriesCost: parseFloat(row[7]) || 0,
        packagingCost: parseFloat(row[8]) || 0,
        otherCost: parseFloat(row[9]) || 0,
        totalCost: parseFloat(row[10]) || 0,
        hppPerPiece: parseFloat(row[11]) || 0,
        targetMargin: parseFloat(marginRaw) || 60,
        retailPrice: parseFloat(row[13]) || 0,
        wholesalePrice: parseFloat(row[14]) || 0,
        isBenchmark: isBench,
        notes: row[16] || '',
        createdAt: row[17] || ''
      };
    }).filter((c: SavedCalculation) => c.productName && c.hppPerPiece > 0);
  } catch (err) {
    console.error('Failed to pull HPP from sheets:', err);
    return [];
  }
}

/**
 * Menyimpan Ringkasan Eksekutif Keuangan Real-time ke Google Sheets
 */
export async function pushSummaryToSheets(
  spreadsheetId: string,
  summary: FinancialSummaryData,
  token: string
): Promise<void> {
  try {
    await makeRequest(`/${spreadsheetId}/values/RINGKASAN_KEUANGAN!A2:Z100:clear`, 'POST', token);

    const rows = [
      ['Total Pendapatan Penjualan', formatRupiahText(summary.totalRevenue), 'Total penerimaan dari penjualan produk clothing'],
      ['Total Harga Pokok Penjualan (HPP)', formatRupiahText(summary.totalHPP), 'Beban pokok produksi produk pakaian yang terjual'],
      ['Laba Kotor (Gross Profit)', formatRupiahText(summary.grossProfit), 'Pendapatan dikurangi HPP produk'],
      ['Total Beban Operasional', formatRupiahText(summary.totalExpenses), 'Beban sewa, gaji, promosi, & utilitas operasional'],
      ['Laba Bersih Usaha (Net Profit)', formatRupiahText(summary.netProfit), summary.netProfit >= 0 ? 'Surplus laba bersih operasional' : 'Defisit operasional saat ini'],
      ['Total Saldo Kas & Bank', formatRupiahText(summary.totalCash), 'Likuiditas dana cair di kas dan rekening perbankan'],
      ['Total Piutang Usaha', formatRupiahText(summary.totalReceivables), 'Tagihan penjualan dan kredit pelanggan berjalan'],
      ['Total Persediaan Barang', formatRupiahText(summary.totalInventory), 'Nilai persediaan baju jadi, kain roll, & aksesoris'],
      ['Total Aset / Aktiva', formatRupiahText(summary.totalAssets), 'Total seluruh kekayaan dan aset bisnis'],
      ['Total Kewajiban / Hutang', formatRupiahText(summary.totalLiabilities), 'Kewajiban hutang usaha jangka pendek dan panjang'],
      ['Total Ekuitas / Modal', formatRupiahText(summary.totalEquity), 'Total modal disetor dan saldo laba yang ditahan'],
      ['Status Keseimbangan Neraca Saldo', summary.isTrialBalanced ? 'SEIMBANG (BALANCED)' : `SELISIH ${formatRupiahText(summary.trialBalanceDiff)}`, summary.isTrialBalanced ? 'Posisi total debit dan kredit klop sempurna' : 'Terdapat selisih nominal debit dan kredit'],
      ['Terakhir Disinkronkan', summary.lastUpdated, 'Timestamp sinkronisasi real-time otomatis dari website'],
    ];

    await makeRequest(
      `/${spreadsheetId}/values/RINGKASAN_KEUANGAN!A2?valueInputOption=USER_ENTERED`,
      'PUT',
      token,
      { values: rows }
    );
  } catch (err) {
    console.error('Failed to push financial summary to sheets:', err);
  }
}

/**
 * Menyimpan seluruh data sistem (Akun, Transaksi, HPP, Ringkasan) secara lengkap ke Google Sheets
 */
export async function pushAllDataToSheets(
  spreadsheetId: string,
  payload: {
    accounts: Account[];
    transactions: Transaction[];
    hppCalcs?: SavedCalculation[];
    summary?: FinancialSummaryData;
  },
  token: string
): Promise<void> {
  // 1. Ensure all sheets (AKUN, TRANSAKSI, HPP_PRODUK, RINGKASAN_KEUANGAN) exist
  await ensureSheetsExist(spreadsheetId, token);

  // 2. Push accounts
  await pushAccountsToSheets(spreadsheetId, payload.accounts, token);

  // 3. Push transactions
  await pushTransactionsToSheets(spreadsheetId, payload.transactions, token);

  // 4. Push HPP if present
  if (payload.hppCalcs && payload.hppCalcs.length > 0) {
    await pushHPPToSheets(spreadsheetId, payload.hppCalcs, token);
  }

  // 5. Push Summary if present
  if (payload.summary) {
    await pushSummaryToSheets(spreadsheetId, payload.summary, token);
  }
}
