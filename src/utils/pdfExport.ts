/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Currency formatter for PDF
const formatIDR = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

// Current formatted date & time
const getPrintTimestamp = (): string => {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface ReportHeaderOptions {
  doc: jsPDF;
  title: string;
  subtitle?: string;
  periodText: string;
  brandName?: string;
}

const renderReportHeader = ({
  doc,
  title,
  subtitle = 'SISTEM MANAJEMEN & PEMBUKUAN RESMI',
  periodText,
  brandName = 'THREE MISTER',
}: ReportHeaderOptions): number => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Maroon Accent Bar (#580001)
  doc.setFillColor(88, 0, 1); // #580001
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(88, 0, 1);
  doc.text(brandName, 14, 18);

  // Subtitle / Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('MANAGEMENT SYSTEM • CLOTHING BRAND LEDGER', 14, 23);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title.toUpperCase(), 14, 32);

  // Right Side: Period & Print Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periode: ${periodText}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Dicetak: ${getPrintTimestamp()}`, pageWidth - 14, 23, { align: 'right' });
  doc.text('Mata Uang: IDR (Rupiah)', pageWidth - 14, 28, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.line(14, 36, pageWidth - 14, 36);

  return 42; // Returns next available Y coordinate
};

const renderSignaturesAndFooter = (doc: jsPDF, finalY: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Check if we have enough room for signatures (need ~40mm)
  let sigY = finalY + 12;
  if (sigY + 38 > pageHeight - 15) {
    doc.addPage();
    sigY = 25;
  }

  // Signature columns
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  // Left: Dibuat oleh
  doc.text('Disiapkan & Divalidasi Oleh,', 14, sigY);
  doc.text('Bagian Keuangan / Akuntan', 14, sigY + 5);
  doc.line(14, sigY + 26, 75, sigY + 26);
  doc.text('Tanggal: .............................', 14, sigY + 31);

  // Right: Disetujui oleh
  doc.text('Disetujui & Diterima Oleh,', pageWidth - 14, sigY, { align: 'right' });
  doc.text('Pemilik Brand (Owner / Direktur)', pageWidth - 14, sigY + 5, { align: 'right' });
  doc.line(pageWidth - 75, sigY + 26, pageWidth - 14, sigY + 26);
  doc.text('Tanggal: .............................', pageWidth - 14, sigY + 31, { align: 'right' });

  // Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setDrawColor(241, 245, 249);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);
    doc.text(
      'THREE MISTER • Management System & Laporan Rekap Keuangan',
      14,
      pageHeight - 7
    );
    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - 14,
      pageHeight - 7,
      { align: 'right' }
    );
  }
};

// ==========================================
// 1. EXPORT LABA RUGI (PROFIT & LOSS) PDF
// ==========================================
export interface ProfitLossExportData {
  periodText: string;
  revenueList: { code: string; name: string; amount: number }[];
  hppList: { code: string; name: string; amount: number }[];
  opexList: { code: string; name: string; amount: number }[];
  totalRevenue: number;
  totalHPP: number;
  labaKotor: number;
  totalOPEX: number;
  netProfit: number;
}

export const exportProfitLossPDF = (data: ProfitLossExportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = renderReportHeader({
    doc,
    title: 'Laporan Laba Rugi (Income Statement)',
    periodText: data.periodText,
  });

  // Table Body construction
  const tableRows: any[] = [];

  // 1. Section Pendapatan
  tableRows.push([
    { content: '1. PENDAPATAN USAHA (REVENUE)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.revenueList.length === 0) {
    tableRows.push(['-', 'Tidak ada transaksi pendapatan pada periode ini', formatIDR(0)]);
  } else {
    data.revenueList.forEach(item => {
      tableRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  tableRows.push([
    { content: 'TOTAL PENDAPATAN OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.totalRevenue), styles: { fontStyle: 'bold', halign: 'right', textColor: [5, 150, 105] } }
  ]);

  // Blank row separator
  tableRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // 2. Section HPP (Harga Pokok Penjualan)
  tableRows.push([
    { content: '2. BEBAN POKOK PENJUALAN (HPP / COGS)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.hppList.length === 0) {
    tableRows.push(['5-1001', 'Harga Pokok Penjualan (HPP Kaos/Pakaian)', formatIDR(0)]);
  } else {
    data.hppList.forEach(item => {
      tableRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  tableRows.push([
    { content: 'TOTAL HARGA POKOK PENJUALAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.totalHPP), styles: { fontStyle: 'bold', halign: 'right', textColor: [225, 29, 72] } }
  ]);

  // LABA KOTOR SUMMARY ROW
  tableRows.push([
    { content: 'LABA KOTOR (GROSS PROFIT)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
    { content: formatIDR(data.labaKotor), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: data.labaKotor >= 0 ? [5, 150, 105] : [225, 29, 72] } }
  ]);

  // Blank row separator
  tableRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // 3. Section Beban Operasional (OPEX)
  tableRows.push([
    { content: '3. BEBAN OPERASIONAL (OPERATING EXPENSES)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.opexList.length === 0) {
    tableRows.push(['-', 'Tidak ada beban operasional yang dicatat', formatIDR(0)]);
  } else {
    data.opexList.forEach(item => {
      tableRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  tableRows.push([
    { content: 'TOTAL BEBAN OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.totalOPEX), styles: { fontStyle: 'bold', halign: 'right', textColor: [225, 29, 72] } }
  ]);

  // Blank row separator
  tableRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // 4. FINAL ROW: LABA / RUGI BERSIH
  const isProfit = data.netProfit >= 0;
  tableRows.push([
    {
      content: isProfit ? 'LABA BERSIH TAHUN/BULAN BERJALAN (NET PROFIT)' : 'RUGI BERSIH TAHUN/BULAN BERJALAN (NET LOSS)',
      colSpan: 2,
      styles: {
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        cellPadding: 4,
      }
    },
    {
      content: formatIDR(data.netProfit),
      styles: {
        fontStyle: 'bold',
        fontSize: 10.5,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: isProfit ? [52, 211, 153] : [251, 113, 133], // emerald or rose text
        cellPadding: 4,
      }
    }
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Kode Akun', 'Pos Laporan Keuangan', 'Jumlah (IDR)']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 28, fontSize: 8 },
      1: { cellWidth: 'auto', fontSize: 8.5 },
      2: { cellWidth: 42, halign: 'right', fontSize: 8.5 },
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2.2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    didParseCell: (hookData) => {
      // Align 3rd column head to right
      if (hookData.section === 'head' && hookData.column.index === 2) {
        hookData.cell.styles.halign = 'right';
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  renderSignaturesAndFooter(doc, finalY);

  const cleanPeriod = data.periodText.replace(/\s+/g, '_');
  doc.save(`Laporan_Laba_Rugi_ThreeMister_${cleanPeriod}.pdf`);
};

// ==========================================
// 2. EXPORT NERACA KEUANGAN (BALANCE SHEET) PDF
// ==========================================
export interface BalanceSheetExportData {
  periodText: string;
  assetList: { code: string; name: string; amount: number }[];
  liabilityList: { code: string; name: string; amount: number }[];
  equityList: { code: string; name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquityBeforeProfit: number;
  netProfit: number;
  totalEquity: number;
}

export const exportBalanceSheetPDF = (data: BalanceSheetExportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = renderReportHeader({
    doc,
    title: 'Laporan Neraca Keuangan (Balance Sheet)',
    periodText: data.periodText,
  });

  const tableRows: any[] = [];

  // SECTION 1: AKTIVA (ASSETS)
  tableRows.push([
    { content: '1. AKTIVA / ASET (ASSETS)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.assetList.length === 0) {
    tableRows.push(['-', 'Tidak ada saldo aktiva', formatIDR(0)]);
  } else {
    data.assetList.forEach(item => {
      tableRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  tableRows.push([
    { content: 'TOTAL AKTIVA (TOTAL ASSETS)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
    { content: formatIDR(data.totalAssets), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: [15, 23, 42] } }
  ]);

  // Blank row
  tableRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // SECTION 2: KEWAJIBAN (LIABILITIES)
  tableRows.push([
    { content: '2. KEWAJIBAN / LIABILITAS (LIABILITIES)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.liabilityList.length === 0) {
    tableRows.push(['-', 'Tidak ada kewajiban / utang tercatat', formatIDR(0)]);
  } else {
    data.liabilityList.forEach(item => {
      tableRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  tableRows.push([
    { content: 'TOTAL KEWAJIBAN / UTANG', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.totalLiabilities), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);

  // Blank row
  tableRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // SECTION 3: MODAL / EKUITAS (EQUITY)
  tableRows.push([
    { content: '3. MODAL / EKUITAS (EQUITY)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  data.equityList.forEach(item => {
    tableRows.push([item.code, item.name, formatIDR(item.amount)]);
  });
  // Laba Bersih Periode Berjalan
  tableRows.push([
    '3-2000',
    'Laba Bersih Periode Berjalan (Current Earnings)',
    formatIDR(data.netProfit)
  ]);
  tableRows.push([
    { content: 'TOTAL EKUITAS / MODAL BERSIH', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.totalEquity), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);

  // Blank row
  tableRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // GRAND COMPARISON: TOTAL AKTIVA VS (KEWAJIBAN + MODAL)
  const totalPasiva = data.totalLiabilities + data.totalEquity;
  const isBalanced = Math.abs(data.totalAssets - totalPasiva) < 1;

  tableRows.push([
    {
      content: 'TOTAL KEWAJIBAN & EKUITAS (PASIVA)',
      colSpan: 2,
      styles: {
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        cellPadding: 3.5,
      }
    },
    {
      content: formatIDR(totalPasiva),
      styles: {
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        cellPadding: 3.5,
      }
    }
  ]);

  // Balance Check Status Row
  tableRows.push([
    {
      content: isBalanced
        ? 'STATUS NERACA: BALANCE (SEIMBANG) — AKTIVA = KEWAJIBAN + EKUITAS'
        : `STATUS NERACA: TIDAK SEIMBANG (SELISIH ${formatIDR(Math.abs(data.totalAssets - totalPasiva))})`,
      colSpan: 3,
      styles: {
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
        fillColor: isBalanced ? [236, 253, 245] : [255, 241, 242],
        textColor: isBalanced ? [4, 120, 87] : [190, 18, 60],
        cellPadding: 3,
      }
    }
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Kode Akun', 'Pos Akun Neraca', 'Jumlah Saldo (IDR)']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 28, fontSize: 8 },
      1: { cellWidth: 'auto', fontSize: 8.5 },
      2: { cellWidth: 42, halign: 'right', fontSize: 8.5 },
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2.2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'head' && hookData.column.index === 2) {
        hookData.cell.styles.halign = 'right';
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  renderSignaturesAndFooter(doc, finalY);

  const cleanPeriod = data.periodText.replace(/\s+/g, '_');
  doc.save(`Laporan_Neraca_ThreeMister_${cleanPeriod}.pdf`);
};

// ==========================================
// 3. EXPORT ARUS KAS (CASH FLOW) PDF
// ==========================================
export interface CashFlowExportData {
  periodText: string;
  operatingInList: { desc: string; amount: number }[];
  operatingOutList: { desc: string; amount: number }[];
  investingInList: { desc: string; amount: number }[];
  investingOutList: { desc: string; amount: number }[];
  financingInList: { desc: string; amount: number }[];
  financingOutList: { desc: string; amount: number }[];
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export const exportCashFlowPDF = (data: CashFlowExportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = renderReportHeader({
    doc,
    title: 'Laporan Arus Kas (Statement of Cash Flows)',
    periodText: data.periodText,
  });

  const tableRows: any[] = [];

  // SECTION 1: ARUS KAS OPERASIONAL
  tableRows.push([
    { content: '1. ARUS KAS DARI AKTIVITAS OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  data.operatingInList.forEach(item => {
    tableRows.push([`+ ${item.desc}`, formatIDR(item.amount)]);
  });
  data.operatingOutList.forEach(item => {
    tableRows.push([`- ${item.desc}`, `(${formatIDR(item.amount)})`]);
  });
  tableRows.push([
    { content: 'Arus Kas Bersih dari Aktivitas Operasional', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.netOperating), styles: { fontStyle: 'bold', halign: 'right', textColor: data.netOperating >= 0 ? [5, 150, 105] : [225, 29, 72] } }
  ]);

  tableRows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // SECTION 2: ARUS KAS INVESTASI
  tableRows.push([
    { content: '2. ARUS KAS DARI AKTIVITAS INVESTASI', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.investingInList.length === 0 && data.investingOutList.length === 0) {
    tableRows.push(['Tidak ada mutasi belanja aset/investasi periode ini', formatIDR(0)]);
  } else {
    data.investingInList.forEach(item => {
      tableRows.push([`+ ${item.desc}`, formatIDR(item.amount)]);
    });
    data.investingOutList.forEach(item => {
      tableRows.push([`- ${item.desc}`, `(${formatIDR(item.amount)})`]);
    });
  }
  tableRows.push([
    { content: 'Arus Kas Bersih dari Aktivitas Investasi', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.netInvesting), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);

  tableRows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // SECTION 3: ARUS KAS PENDANAAN
  tableRows.push([
    { content: '3. ARUS KAS DARI AKTIVITAS PENDANAAN', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.financingInList.length === 0 && data.financingOutList.length === 0) {
    tableRows.push(['Tidak ada mutasi setoran modal / prive periode ini', formatIDR(0)]);
  } else {
    data.financingInList.forEach(item => {
      tableRows.push([`+ ${item.desc}`, formatIDR(item.amount)]);
    });
    data.financingOutList.forEach(item => {
      tableRows.push([`- ${item.desc}`, `(${formatIDR(item.amount)})`]);
    });
  }
  tableRows.push([
    { content: 'Arus Kas Bersih dari Aktivitas Pendanaan', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.netFinancing), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);

  tableRows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  // SUMMARY: REKONSILIASI SALDO KAS
  tableRows.push([
    { content: 'KENAIKAN / (PENURUNAN) BERSIH KAS & SETARA KAS', styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
    { content: formatIDR(data.netCashFlow), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: data.netCashFlow >= 0 ? [5, 150, 105] : [225, 29, 72] } }
  ]);
  tableRows.push([
    { content: 'Saldo Kas & Bank Awal Periode', styles: { fontStyle: 'normal', halign: 'right' } },
    { content: formatIDR(data.beginningCash), styles: { fontStyle: 'normal', halign: 'right' } }
  ]);
  tableRows.push([
    {
      content: 'SALDO KAS & BANK AKHIR PERIODE',
      styles: {
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        cellPadding: 3.5,
      }
    },
    {
      content: formatIDR(data.endingCash),
      styles: {
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [52, 211, 153],
        cellPadding: 3.5,
      }
    }
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['Aktivitas Arus Kas (Cash Flow Activities)', 'Arus Kas Masuk / (Keluar) IDR']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontSize: 8.5 },
      1: { cellWidth: 55, halign: 'right', fontSize: 8.5 },
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2.2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'head' && hookData.column.index === 1) {
        hookData.cell.styles.halign = 'right';
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  renderSignaturesAndFooter(doc, finalY);

  const cleanPeriod = data.periodText.replace(/\s+/g, '_');
  doc.save(`Laporan_Arus_Kas_ThreeMister_${cleanPeriod}.pdf`);
};

// ==========================================
// 4. EXPORT BUNDLED COMPLETE FINANCIAL REPORT (ALL-IN-ONE)
// ==========================================
export interface CompleteFinancialReportData {
  periodText: string;
  profitLoss: ProfitLossExportData;
  balanceSheet: BalanceSheetExportData;
  cashFlow: CashFlowExportData;
}

export const exportCompleteFinancialReportPDF = (data: CompleteFinancialReportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // --- PAGE 1: LABA RUGI ---
  const startY1 = renderReportHeader({
    doc,
    title: 'Laporan Laba Rugi (Income Statement)',
    periodText: data.periodText,
  });

  const plRows: any[] = [];
  plRows.push([{ content: '1. PENDAPATAN USAHA (REVENUE)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.profitLoss.revenueList.forEach(item => plRows.push([item.code, item.name, formatIDR(item.amount)]));
  plRows.push([
    { content: 'TOTAL PENDAPATAN OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.profitLoss.totalRevenue), styles: { fontStyle: 'bold', halign: 'right', textColor: [5, 150, 105] } }
  ]);
  plRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  plRows.push([{ content: '2. BEBAN POKOK PENJUALAN (HPP / COGS)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.profitLoss.hppList.forEach(item => plRows.push([item.code, item.name, formatIDR(item.amount)]));
  plRows.push([
    { content: 'TOTAL HARGA POKOK PENJUALAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.profitLoss.totalHPP), styles: { fontStyle: 'bold', halign: 'right', textColor: [225, 29, 72] } }
  ]);
  plRows.push([
    { content: 'LABA KOTOR (GROSS PROFIT)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
    { content: formatIDR(data.profitLoss.labaKotor), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: data.profitLoss.labaKotor >= 0 ? [5, 150, 105] : [225, 29, 72] } }
  ]);
  plRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  plRows.push([{ content: '3. BEBAN OPERASIONAL (OPERATING EXPENSES)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.profitLoss.opexList.forEach(item => plRows.push([item.code, item.name, formatIDR(item.amount)]));
  plRows.push([
    { content: 'TOTAL BEBAN OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.profitLoss.totalOPEX), styles: { fontStyle: 'bold', halign: 'right', textColor: [225, 29, 72] } }
  ]);
  plRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  plRows.push([
    {
      content: data.profitLoss.netProfit >= 0 ? 'LABA BERSIH TAHUN/BULAN BERJALAN' : 'RUGI BERSIH TAHUN/BULAN BERJALAN',
      colSpan: 2,
      styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', fillColor: [15, 23, 42], textColor: [255, 255, 255], cellPadding: 3.5 }
    },
    {
      content: formatIDR(data.profitLoss.netProfit),
      styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: [15, 23, 42], textColor: data.profitLoss.netProfit >= 0 ? [52, 211, 153] : [251, 113, 133], cellPadding: 3.5 }
    }
  ]);

  autoTable(doc, {
    startY: startY1,
    head: [['Kode Akun', 'Pos Laporan Keuangan', 'Jumlah (IDR)']],
    body: plRows,
    theme: 'plain',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 28, fontSize: 8 }, 1: { cellWidth: 'auto', fontSize: 8.5 }, 2: { cellWidth: 42, halign: 'right', fontSize: 8.5 } },
    styles: { overflow: 'linebreak', cellPadding: 2, font: 'helvetica', lineColor: [226, 232, 240], lineWidth: 0.2 },
  });

  // --- PAGE 2: NERACA KEUANGAN ---
  doc.addPage();
  const startY2 = renderReportHeader({
    doc,
    title: 'Laporan Neraca Keuangan (Balance Sheet)',
    periodText: data.periodText,
  });

  const bsRows: any[] = [];
  bsRows.push([{ content: '1. AKTIVA / ASET (ASSETS)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.balanceSheet.assetList.forEach(item => bsRows.push([item.code, item.name, formatIDR(item.amount)]));
  bsRows.push([
    { content: 'TOTAL AKTIVA', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
    { content: formatIDR(data.balanceSheet.totalAssets), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } }
  ]);
  bsRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  bsRows.push([{ content: '2. KEWAJIBAN / UTANG (LIABILITIES)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.balanceSheet.liabilityList.forEach(item => bsRows.push([item.code, item.name, formatIDR(item.amount)]));
  bsRows.push([
    { content: 'TOTAL KEWAJIBAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.balanceSheet.totalLiabilities), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);
  bsRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  bsRows.push([{ content: '3. MODAL / EKUITAS (EQUITY)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.balanceSheet.equityList.forEach(item => bsRows.push([item.code, item.name, formatIDR(item.amount)]));
  bsRows.push(['3-2000', 'Laba Bersih Periode Berjalan', formatIDR(data.balanceSheet.netProfit)]);
  bsRows.push([
    { content: 'TOTAL EKUITAS / MODAL BERSIH', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.balanceSheet.totalEquity), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);
  bsRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  const totalPasiva = data.balanceSheet.totalLiabilities + data.balanceSheet.totalEquity;
  const isBalanced = Math.abs(data.balanceSheet.totalAssets - totalPasiva) < 1;
  bsRows.push([
    { content: 'TOTAL KEWAJIBAN & EKUITAS (PASIVA)', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', fillColor: [15, 23, 42], textColor: [255, 255, 255], cellPadding: 3.5 } },
    { content: formatIDR(totalPasiva), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', fillColor: [15, 23, 42], textColor: [255, 255, 255], cellPadding: 3.5 } }
  ]);
  bsRows.push([
    {
      content: isBalanced
        ? 'STATUS NERACA: BALANCE (SEIMBANG) — AKTIVA = KEWAJIBAN + EKUITAS'
        : `STATUS NERACA: TIDAK SEIMBANG (SELISIH ${formatIDR(Math.abs(data.balanceSheet.totalAssets - totalPasiva))})`,
      colSpan: 3,
      styles: { fontStyle: 'bold', fontSize: 8.5, halign: 'center', fillColor: isBalanced ? [236, 253, 245] : [255, 241, 242], textColor: isBalanced ? [4, 120, 87] : [190, 18, 60], cellPadding: 3 }
    }
  ]);

  autoTable(doc, {
    startY: startY2,
    head: [['Kode Akun', 'Pos Akun Neraca', 'Jumlah Saldo (IDR)']],
    body: bsRows,
    theme: 'plain',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 28, fontSize: 8 }, 1: { cellWidth: 'auto', fontSize: 8.5 }, 2: { cellWidth: 42, halign: 'right', fontSize: 8.5 } },
    styles: { overflow: 'linebreak', cellPadding: 2, font: 'helvetica', lineColor: [226, 232, 240], lineWidth: 0.2 },
  });

  // --- PAGE 3: ARUS KAS ---
  doc.addPage();
  const startY3 = renderReportHeader({
    doc,
    title: 'Laporan Arus Kas (Statement of Cash Flows)',
    periodText: data.periodText,
  });

  const cfRows: any[] = [];
  cfRows.push([{ content: '1. ARUS KAS OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.cashFlow.operatingInList.forEach(i => cfRows.push([`+ ${i.desc}`, formatIDR(i.amount)]));
  data.cashFlow.operatingOutList.forEach(i => cfRows.push([`- ${i.desc}`, `(${formatIDR(i.amount)})`]));
  cfRows.push([
    { content: 'Arus Kas Bersih dari Aktivitas Operasional', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.cashFlow.netOperating), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);
  cfRows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  cfRows.push([{ content: '2. ARUS KAS INVESTASI', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.cashFlow.investingInList.forEach(i => cfRows.push([`+ ${i.desc}`, formatIDR(i.amount)]));
  data.cashFlow.investingOutList.forEach(i => cfRows.push([`- ${i.desc}`, `(${formatIDR(i.amount)})`]));
  cfRows.push([
    { content: 'Arus Kas Bersih dari Aktivitas Investasi', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.cashFlow.netInvesting), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);
  cfRows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  cfRows.push([{ content: '3. ARUS KAS PENDANAAN', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
  data.cashFlow.financingInList.forEach(i => cfRows.push([`+ ${i.desc}`, formatIDR(i.amount)]));
  data.cashFlow.financingOutList.forEach(i => cfRows.push([`- ${i.desc}`, `(${formatIDR(i.amount)})`]));
  cfRows.push([
    { content: 'Arus Kas Bersih dari Aktivitas Pendanaan', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.cashFlow.netFinancing), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);
  cfRows.push([{ content: '', colSpan: 2, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }]);

  cfRows.push([
    { content: 'Kenaikan / (Penurunan) Kas Bersih', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(data.cashFlow.netCashFlow), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);
  cfRows.push([
    { content: 'Saldo Kas & Bank Awal Periode', styles: { fontStyle: 'normal', halign: 'right' } },
    { content: formatIDR(data.cashFlow.beginningCash), styles: { fontStyle: 'normal', halign: 'right' } }
  ]);
  cfRows.push([
    { content: 'SALDO KAS & BANK AKHIR PERIODE', styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', fillColor: [15, 23, 42], textColor: [255, 255, 255], cellPadding: 3.5 } },
    { content: formatIDR(data.cashFlow.endingCash), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', fillColor: [15, 23, 42], textColor: [52, 211, 153], cellPadding: 3.5 } }
  ]);

  autoTable(doc, {
    startY: startY3,
    head: [['Aktivitas Arus Kas', 'Nominal (IDR)']],
    body: cfRows,
    theme: 'plain',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 'auto', fontSize: 8.5 }, 1: { cellWidth: 55, halign: 'right', fontSize: 8.5 } },
    styles: { overflow: 'linebreak', cellPadding: 2, font: 'helvetica', lineColor: [226, 232, 240], lineWidth: 0.2 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  renderSignaturesAndFooter(doc, finalY);

  const cleanPeriod = data.periodText.replace(/\s+/g, '_');
  doc.save(`Paket_Laporan_Keuangan_ThreeMister_${cleanPeriod}.pdf`);
};

// ==========================================
// 5. EXPORT RINGKASAN KEUANGAN (LABA RUGI & NERACA) PDF
// ==========================================
export interface FinancialSummaryExportData {
  periodText: string;
  profitLoss: ProfitLossExportData;
  balanceSheet: BalanceSheetExportData;
}

export const exportFinancialSummaryPDF = (data: FinancialSummaryExportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = renderReportHeader({
    doc,
    title: 'Ringkasan Laporan Keuangan (Financial Summary)',
    subtitle: 'IKHTISAR RESMI LABA RUGI & NERACA KEUANGAN',
    periodText: data.periodText,
  });

  // Calculate Key Performance Metrics
  const revenue = data.profitLoss.totalRevenue;
  const hpp = data.profitLoss.totalHPP;
  const labaKotor = data.profitLoss.labaKotor;
  const opex = data.profitLoss.totalOPEX;
  const netProfit = data.profitLoss.netProfit;
  const isProfit = netProfit >= 0;

  const grossMargin = revenue > 0 ? ((labaKotor / revenue) * 100).toFixed(1) : '0.0';
  const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';
  const hppRatio = revenue > 0 ? ((hpp / revenue) * 100).toFixed(1) : '0.0';
  const opexRatio = revenue > 0 ? ((opex / revenue) * 100).toFixed(1) : '0.0';

  const totalAssets = data.balanceSheet.totalAssets;
  const totalLiabilities = data.balanceSheet.totalLiabilities;
  const totalEquity = data.balanceSheet.totalEquity;
  const totalPasiva = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalPasiva) < 1;

  // 1. EXECUTIVE KPI SUMMARY TILES
  autoTable(doc, {
    startY: startY,
    body: [
      [
        {
          content: `TOTAL PENDAPATAN\n${formatIDR(revenue)}`,
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252], textColor: [15, 23, 42], fontSize: 8 }
        },
        {
          content: `LABA KOTOR (GROSS)\n${formatIDR(labaKotor)} (${grossMargin}%)`,
          styles: {
            fontStyle: 'bold',
            halign: 'center',
            fillColor: labaKotor >= 0 ? [240, 253, 244] : [254, 242, 242],
            textColor: labaKotor >= 0 ? [5, 150, 105] : [225, 29, 72],
            fontSize: 8
          }
        },
        {
          content: `LABA BERSIH (NET)\n${formatIDR(netProfit)} (${netMargin}%)`,
          styles: {
            fontStyle: 'bold',
            halign: 'center',
            fillColor: isProfit ? [236, 253, 245] : [255, 241, 242],
            textColor: isProfit ? [4, 120, 87] : [190, 18, 60],
            fontSize: 8
          }
        },
        {
          content: `TOTAL ASET (AKTIVA)\n${formatIDR(totalAssets)}`,
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [239, 246, 255], textColor: [30, 64, 175], fontSize: 8 }
        },
        {
          content: `STATUS NERACA\n${isBalanced ? 'SEIMBANG' : 'SELISIH'}`,
          styles: {
            fontStyle: 'bold',
            halign: 'center',
            fillColor: isBalanced ? [240, 253, 244] : [254, 242, 242],
            textColor: isBalanced ? [22, 101, 52] : [153, 27, 27],
            fontSize: 8
          }
        }
      ]
    ],
    theme: 'grid',
    styles: {
      cellPadding: 2.5,
      font: 'helvetica',
      lineColor: [226, 232, 240],
      lineWidth: 0.25
    }
  });

  // 2. COMBINED SUMMARY ROWS: LABA RUGI & NERACA
  const summaryRows: any[] = [];

  // === BAGIAN I: LABA RUGI ===
  summaryRows.push([
    {
      content: 'BAGIAN I: IKHTISAR LAPORAN LABA RUGI (INCOME STATEMENT)',
      colSpan: 3,
      styles: { fontStyle: 'bold', fillColor: [88, 0, 1], textColor: [255, 255, 255], fontSize: 9, cellPadding: 2.6 }
    }
  ]);

  // 1. Pendapatan
  summaryRows.push([
    { content: '1. PENDAPATAN OPERASIONAL USAHA (REVENUE)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.profitLoss.revenueList.length === 0) {
    summaryRows.push(['-', 'Tidak ada mutasi pendapatan pada periode ini', formatIDR(0)]);
  } else {
    data.profitLoss.revenueList.forEach(item => {
      summaryRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  summaryRows.push([
    { content: 'TOTAL PENDAPATAN OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(revenue), styles: { fontStyle: 'bold', halign: 'right', textColor: [5, 150, 105] } }
  ]);

  // 2. HPP
  summaryRows.push([
    { content: '2. BEBAN POKOK PENJUALAN (HPP / COGS)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.profitLoss.hppList.length === 0) {
    summaryRows.push(['5-1001', 'Harga Pokok Penjualan (HPP)', formatIDR(0)]);
  } else {
    data.profitLoss.hppList.forEach(item => {
      summaryRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  summaryRows.push([
    { content: 'TOTAL HARGA POKOK PENJUALAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(hpp), styles: { fontStyle: 'bold', halign: 'right', textColor: [225, 29, 72] } }
  ]);

  // Subtotal Laba Kotor
  summaryRows.push([
    { content: `LABA KOTOR USAHA (GROSS PROFIT) — Margin: ${grossMargin}%`, colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
    { content: formatIDR(labaKotor), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: labaKotor >= 0 ? [5, 150, 105] : [225, 29, 72] } }
  ]);

  // 3. OPEX
  summaryRows.push([
    { content: '3. BEBAN OPERASIONAL USAHA (OPERATING EXPENSES)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.profitLoss.opexList.length === 0) {
    summaryRows.push(['-', 'Tidak ada beban operasional yang dicatat', formatIDR(0)]);
  } else {
    data.profitLoss.opexList.forEach(item => {
      summaryRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  summaryRows.push([
    { content: 'TOTAL BEBAN OPERASIONAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(opex), styles: { fontStyle: 'bold', halign: 'right', textColor: [225, 29, 72] } }
  ]);

  // Laba Bersih
  summaryRows.push([
    {
      content: isProfit 
        ? `LABA BERSIH PERIODE BERJALAN (NET PROFIT) — Net Margin: ${netMargin}%`
        : `RUGI BERSIH PERIODE BERJALAN (NET LOSS) — Margin: ${netMargin}%`,
      colSpan: 2,
      styles: {
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        cellPadding: 3,
      }
    },
    {
      content: formatIDR(netProfit),
      styles: {
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: isProfit ? [52, 211, 153] : [251, 113, 133],
        cellPadding: 3,
      }
    }
  ]);

  // Spacer
  summaryRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1.5, fillColor: [255, 255, 255] } }]);

  // === BAGIAN II: NERACA KEUANGAN ===
  summaryRows.push([
    {
      content: 'BAGIAN II: IKHTISAR NERACA KEUANGAN (BALANCE SHEET)',
      colSpan: 3,
      styles: { fontStyle: 'bold', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, cellPadding: 2.6 }
    }
  ]);

  // 1. Aktiva / Aset
  summaryRows.push([
    { content: '1. AKTIVA / ASET (ASSETS)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.balanceSheet.assetList.length === 0) {
    summaryRows.push(['-', 'Tidak ada saldo aktiva tercatat', formatIDR(0)]);
  } else {
    data.balanceSheet.assetList.forEach(item => {
      summaryRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  summaryRows.push([
    { content: 'TOTAL AKTIVA (TOTAL ASSETS)', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } },
    { content: formatIDR(totalAssets), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252], textColor: [15, 23, 42] } }
  ]);

  // 2. Kewajiban / Utang
  summaryRows.push([
    { content: '2. KEWAJIBAN / UTANG (LIABILITIES)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  if (data.balanceSheet.liabilityList.length === 0) {
    summaryRows.push(['-', 'Tidak ada kewajiban / utang tercatat', formatIDR(0)]);
  } else {
    data.balanceSheet.liabilityList.forEach(item => {
      summaryRows.push([item.code, item.name, formatIDR(item.amount)]);
    });
  }
  summaryRows.push([
    { content: 'TOTAL KEWAJIBAN / UTANG', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(totalLiabilities), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);

  // 3. Ekuitas / Modal
  summaryRows.push([
    { content: '3. EKUITAS / MODAL BERSIH (EQUITY)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
  ]);
  data.balanceSheet.equityList.forEach(item => {
    summaryRows.push([item.code, item.name, formatIDR(item.amount)]);
  });
  summaryRows.push(['3-2000', 'Laba Bersih Periode Berjalan', formatIDR(netProfit)]);
  summaryRows.push([
    { content: 'TOTAL EKUITAS / MODAL BERSIH', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatIDR(totalEquity), styles: { fontStyle: 'bold', halign: 'right' } }
  ]);

  // Total Pasiva
  summaryRows.push([
    {
      content: 'TOTAL KEWAJIBAN & EKUITAS (PASIVA)',
      colSpan: 2,
      styles: {
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        cellPadding: 3,
      }
    },
    {
      content: formatIDR(totalPasiva),
      styles: {
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'right',
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        cellPadding: 3,
      }
    }
  ]);

  // Keseimbangan Status
  summaryRows.push([
    {
      content: isBalanced
        ? 'STATUS NERACA: BALANCE (SEIMBANG) — AKTIVA = KEWAJIBAN + EKUITAS'
        : `STATUS NERACA: TIDAK SEIMBANG (SELISIH ${formatIDR(Math.abs(totalAssets - totalPasiva))})`,
      colSpan: 3,
      styles: {
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
        fillColor: isBalanced ? [236, 253, 245] : [255, 241, 242],
        textColor: isBalanced ? [4, 120, 87] : [190, 18, 60],
        cellPadding: 2.6,
      }
    }
  ]);

  // Spacer
  summaryRows.push([{ content: '', colSpan: 3, styles: { cellPadding: 1.5, fillColor: [255, 255, 255] } }]);

  // === BAGIAN III: RASIO & INDIKATOR KEUANGAN UTAMA ===
  summaryRows.push([
    {
      content: 'BAGIAN III: INDIKATOR & RASIO KEUANGAN UTAMA (KEY RATIOS)',
      colSpan: 3,
      styles: { fontStyle: 'bold', fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8.5, cellPadding: 2.2 }
    }
  ]);
  summaryRows.push(['R-01', 'Margin Laba Kotor (Gross Profit Margin)', `${grossMargin}%`]);
  summaryRows.push(['R-02', 'Margin Laba Bersih (Net Profit Margin)', `${netMargin}%`]);
  summaryRows.push(['R-03', 'Rasio Beban Pokok Penjualan (HPP / Revenue)', `${hppRatio}%`]);
  summaryRows.push(['R-04', 'Rasio Beban Operasional (OPEX / Revenue)', `${opexRatio}%`]);
  const debtToAsset = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : '0.0';
  summaryRows.push(['R-05', 'Rasio Utang terhadap Total Aset (Debt to Asset Ratio)', `${debtToAsset}%`]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3,
    head: [['Kode Akun', 'Pos Laporan Keuangan (Laba Rugi & Neraca)', 'Jumlah (IDR)']],
    body: summaryRows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 26, fontSize: 8 },
      1: { cellWidth: 'auto', fontSize: 8.5 },
      2: { cellWidth: 44, halign: 'right', fontSize: 8.5 },
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 1.8,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'head' && hookData.column.index === 2) {
        hookData.cell.styles.halign = 'right';
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  renderSignaturesAndFooter(doc, finalY);

  const cleanPeriod = data.periodText.replace(/[\s/\\:]+/g, '_');
  doc.save(`Ringkasan_Keuangan_ThreeMister_${cleanPeriod}.pdf`);
};
