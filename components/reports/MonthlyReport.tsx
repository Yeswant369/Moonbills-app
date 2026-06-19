'use client';

import { useState } from 'react';
import { SaleWithItems } from '@/lib/types';
import { formatCurrency, formatDate, getPaymentLabel, currentYearMonth } from '@/lib/utils';
import { getMonthlySales } from '@/actions/sales';

export function MonthlyReport() {
  const { year: curYear, month: curMonth } = currentYearMonth();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  const years = Array.from({ length: 5 }, (_, i) => curYear - i);

  const loadSales = async () => {
    setLoading(true);
    const data = await getMonthlySales(year, month);
    setSales(data);
    setLoaded(true);
    setLoading(false);
  };

  // Summary
  const totalBills = sales.length;
  const totalRevenue = sales.reduce((s, sale) => s + sale.total_amount, 0);
  const cashRevenue = sales.filter((s) => s.payment_method === 'cash').reduce((s, sale) => s + sale.total_amount, 0);
  const upiRevenue = sales.filter((s) => s.payment_method === 'upi').reduce((s, sale) => s + sale.total_amount, 0);
  const cardRevenue = sales.filter((s) => s.payment_method === 'card').reduce((s, sale) => s + sale.total_amount, 0);

  // Group by day
  const byDay = sales.reduce<Record<string, SaleWithItems[]>>((acc, sale) => {
    const day = sale.created_at.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(sale);
    return acc;
  }, {});

  const dayKeys = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Month/Year Picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={month}
          onChange={(e) => { setMonth(Number(e.target.value)); setLoaded(false); }}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          {months.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setLoaded(false); }}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={loadSales}
          disabled={loading}
          className="px-5 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {loading ? 'Loading…' : 'View Report'}
        </button>
      </div>

      {loaded && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Bills', value: totalBills, isCount: true },
              { label: 'Total Revenue', value: totalRevenue },
              { label: 'Cash Revenue', value: cashRevenue },
              { label: 'UPI Revenue', value: upiRevenue },
              { label: 'Card Revenue', value: cardRevenue },
            ].map(({ label, value, isCount }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                <p className="text-xl font-bold text-slate-900">
                  {isCount ? value : formatCurrency(value as number)}
                </p>
              </div>
            ))}
          </div>

          {/* Daily breakdown table */}
          {dayKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="font-medium">No sales this month</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bills</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">UPI</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Card</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Day Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {dayKeys.map((day) => {
                    const daySales = byDay[day];
                    const dayTotal = daySales.reduce((s, sale) => s + sale.total_amount, 0);
                    const dayCash = daySales.filter((s) => s.payment_method === 'cash').reduce((s, sale) => s + sale.total_amount, 0);
                    const dayUpi = daySales.filter((s) => s.payment_method === 'upi').reduce((s, sale) => s + sale.total_amount, 0);
                    const dayCard = daySales.filter((s) => s.payment_method === 'card').reduce((s, sale) => s + sale.total_amount, 0);
                    return (
                      <tr key={day} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{formatDate(day)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{daySales.length}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{dayCash > 0 ? formatCurrency(dayCash) : '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{dayUpi > 0 ? formatCurrency(dayUpi) : '—'}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{dayCard > 0 ? formatCurrency(dayCard) : '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(dayTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {months[month - 1]} {year} Total
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{totalBills}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(cashRevenue)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(upiRevenue)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(cardRevenue)}</td>
                    <td className="px-4 py-3 text-right font-black text-orange-600 text-base">{formatCurrency(totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
