/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Transaction, TrialBalanceItem } from '../types';
import { Check, AlertTriangle, ListFilter } from 'lucide-react';

interface TrialBalanceViewerProps {
  accounts: Account[];
  transactions: Transaction[];
}

export default function TrialBalanceViewer({ accounts, transactions }: TrialBalanceViewerProps) {
  
  // Calculate trial balance items
  const trialBalanceItems: TrialBalanceItem[] = accounts.map(acc => {
    // 1. Calculate sum of debits and credits for this account
    let totalDebit = 0;
    let totalCredit = 0;

    transactions.forEach(t => {
      if (t.debitAccount === acc.code) {
        totalDebit += t.amount;
      }
      if (t.creditAccount === acc.code) {
        totalCredit += t.amount;
      }
    });

    // 2. Adjust based on normal balance to find final balance
    let finalDebit = 0;
    let finalCredit = 0;

    if (acc.normalBalance === 'Debit') {
      const net = acc.initialBalance + totalDebit - totalCredit;
      if (net >= 0) {
        finalDebit = net;
      } else {
        finalCredit = Math.abs(net);
      }
    } else {
      const net = acc.initialBalance + totalCredit - totalDebit;
      if (net >= 0) {
        finalCredit = net;
      } else {
        finalDebit = Math.abs(net);
      }
    }

    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: finalDebit,
      credit: finalCredit
    };
  }).filter(item => item.debit > 0 || item.credit > 0); // Only show active accounts (with balance)

  // Sort by account code
  const sortedItems = trialBalanceItems.sort((a, b) => a.code.localeCompare(b.code));

  // Sum total debits and credits
  const totalDebitSum = sortedItems.reduce((sum, item) => sum + item.debit, 0);
  const totalCreditSum = sortedItems.reduce((sum, item) => sum + item.credit, 0);

  // Check if balanced
  const isBalanced = Math.abs(totalDebitSum - totalCreditSum) < 0.01;

  return (
    <div id="trial-balance-viewer" className="space-y-6">
      {/* Description & Balanced Status */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Neraca Saldo (Trial Balance)</h2>
          <p className="text-slate-500 text-sm mt-1">
            Daftar saldo akhir seluruh akun buku besar untuk memverifikasi keseimbangan debit dan kredit secara real-time.
          </p>
        </div>

        {/* Balanced Banner */}
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
          isBalanced 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {isBalanced ? (
            <>
              <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wider">Status Neraca</p>
                <p className="text-sm font-medium mt-0.5">Seimbang (Balanced)</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-1.5 bg-rose-500 text-white rounded-lg animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wider text-rose-700">Status Neraca</p>
                <p className="text-sm font-semibold mt-0.5">Tidak Seimbang (Selisih: {
                  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(totalDebitSum - totalCreditSum))
                })</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Rekening Buku Besar</span>
          <span className="text-slate-400 text-xs">Total Akun Aktif: {sortedItems.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6 w-32">Kode Akun</th>
                <th className="py-3.5 px-6">Nama Rekening Buku Besar</th>
                <th className="py-3.5 px-6 w-40">Kategori Akun</th>
                <th className="py-3.5 px-6 text-right w-44">Debit</th>
                <th className="py-3.5 px-6 text-right w-44">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedItems.length > 0 ? (
                sortedItems.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-slate-700">{item.code}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-900">{item.name}</td>
                    <td className="py-3.5 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.type === 'Aktiva' ? 'bg-blue-50 text-blue-700' :
                        item.type === 'Kewajiban' ? 'bg-amber-50 text-amber-700' :
                        item.type === 'Modal' ? 'bg-purple-50 text-purple-700' :
                        item.type === 'Pendapatan' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono text-slate-700">
                      {item.debit > 0 
                        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.debit)
                        : '-'
                      }
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono text-slate-700">
                      {item.credit > 0 
                        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.credit)
                        : '-'
                      }
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="text-sm">Tidak ada saldo akhir akun yang bernilai. Silakan masukkan saldo awal atau tambah transaksi.</p>
                  </td>
                </tr>
              )}
              
              {/* Totals Row */}
              {sortedItems.length > 0 && (
                <tr className="bg-[#580001] text-white font-bold border-t-2 border-[#580001]">
                  <td colSpan={3} className="py-4 px-6 text-right uppercase tracking-wider text-xs">
                    Total Neraca Saldo:
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-sm">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalDebitSum)}
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-sm">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalCreditSum)}
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
