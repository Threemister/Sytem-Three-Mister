/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Account, Transaction, JournalEntry } from '../types';
import { Calendar, Search, FileText } from 'lucide-react';

interface JournalViewerProps {
  accounts: Account[];
  transactions: Transaction[];
}

export default function JournalViewer({ accounts, transactions }: JournalViewerProps) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper to map accounts
  const getAccountName = (code: string) => {
    return accounts.find(a => a.code === code)?.name || 'Akun Tidak Ditemukan';
  };

  const getAccountType = (code: string) => {
    return accounts.find(a => a.code === code)?.type || 'Aktiva';
  };

  // Convert transactions to Journal Entries (each transaction is represented as two lines: Debit & Credit)
  const journalEntries: JournalEntry[] = [];
  
  transactions.forEach(trx => {
    // 1. Debit Entry
    journalEntries.push({
      id: trx.id + '-D',
      date: trx.date,
      refNum: trx.refNum,
      description: trx.description,
      code: trx.debitAccount,
      accountName: getAccountName(trx.debitAccount),
      type: getAccountType(trx.debitAccount),
      debit: trx.amount,
      credit: 0
    });

    // 2. Credit Entry
    journalEntries.push({
      id: trx.id + '-C',
      date: trx.date,
      refNum: trx.refNum,
      description: trx.description,
      code: trx.creditAccount,
      accountName: getAccountName(trx.creditAccount),
      type: getAccountType(trx.creditAccount),
      debit: 0,
      credit: trx.amount
    });
  });

  // Sort by date YYYY-MM-DD, then by transaction reference, then by Debit first (Debit has amount > 0)
  const sortedJournal = journalEntries.sort((a, b) => {
    // First compare date
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;

    // Second compare ref number
    const refCompare = b.refNum.localeCompare(a.refNum);
    if (refCompare !== 0) return refCompare;

    // Third, put debits first
    return b.debit - a.debit;
  });

  // Apply filters
  const filteredJournal = sortedJournal.filter(entry => {
    const matchesSearch = 
      entry.description.toLowerCase().includes(search.toLowerCase()) ||
      entry.refNum.toLowerCase().includes(search.toLowerCase()) ||
      entry.accountName.toLowerCase().includes(search.toLowerCase()) ||
      entry.code.includes(search);

    const matchesStartDate = !startDate || entry.date >= startDate;
    const matchesEndDate = !endDate || entry.date <= endDate;

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  // Calculate totals
  const totalDebit = filteredJournal.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = filteredJournal.reduce((sum, item) => sum + item.credit, 0);

  return (
    <div id="journal-viewer" className="space-y-6">
      {/* Filter and Description */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Jurnal Umum (General Journal)</h2>
            <p className="text-slate-500 text-sm mt-1">
              Catatan kronologis sistematis dari seluruh transaksi finansial berpasangan (double-entry).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari keterangan, No Ref, atau akun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <span className="text-xs text-slate-500 shrink-0 font-medium">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] focus:bg-white"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-28">Tanggal</th>
                <th className="py-3.5 px-6 w-32">No Ref</th>
                <th className="py-3.5 px-6 w-1/3">Keterangan Akun & Transaksi</th>
                <th className="py-3.5 px-6 w-28">Kode Akun</th>
                <th className="py-3.5 px-6 text-right w-36">Debit</th>
                <th className="py-3.5 px-6 text-right w-36">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredJournal.length > 0 ? (
                filteredJournal.map((entry, index) => {
                  // Check if this is the start of a new transaction block to render the description
                  const isDebit = entry.debit > 0;
                  const isNewBlock = isDebit; // Since Debit is always first in our sorting
                  
                  return (
                    <tr key={entry.id} className={`${isDebit ? 'bg-white' : 'bg-slate-50/10'} hover:bg-slate-50/40 transition`}>
                      <td className="py-3.5 px-6 text-slate-500 text-xs font-mono">
                        {isNewBlock ? entry.date : ''}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-800">
                        {isNewBlock ? entry.refNum : ''}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col">
                          <span className={`font-medium ${isDebit ? 'text-slate-900' : 'text-slate-600 pl-8 italic'}`}>
                            {entry.accountName}
                          </span>
                          {isNewBlock && entry.description && (
                            <span className="text-slate-400 text-xs mt-1 font-light italic pl-1">
                              "{entry.description}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-500">
                        {entry.code}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-medium text-slate-900">
                        {entry.debit > 0 
                          ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.debit)
                          : '-'
                        }
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-medium text-slate-900">
                        {entry.credit > 0 
                          ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(entry.credit)
                          : '-'
                        }
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm">Tidak ada entri jurnal yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Totals Row */}
              {filteredJournal.length > 0 && (
                <tr className="bg-[#580001] text-white font-bold border-t-2 border-[#580001]">
                  <td colSpan={4} className="py-4 px-6 text-right uppercase tracking-wider text-xs">
                    Total Jurnal (Balanced Check):
                  </td>
                  <td className="py-4 px-6 text-right font-mono">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalDebit)}
                  </td>
                  <td className="py-4 px-6 text-right font-mono">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalCredit)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
