'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PinGate } from '@/components/admin/PinGate';
import { DailyReport } from '@/components/reports/DailyReport';
import { MonthlyReport } from '@/components/reports/MonthlyReport';

type Tab = 'daily' | 'monthly';

function ReportsScreen() {
  const [tab, setTab] = useState<Tab>('daily');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
        >
          ← Back to POS
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tab Nav */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {([
            { id: 'daily' as Tab, label: '📅 Daily Report' },
            { id: 'monthly' as Tab, label: '📆 Monthly Report' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Report Panels */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {tab === 'daily' && <DailyReport />}
          {tab === 'monthly' && <MonthlyReport />}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <PinGate onSuccess={() => setAuthenticated(true)} title="Reports — Admin PIN" />;
  }

  return <ReportsScreen />;
}
