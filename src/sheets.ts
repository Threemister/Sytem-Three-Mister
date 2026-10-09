/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Account,
  Transaction,
  AccountType,
  NormalBalance,
  SavedCalculation,
  FinancialSummaryData,
  SaleOrder,
  SaleChannel,
  SaleStatus,
  InventoryItem,
  InventoryCategory,
  InventoryVariantStock,
  ProductAvailabilityStatus,
  MarketplacePricingHistory
} from './types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface CustomFeatureSheet {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export const ALL_FEATURE_SHEET_DEFINITIONS: { title: string; headers: string[] }[] = [
  {
    title: 'AKUN',
    headers: ['Kode Akun', 'Nama Akun', 'Tipe Akun', 'Saldo Normal', 'Saldo Awal (Rp)', 'Deskripsi']
  },
  {
    title: 'STOCK_SKU',
    headers: [
      'ID Barang',
      'Kode SKU Induk',
      'Nama Produk / Artikel',
      'Produk (Lengan)',
      'Style Desain',
      'Gambar Desain',
      'Warna Produk',
      'Nomor Desain',
      'Kelompok Produk',
      'Satuan',
      'Stok Masuk',
      'Terjual / Terpakai',
      'Sisa Stok Tersedia (Siap Jual)',
      'Stock Tidak Terhitung (Tidak Dijual)',
      'Status Ketersediaan Produk',
      'Rincian Varian & Sub-SKU',
      'Lokasi Gudang / Etalase',
      'Catatan',
      'Terakhir Diupdate'
    ]
  },
  {
    title: 'INVENTORY',
    headers: [
      'ID Barang',
      'Kode SKU',
      'Nama Barang / Artikel',
      'Kategori Inventory',
      'Kelompok Barang',
      'Satuan',
      'Total Stok Masuk',
      'Sudah Terjual / Terpakai',
      'Sisa Belum Terjual / Sisa Pakai',
      'Status Ketersediaan',
      'HPP / Harga Perolehan Satuan (Rp)',
      'Harga Jual Etalase (Rp)',
      'Total Nilai Belum Terjual / Sisa Pakai (Rp)',
      'Kode Akun COA',
      'Lokasi Penyimpanan',
      'Catatan',
      'Terakhir Diupdate'
    ]
  },
  {
    title: 'PENJUALAN',
    headers: [
      'ID Pesanan',
      'Tanggal Pesanan',
      'Tanggal Dana Cair',
      'No Invoice / Pesanan',
      'Channel / Platform',
      'Nama Pelanggan',
      'Nama Produk / Artikel',
      'Qty (Pcs)',
      'Harga Jual Satuan (Rp)',
      'Diskon Toko (Rp)',
      'Omset Pembeli (Rp)',
      'Potongan Admin Marketplace (Rp)',
      'Dana Bersih Cair / Net Payout (Rp)',
      'HPP per Pcs (Rp)',
      'Total HPP (Rp)',
      'Estimasi Laba Bersih (Rp)',
      'Status Pencairan',
      'Kode Akun Kas/Bank Tujuan',
      'Kode Akun Pendapatan',
      'Kode Akun Beban Admin',
      'Catatan',
      'Waktu Dibuat'
    ]
  },
  {
    title: 'TRANSAKSI',
    headers: [
      'ID Transaksi',
      'Tanggal',
      'No Referensi',
      'Keterangan',
      'Akun Debit',
      'Akun Kredit',
      'Jumlah (Rp)',
      'Waktu Dibuat'
    ]
  },
  {
    title: 'HPP_PRODUK',
    headers: [
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
    ]
  },
  {
    title: 'HARGA_MARKETPLACE',
    headers: [
      'ID Simulasi',
      'Nama Produk / Artikel',
      'HPP per Pcs (Rp)',
      'Mode Kalkulasi',
      'Target Laba Bersih (Rp)',
      'Harga Jual Etalase / Transaksi (Rp)',
      'Tanggal Disimpan'
    ]
  },
  {
    title: 'RINGKASAN_KEUANGAN',
    headers: ['Indikator Keuangan & Operasional', 'Nilai / Status', 'Keterangan Analisis']
  }
];

// Helper to format currency for sheet readable cells
function formatRupiahText(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Helper to resolve availability status of an InventoryItem
function resolveItemAvailability(item: InventoryItem): ProductAvailabilityStatus {
  if (item.availabilityStatus) return item.availabilityStatus;
  if (item.category === 'internal_use') return 'not_for_sale';
  const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
  if (item.isAvailable !== undefined) {
    return item.isAvailable && rem > 0 ? 'available' : 'unavailable';
  }
  return rem > 0 ? 'available' : 'unavailable';
}

function formatAvailabilityLabel(status: ProductAvailabilityStatus): string {
  if (status === 'not_for_sale') return 'PRODUK TIDAK DIJUAL';
  if (status === 'available') return 'TERSEDIA';
  return 'TIDAK TERSEDIA / HABIS';
}

function parseAvailabilityLabel(raw: string, category: InventoryCategory, remQty: number): ProductAvailabilityStatus {
  const up = (raw || '').toUpperCase().trim();
  if (up.includes('TIDAK DIJUAL') || up.includes('NOT_FOR_SALE') || category === 'internal_use') {
    return 'not_for_sale';
  }
  if (up.includes('TIDAK TERSEDIA') || up.includes('HABIS') || up.includes('UNAVAILABLE')) {
    return 'unavailable';
  }
  if (up.includes('TERSEDIA') || up.includes('AVAILABLE')) {
    return 'available';
  }
  return remQty > 0 ? 'available' : 'unavailable';
}

function serializeVariantsForSheet(variants?: InventoryVariantStock[]): string {
  if (!variants || variants.length === 0) return '';
  return variants
    .map(v => {
      const rem = Math.max(0, v.totalQty - v.usedOrSoldQty);
      const st = v.isAvailable !== false && rem > 0 ? 'Tersedia' : 'Habis';
      return `${v.variantName} [${v.skuCode}] (Masuk:${v.totalQty}, Keluar:${v.usedOrSoldQty}, Sisa:${rem}, ${st})`;
    })
    .join(' | ');
}

function parseVariantsFromSheet(raw: string, parentSku: string): InventoryVariantStock[] | undefined {
  if (!raw || !raw.trim()) return undefined;
  const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;

  return parts.map((part, idx) => {
    // Format: Size M [TM-LP-01-M] (Masuk:30, Keluar:10, Sisa:20, Tersedia)
    const nameMatch = part.match(/^([^\[\(]+)/);
    const skuMatch = part.match(/\[([^\]]+)\]/);
    const masukMatch = part.match(/Masuk:\s*(\d+)/i);
    const keluarMatch = part.match(/Keluar:\s*(\d+)/i);
    const sisaMatch = part.match(/Sisa:\s*(\d+)/i);
    const isHabis = /Habis|Tidak Tersedia/i.test(part);

    const variantName = nameMatch ? nameMatch[1].trim() : `Varian ${idx + 1}`;
    const skuCode = skuMatch ? skuMatch[1].trim() : `${parentSku}-${idx + 1}`;
    const totalQty = masukMatch ? parseInt(masukMatch[1], 10) || 0 : 0;
    const usedOrSoldQty = keluarMatch ? parseInt(keluarMatch[1], 10) || 0 : 0;
    const remainingQty = sisaMatch ? parseInt(sisaMatch[1], 10) || Math.max(0, totalQty - usedOrSoldQty) : Math.max(0, totalQty - usedOrSoldQty);

    return {
      id: `VAR-SH-${Date.now()}-${idx}`,
      variantName,
      skuCode,
      totalQty,
      usedOrSoldQty,
      remainingQty,
      isAvailable: !isHabis && remainingQty > 0
    };
  });
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
    console.warn(`Google Sheets API Note [${response.status}]:`, errorDetail);
    if (response.status === 403 || response.status === 401) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('threemister_oauth_token');
        } catch {}
        window.dispatchEvent(new CustomEvent('google_auth_expired', {
          detail: { status: response.status, message: errorDetail }
        }));
      }
      throw new Error(`Izin Google Sheets (${response.status}): ${errorDetail}. Silakan keluar dan login ulang dengan akun Google Anda.`);
    }
    throw new Error(`Google Sheets API Error [${response.status}]: ${errorDetail}`);
  }

  return response.json();
}

/**
 * Membuat Spreadsheet Google baru secara otomatis dengan seluruh sheet fitur
 * (AKUN, STOCK_SKU, INVENTORY, PENJUALAN, TRANSAKSI, HPP_PRODUK, HARGA_MARKETPLACE, RINGKASAN_KEUANGAN) dalam 1-klik.
 */
export async function createNewSpreadsheet(
  title: string,
  token: string,
  extraSheets?: CustomFeatureSheet[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheetTitle = title || 'THREE MISTER - Pembukuan & Akuntansi';
  const allDefs = [
    ...ALL_FEATURE_SHEET_DEFINITIONS,
    ...(extraSheets || []).map(s => ({ title: s.title, headers: s.headers }))
  ];

  const createPayload = {
    properties: {
      title: sheetTitle,
    },
    sheets: allDefs.map(def => ({
      properties: {
        title: def.title,
        gridProperties: { frozenRowCount: 1 }
      }
    })),
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

  // Write default headers for all feature sheets
  await writeAllHeaders(spreadsheetId, token, extraSheets);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Memastikan semua sheet fitur yang dibutuhkan website
 * (AKUN, STOCK_SKU, INVENTORY, PENJUALAN, TRANSAKSI, HPP_PRODUK, HARGA_MARKETPLACE, RINGKASAN_KEUANGAN, beserta sheet fitur baru)
 * otomatis tersedia di Google Sheets. Jika ada sheet fitur baru yang belum ada, otomatis ditambahkan (addSheet).
 */
export async function ensureSheetsExist(
  spreadsheetId: string,
  token: string,
  extraSheets?: CustomFeatureSheet[]
): Promise<string[]> {
  const meta = await makeRequest(`/${spreadsheetId}`, 'GET', token);
  const existingTitles: string[] = meta.sheets?.map((s: any) => s.properties?.title) || [];

  const requiredTitles = [
    ...ALL_FEATURE_SHEET_DEFINITIONS.map(d => d.title),
    ...(extraSheets || []).map(s => s.title)
  ];

  const missingSheets = requiredTitles.filter(title => !existingTitles.includes(title));

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

  // Write/update headers for all sheets (including newly added columns when features evolve)
  await writeAllHeaders(spreadsheetId, token, extraSheets);

  return missingSheets;
}

// Alias for backward compatibility
export const initializeSpreadsheet = ensureSheetsExist;

async function writeAllHeaders(
  spreadsheetId: string,
  token: string,
  extraSheets?: CustomFeatureSheet[]
) {
  const allDefs = [
    ...ALL_FEATURE_SHEET_DEFINITIONS,
    ...(extraSheets || []).map(s => ({ title: s.title, headers: s.headers }))
  ];

  // Use batchUpdate on values so all sheet headers are updated cleanly & atomically in 1 request
  try {
    const dataPayload = allDefs.map(def => ({
      range: `${def.title}!A1`,
      values: [def.headers]
    }));

    await makeRequest(
      `/${spreadsheetId}/values:batchUpdate`,
      'POST',
      token,
      {
        valueInputOption: 'USER_ENTERED',
        data: dataPayload
      }
    );
  } catch (e) {
    // Fallback to individual header updates if batchUpdate fails
    for (const def of allDefs) {
      await writeHeaders(spreadsheetId, def.title, def.headers, token);
    }
  }
}

async function writeHeaders(spreadsheetId: string, sheetTitle: string, headers: string[], token: string) {
  try {
    const response = await makeRequest(`/${spreadsheetId}/values/${sheetTitle}!A1:AZ1`, 'GET', token);
    const values = response.values || [];
    const currentRow = values[0] || [];

    const needsUpdate =
      currentRow.length !== headers.length ||
      headers.some((h, idx) => currentRow[idx] !== h);

    if (needsUpdate) {
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
 * Menyimpan seluruh data Akun ke Google Sheets (Sheet: AKUN)
 */
export async function pushAccountsToSheets(
  spreadsheetId: string,
  accounts: Account[],
  token: string
): Promise<void> {
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
 * Menarik seluruh data Akun dari Google Sheets (Sheet: AKUN)
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
  } catch (err: any) {
    if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
      throw err;
    }
    console.warn('Notice when pulling accounts from sheets:', err);
    return [];
  }
}

/**
 * Menyimpan data Kode SKU Otomatis, Jumlah Produk & Status Ketersediaan Stock ke Google Sheets (Sheet: STOCK_SKU)
 */
export async function pushStockSkuToSheets(
  spreadsheetId: string,
  inventory: InventoryItem[],
  token: string
): Promise<void> {
  try {
    await makeRequest(`/${spreadsheetId}/values/STOCK_SKU!A2:Z5000:clear`, 'POST', token);

    const rows = inventory.map(item => {
      const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
      const status = resolveItemAvailability(item);
      const countedStock = status === 'not_for_sale' ? 0 : rem;
      const uncountedStock = status === 'not_for_sale' ? rem : 0;

      return [
        item.id,
        item.sku,
        item.name,
        item.productSleeve || (item.category === 'for_sale' ? 'Lengan Pendek' : '-'),
        item.designStyle || (item.category === 'for_sale' ? 'Oversize' : '-'),
        item.designGraphic || '-',
        item.productColor || '-',
        item.designNumber || '01',
        item.subCategory || 'Kaos / T-Shirt',
        item.unit || 'pcs',
        item.totalQty,
        item.usedOrSoldQty,
        countedStock,
        uncountedStock,
        formatAvailabilityLabel(status),
        serializeVariantsForSheet(item.variants),
        item.location || '',
        item.notes || '',
        item.updatedAt || ''
      ];
    });

    if (rows.length === 0) return;

    await makeRequest(
      `/${spreadsheetId}/values/STOCK_SKU!A2?valueInputOption=USER_ENTERED`,
      'PUT',
      token,
      { values: rows }
    );
  } catch (err) {
    console.warn('Notice pushing STOCK_SKU to sheets:', err);
  }
}

/**
 * Menyimpan data Inventory (Barang Dijual / Belum Terjual & Barang Dipakai / Operasional) ke Google Sheets (Sheet: INVENTORY)
 */
export async function pushInventoryToSheets(
  spreadsheetId: string,
  inventory: InventoryItem[],
  token: string
): Promise<void> {
  try {
    await makeRequest(`/${spreadsheetId}/values/INVENTORY!A2:Z5000:clear`, 'POST', token);

    const rows = inventory.map(item => {
      const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
      const totalVal = rem * (item.unitCost || 0);
      const status = resolveItemAvailability(item);

      return [
        item.id,
        item.sku,
        item.name,
        item.category === 'for_sale'
          ? 'Barang untuk Dijual (Persediaan)'
          : 'Barang untuk Dipakai (Operasional / Tidak Dijual)',
        item.subCategory || '',
        item.unit || 'pcs',
        item.totalQty,
        item.usedOrSoldQty,
        rem,
        formatAvailabilityLabel(status),
        item.unitCost || 0,
        item.sellingPrice || 0,
        totalVal,
        item.accountCode || (item.category === 'for_sale' ? '1-1005' : '1-1006'),
        item.location || '',
        item.notes || '',
        item.updatedAt || ''
      ];
    });

    if (rows.length === 0) return;

    await makeRequest(
      `/${spreadsheetId}/values/INVENTORY!A2?valueInputOption=USER_ENTERED`,
      'PUT',
      token,
      { values: rows }
    );
  } catch (err) {
    console.warn('Notice pushing INVENTORY to sheets:', err);
  }
}

/**
 * Menarik data Inventory & Stock SKU dari Google Sheets (Menggabungkan Sheet INVENTORY dan STOCK_SKU)
 */
export async function pullInventoryFromSheets(
  spreadsheetId: string,
  token: string
): Promise<InventoryItem[]> {
  try {
    const [invRes, skuRes] = await Promise.all([
      makeRequest(`/${spreadsheetId}/values/INVENTORY!A2:Q5000`, 'GET', token).catch(() => ({ values: [] })),
      makeRequest(`/${spreadsheetId}/values/STOCK_SKU!A2:S5000`, 'GET', token).catch(() => ({ values: [] }))
    ]);

    const invRows: any[] = invRes.values || [];
    const skuRows: any[] = skuRes.values || [];

    // Build map of extra SKU metadata from STOCK_SKU sheet
    const skuMetaMap = new Map<string, any>();
    skuRows.forEach(r => {
      const idOrSku = r[0] || r[1];
      if (idOrSku) {
        skuMetaMap.set(idOrSku, r);
      }
    });

    if (invRows.length > 0) {
      return invRows.map((row: any, idx: number) => {
        const id = row[0] || `INV-SH-${Date.now()}-${idx}`;
        const sku = row[1] || `TM-SKU-${idx + 1}`;
        const skuMeta = skuMetaMap.get(id) || skuMetaMap.get(sku);

        const rawCat = (row[3] || '').toString().toLowerCase();
        const category: InventoryCategory =
          rawCat.includes('dipakai') || rawCat.includes('internal') || rawCat.includes('operasional')
            ? 'internal_use'
            : 'for_sale';

        const totalQty = parseFloat(row[6]) || 0;
        const usedOrSoldQty = parseFloat(row[7]) || 0;
        const remainingQty = Math.max(0, totalQty - usedOrSoldQty);
        const unitCost = parseFloat(row[10]) || 0;
        const sellingPrice = parseFloat(row[11]) || 0;

        const statusStr = skuMeta ? (skuMeta[14] || row[9] || '') : (row[9] || '');
        const availabilityStatus = parseAvailabilityLabel(statusStr, category, remainingQty);

        return {
          id,
          sku,
          name: row[2] || 'Produk Inventory',
          productSleeve: skuMeta && skuMeta[3] !== '-' ? skuMeta[3] : undefined,
          designStyle: skuMeta && skuMeta[4] !== '-' ? skuMeta[4] : undefined,
          designGraphic: skuMeta && skuMeta[5] !== '-' ? skuMeta[5] : undefined,
          productColor: skuMeta && skuMeta[6] !== '-' ? skuMeta[6] : undefined,
          designNumber: skuMeta && skuMeta[7] !== '-' ? skuMeta[7] : undefined,
          category,
          subCategory: row[4] || 'Kaos / T-Shirt',
          unit: row[5] || 'pcs',
          totalQty,
          usedOrSoldQty,
          remainingQty,
          isAvailable: availabilityStatus === 'available',
          availabilityStatus,
          unitCost,
          sellingPrice,
          totalRemainingValue: remainingQty * unitCost,
          accountCode: row[13] || (category === 'for_sale' ? '1-1005' : '1-1006'),
          variants: skuMeta ? parseVariantsFromSheet(skuMeta[15] || '', sku) : undefined,
          location: row[14] || (skuMeta ? skuMeta[16] : '') || '',
          notes: row[15] || (skuMeta ? skuMeta[17] : '') || '',
          updatedAt: row[16] || (skuMeta ? skuMeta[18] : '') || new Date().toISOString().split('T')[0]
        };
      }).filter((item: InventoryItem) => item.name && item.sku);
    }

    // Fallback if only STOCK_SKU has rows
    if (skuRows.length > 0) {
      return skuRows.map((row: any, idx: number) => {
        const id = row[0] || `INV-SH-${Date.now()}-${idx}`;
        const sku = row[1] || `TM-SKU-${idx + 1}`;
        const totalQty = parseFloat(row[10]) || 0;
        const usedOrSoldQty = parseFloat(row[11]) || 0;
        const remainingQty = Math.max(0, totalQty - usedOrSoldQty);
        const availabilityStatus = parseAvailabilityLabel(row[14] || '', 'for_sale', remainingQty);
        const category: InventoryCategory = availabilityStatus === 'not_for_sale' ? 'internal_use' : 'for_sale';

        return {
          id,
          sku,
          name: row[2] || 'Produk SKU',
          productSleeve: row[3] !== '-' ? row[3] : undefined,
          designStyle: row[4] !== '-' ? row[4] : undefined,
          designGraphic: row[5] !== '-' ? row[5] : undefined,
          productColor: row[6] !== '-' ? row[6] : undefined,
          designNumber: row[7] !== '-' ? row[7] : undefined,
          category,
          subCategory: row[8] || 'Kaos / T-Shirt',
          unit: row[9] || 'pcs',
          totalQty,
          usedOrSoldQty,
          remainingQty,
          isAvailable: availabilityStatus === 'available',
          availabilityStatus,
          unitCost: 0,
          sellingPrice: 0,
          totalRemainingValue: 0,
          accountCode: category === 'for_sale' ? '1-1005' : '1-1006',
          variants: parseVariantsFromSheet(row[15] || '', sku),
          location: row[16] || '',
          notes: row[17] || '',
          updatedAt: row[18] || new Date().toISOString().split('T')[0]
        };
      }).filter((item: InventoryItem) => item.name && item.sku);
    }

    return [];
  } catch (err: any) {
    if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
      throw err;
    }
    console.warn('Notice when pulling inventory from sheets:', err);
    return [];
  }
}

/**
 * Menyimpan seluruh data Penjualan & Dana Pending Marketplace ke Google Sheets (Sheet: PENJUALAN)
 */
export async function pushSalesToSheets(
  spreadsheetId: string,
  sales: SaleOrder[],
  token: string
): Promise<void> {
  try {
    await makeRequest(`/${spreadsheetId}/values/PENJUALAN!A2:Z5000:clear`, 'POST', token);

    const rows = sales.map(s => [
      s.id,
      s.orderDate,
      s.settledDate || '-',
      s.invoiceNum,
      s.channel,
      s.customerName,
      s.productName,
      s.qty,
      s.unitPrice,
      s.discountAmount || 0,
      s.grossTransacted,
      s.marketplaceFee || 0,
      s.netPayout,
      s.hppPerPiece || 0,
      s.totalHpp || 0,
      s.estimatedNetProfit,
      s.status === 'settled' ? 'SUDAH CAIR (SETTLED)' : 'PENDING (TERTAHAN)',
      s.targetAccountCode || '1-1003',
      s.revenueAccountCode || '4-1001',
      s.feeAccountCode || '5-1008',
      s.notes || '',
      s.createdAt || ''
    ]);

    if (rows.length === 0) return;

    await makeRequest(
      `/${spreadsheetId}/values/PENJUALAN!A2?valueInputOption=USER_ENTERED`,
      'PUT',
      token,
      { values: rows }
    );
  } catch (err) {
    console.warn('Notice pushing PENJUALAN to sheets:', err);
  }
}

/**
 * Menarik seluruh data Penjualan & Dana Pending dari Google Sheets (Sheet: PENJUALAN)
 */
export async function pullSalesFromSheets(
  spreadsheetId: string,
  token: string
): Promise<SaleOrder[]> {
  try {
    const response = await makeRequest(`/${spreadsheetId}/values/PENJUALAN!A2:V5000`, 'GET', token);
    const rows = response.values || [];

    return rows.map((row: any, idx: number) => {
      const statusRaw = (row[16] || '').toString().toUpperCase();
      const status: SaleStatus = statusRaw.includes('CAIR') || statusRaw.includes('SETTLED') ? 'settled' : 'pending';
      const qty = parseFloat(row[7]) || 1;
      const unitPrice = parseFloat(row[8]) || 0;
      const discountAmount = parseFloat(row[9]) || 0;
      const grossTransacted = parseFloat(row[10]) || Math.max(0, qty * unitPrice - discountAmount);
      const marketplaceFee = parseFloat(row[11]) || 0;
      const netPayout = parseFloat(row[12]) || Math.max(0, grossTransacted - marketplaceFee);
      const hppPerPiece = parseFloat(row[13]) || 0;
      const totalHpp = parseFloat(row[14]) || qty * hppPerPiece;
      const estimatedNetProfit = parseFloat(row[15]) || (netPayout - totalHpp);

      return {
        id: row[0] || `SLS-SH-${Date.now()}-${idx}`,
        orderDate: row[1] || new Date().toISOString().split('T')[0],
        settledDate: row[2] && row[2] !== '-' ? row[2] : undefined,
        invoiceNum: row[3] || `INV-${idx + 1}`,
        channel: (row[4] as SaleChannel) || 'Shopee',
        customerName: row[5] || 'Pelanggan Marketplace',
        productName: row[6] || 'Produk Three Mister',
        qty,
        unitPrice,
        discountAmount,
        grossTransacted,
        marketplaceFee,
        netPayout,
        hppPerPiece,
        totalHpp,
        estimatedNetProfit,
        status,
        targetAccountCode: row[17] || '1-1003',
        revenueAccountCode: row[18] || '4-1001',
        feeAccountCode: row[19] || '5-1008',
        recordFeeSeparately: true,
        recordHppAuto: true,
        hppDebitAccountCode: '5-1001',
        hppCreditAccountCode: '1-1005',
        notes: row[20] || '',
        createdAt: row[21] || new Date().toISOString()
      };
    }).filter((s: SaleOrder) => s.invoiceNum && s.productName);
  } catch (err: any) {
    if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
      throw err;
    }
    console.warn('Notice when pulling sales from sheets:', err);
    return [];
  }
}

/**
 * Menyimpan seluruh data Transaksi ke Google Sheets (Sheet: TRANSAKSI)
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
 * Menarik seluruh data Transaksi dari Google Sheets (Sheet: TRANSAKSI)
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
  } catch (err: any) {
    if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
      throw err;
    }
    console.warn('Notice when pulling transactions from sheets:', err);
    return [];
  }
}

/**
 * Menyimpan seluruh data Kalkulasi & Patokan HPP Produk ke Google Sheets (Sheet: HPP_PRODUK)
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
    console.warn('Notice pushing HPP to sheets:', err);
  }
}

/**
 * Menarik data HPP dari Google Sheets (Sheet: HPP_PRODUK)
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
  } catch (err: any) {
    if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
      throw err;
    }
    console.warn('Notice when pulling HPP from sheets:', err);
    return [];
  }
}

/**
 * Menyimpan riwayat Simulasi Harga Marketplace ke Google Sheets (Sheet: HARGA_MARKETPLACE)
 */
export async function pushMarketplaceHistoryToSheets(
  spreadsheetId: string,
  marketplaceHistory: MarketplacePricingHistory[],
  token: string
): Promise<void> {
  try {
    await makeRequest(`/${spreadsheetId}/values/HARGA_MARKETPLACE!A2:Z1000:clear`, 'POST', token);

    const rows = marketplaceHistory.map(m => [
      m.id,
      m.productName,
      m.hpp,
      m.mode === 'target' ? 'Target Laba Bersih' : 'Simulasi Harga Jual',
      m.targetProfit,
      m.sellingPrice,
      m.date
    ]);

    if (rows.length === 0) return;

    await makeRequest(
      `/${spreadsheetId}/values/HARGA_MARKETPLACE!A2?valueInputOption=USER_ENTERED`,
      'PUT',
      token,
      { values: rows }
    );
  } catch (err) {
    console.warn('Notice pushing HARGA_MARKETPLACE to sheets:', err);
  }
}

/**
 * Menarik riwayat Simulasi Harga Marketplace dari Google Sheets (Sheet: HARGA_MARKETPLACE)
 */
export async function pullMarketplaceHistoryFromSheets(
  spreadsheetId: string,
  token: string
): Promise<MarketplacePricingHistory[]> {
  try {
    const response = await makeRequest(`/${spreadsheetId}/values/HARGA_MARKETPLACE!A2:G1000`, 'GET', token);
    const rows = response.values || [];

    return rows.map((row: any, idx: number) => ({
      id: row[0] || `MP-SH-${Date.now()}-${idx}`,
      productName: row[1] || 'Produk THREE MISTER',
      hpp: parseFloat(row[2]) || 0,
      mode: (row[3] || '').toString().toLowerCase().includes('simulasi') ? ('simulate' as const) : ('target' as const),
      targetProfit: parseFloat(row[4]) || 0,
      sellingPrice: parseFloat(row[5]) || 0,
      date: row[6] || new Date().toLocaleDateString('id-ID')
    })).filter((m: MarketplacePricingHistory) => m.productName && m.sellingPrice > 0);
  } catch (err: any) {
    if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Izin Google Sheets')) {
      throw err;
    }
    console.warn('Notice when pulling marketplace history from sheets:', err);
    return [];
  }
}

/**
 * Menyimpan Ringkasan Eksekutif Keuangan & Operasional Real-time ke Google Sheets (Sheet: RINGKASAN_KEUANGAN)
 */
export async function pushSummaryToSheets(
  spreadsheetId: string,
  summary: FinancialSummaryData,
  token: string
): Promise<void> {
  try {
    await makeRequest(`/${spreadsheetId}/values/RINGKASAN_KEUANGAN!A2:Z100:clear`, 'POST', token);

    const rows: (string | number)[][] = [
      ['Total Pendapatan Penjualan', formatRupiahText(summary.totalRevenue), 'Total penerimaan dari penjualan produk clothing'],
      ['Total Harga Pokok Penjualan (HPP)', formatRupiahText(summary.totalHPP), 'Beban pokok produksi produk pakaian yang terjual'],
      ['Laba Kotor (Gross Profit)', formatRupiahText(summary.grossProfit), 'Pendapatan dikurangi HPP produk'],
      ['Total Beban Operasional', formatRupiahText(summary.totalExpenses), 'Beban sewa, gaji, promosi, & utilitas operasional'],
      ['Laba Bersih Usaha (Net Profit)', formatRupiahText(summary.netProfit), summary.netProfit >= 0 ? 'Surplus laba bersih operasional' : 'Defisit operasional saat ini'],
      ['Total Saldo Kas & Bank', formatRupiahText(summary.totalCash), 'Likuiditas dana cair di kas dan rekening perbankan'],
      ['Total Piutang Usaha', formatRupiahText(summary.totalReceivables), 'Tagihan penjualan dan kredit pelanggan berjalan'],
      ['Total Persediaan Barang (COA)', formatRupiahText(summary.totalInventory), 'Nilai persediaan baju jadi, kain roll, & aksesoris'],
      ['Nilai Inventory Barang Belum Terjual (Siap Jual)', formatRupiahText(summary.totalInventoryForSaleValue || 0), 'Total nilai modal barang dagangan yang belum terjual'],
      ['Nilai Inventory Barang Dipakai (Operasional / Tidak Dijual)', formatRupiahText(summary.totalInventoryInternalValue || 0), 'Total nilai perlengkapan & peralatan operasional'],
      ['Status Ketersediaan Produk (Stock & SKU)', `${summary.totalStockAvailableProducts || 0} Tersedia | ${summary.totalStockUnavailableProducts || 0} Habis | ${summary.totalStockNotForSaleProducts || 0} Tidak Dijual`, 'Rekap status ketersediaan artikel pada modul Stock & Kode SKU Otomatis'],
      ['Total Kuantitas Stock Produk', `${summary.totalStockCountedPcs || 0} Pcs Siap Jual | ${summary.totalStockUncountedPcs || 0} Pcs Stock Tidak Terhitung`, 'Pemisahan otomatis stok siap jual dan stock tidak terhitung (produk tidak dijual)'],
      ['Penjualan Marketplace Masih Pending (Tertahan)', `${summary.totalPendingSalesCount || 0} Pesanan (${formatRupiahText(summary.totalPendingSalesNet || 0)})`, 'Dana penjualan yang masih tertahan di escrow marketplace'],
      ['Penjualan Sudah Cair (Masuk Rekening & Jurnal)', `${summary.totalSettledSalesCount || 0} Pesanan (${formatRupiahText(summary.totalSettledSalesNet || 0)})`, 'Dana penjualan yang telah cair dan masuk ke Transaksi & Jurnal Umum'],
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
    console.warn('Notice pushing financial summary to sheets:', err);
  }
}

/**
 * Menyimpan seluruh data sistem dari semua fitur
 * (AKUN, STOCK_SKU, INVENTORY, PENJUALAN, TRANSAKSI, HPP_PRODUK, HARGA_MARKETPLACE, RINGKASAN_KEUANGAN + customSheets)
 * secara lengkap & otomatis ke Google Sheets
 */
export async function pushAllDataToSheets(
  spreadsheetId: string,
  payload: {
    accounts: Account[];
    transactions: Transaction[];
    sales?: SaleOrder[];
    inventory?: InventoryItem[];
    hppCalcs?: SavedCalculation[];
    marketplaceHistory?: MarketplacePricingHistory[];
    summary?: FinancialSummaryData;
    customSheets?: CustomFeatureSheet[];
  },
  token: string
): Promise<{ addedSheets: string[] }> {
  // 1. Pastikan seluruh sheet fitur sudah ada di Google Spreadsheet (jika ada fitur baru, otomatis addSheet & tulis header terbaru)
  const addedSheets = await ensureSheetsExist(spreadsheetId, token, payload.customSheets);

  // 2. Push seluruh data ke masing-masing sheet fitur
  await pushAccountsToSheets(spreadsheetId, payload.accounts, token);

  if (payload.inventory) {
    await pushStockSkuToSheets(spreadsheetId, payload.inventory, token);
    await pushInventoryToSheets(spreadsheetId, payload.inventory, token);
  }

  if (payload.sales) {
    await pushSalesToSheets(spreadsheetId, payload.sales, token);
  }

  await pushTransactionsToSheets(spreadsheetId, payload.transactions, token);

  if (payload.hppCalcs) {
    await pushHPPToSheets(spreadsheetId, payload.hppCalcs, token);
  }

  if (payload.marketplaceHistory) {
    await pushMarketplaceHistoryToSheets(spreadsheetId, payload.marketplaceHistory, token);
  }

  if (payload.summary) {
    await pushSummaryToSheets(spreadsheetId, payload.summary, token);
  }

  // Push dynamic custom sheets if provided
  if (payload.customSheets && payload.customSheets.length > 0) {
    for (const cs of payload.customSheets) {
      await makeRequest(`/${spreadsheetId}/values/${cs.title}!A2:Z5000:clear`, 'POST', token);
      if (cs.rows.length > 0) {
        await makeRequest(
          `/${spreadsheetId}/values/${cs.title}!A2?valueInputOption=USER_ENTERED`,
          'PUT',
          token,
          { values: cs.rows }
        );
      }
    }
  }

  return { addedSheets };
}

