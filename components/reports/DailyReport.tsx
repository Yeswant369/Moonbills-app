'use client';

import { useState } from 'react';
import { SaleWithItems } from '@/lib/types';
import { formatCurrency, formatTime, getPaymentLabel, todayString } from '@/lib/utils';
import { getDailySales } from '@/actions/sales';

export function DailyReport() {
  const [date, setDate] = useState(todayString());
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadSales = async (d: string) => {
    setLoading(true);
    const data = await getDailySales(d);
    setSales(data);
    setLoaded(true);
    setLoading(false);
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setLoaded(false);
  };

  // Computed summary
  const totalBills = sales.length;
  const totalSales = sales.reduce((s, sale) => s + sale.total_amount, 0);
  const cashSales = sales.filter((s) => s.payment_method === 'cash').reduce((s, sale) => s + sale.total_amount, 0);
  const upiSales = sales.filter((s) => s.payment_method === 'upi').reduce((s, sale) => s + sale.total_amount, 0);
  const cardSales = sales.filter((s) => s.payment_method === 'card').reduce((s, sale) => s + sale.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={date}
          max={todayString()}
          onChange={(e) => handleDateChange(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          onClick={() => loadSales(date)}
          disabled={loading}
          className="px-5 h-10 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-200 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {loading ? 'Loading…' : 'View Report'}
        </button>
      </div>

      {loaded && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Bills', value: totalBills, isCount: true },
              { label: 'Total Revenue', value: totalSales },
              { label: 'Cash', value: cashSales },
              { label: 'UPI', value: upiSales },
              { label: 'Card', value: cardSales },
            ].map(({ label, value, isCount }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                <p className="text-xl font-bold text-slate-900">
                  {isCount ? value : formatCurrency(value as number)}
                </p>
              </div>
            ))}
          </div>

          {/* Bills Table */}
          {sales.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="font-medium">No sales on this date</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{sale.bill_number}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTime(sale.created_at)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {sale.sale_items?.map((item) => `${item.product_name} ×${item.quantity}`).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold
                          ${sale.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-700' : ''}
                          ${sale.payment_method === 'upi' ? 'bg-blue-100 text-blue-700' : ''}
                          ${sale.payment_method === 'card' ? 'bg-violet-100 text-violet-700' : ''}
                        `}>
                          {getPaymentLabel(sale.payment_method)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(sale.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-slate-700">
                      Grand Total ({totalBills} bills)
                    </td>
                    <td className="px-4 py-3 text-right font-black text-pink-600 text-base">
                      {formatCurrency(totalSales)}
                    </td>
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
