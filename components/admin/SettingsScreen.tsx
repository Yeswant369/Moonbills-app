'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Category, Product, Settings, PrinterWidth } from '@/lib/types';
import { PinGate } from '@/components/admin/PinGate';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { ProductManager } from '@/components/admin/ProductManager';
import { updateSettings } from '@/actions/settings';
import Link from 'next/link';

type Tab = 'general' | 'categories' | 'products';

interface Props {
  initialSettings: Settings;
  initialCategories: Category[];
  initialProducts: Product[];
}

export function SettingsScreen({ initialSettings, initialCategories, initialProducts }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setSettings] = useState(initialSettings);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [form, setForm] = useState({
    restaurant_name: initialSettings.restaurant_name,
    gst_number: initialSettings.gst_number,
    gst_percentage: String(initialSettings.gst_percentage),
    new_pin: '',
    confirm_pin: '',
    printer_width: (initialSettings.printer_width ?? '80mm') as PrinterWidth,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // ── Printer connection settings (localStorage only) ────────
  const [printMode, setPrintMode] = useState<'tcp' | 'airprint'>('tcp');
  const [printerIp, setPrinterIp] = useState('192.168.1.100');
  const [printerPort, setPrinterPort] = useState('9100');
  const [printSettingsSaved, setPrintSettingsSaved] = useState(false);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    const mode = localStorage.getItem('printMode') as 'tcp' | 'airprint' | null;
    const ip   = localStorage.getItem('printerIp');
    const port = localStorage.getItem('printerPort');
    if (mode)  setPrintMode(mode);
    if (ip)    setPrinterIp(ip);
    if (port)  setPrinterPort(port);
  }, []);

  const handleSavePrintSettings = () => {
    localStorage.setItem('printMode',   printMode);
    localStorage.setItem('printerIp',   printerIp.trim());
    localStorage.setItem('printerPort', printerPort.trim() || '9100');
    setPrintSettingsSaved(true);
    setTimeout(() => setPrintSettingsSaved(false), 2000);
  };

  const handleSaveGeneral = async () => {
    setError('');
    // Validate PIN change if entered
    if (form.new_pin) {
      if (form.new_pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (form.new_pin !== form.confirm_pin) {
        setError('PINs do not match');
        return;
      }
    }
    setSaving(true);
    const updates: Partial<Settings> = {
      restaurant_name: form.restaurant_name.trim(),
      gst_number: form.gst_number.trim(),
      gst_percentage: parseFloat(form.gst_percentage) || 0,
      printer_width: form.printer_width,
    };
    if (form.new_pin) updates.admin_pin = form.new_pin;

    const result = await updateSettings(updates);
    if (result.success) {
      setSettings((s) => ({ ...s, ...updates }));
      setForm((f) => ({ ...f, new_pin: '', confirm_pin: '' }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Refresh the Next.js router cache so the POS home screen
      // picks up the new restaurant name without a full reload
      router.refresh();
    } else {
      setError(result.error ?? 'Failed to save');
    }
    setSaving(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: '⚙ General' },
    { id: 'categories', label: '📂 Categories' },
    { id: 'products', label: '🛍 Products' },
  ];

  return (
    <div className="safe-screen app-scroll overflow-y-auto bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
        >
          ← Back to POS
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">— {settings.restaurant_name}</p>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Nav */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {tabs.map((t) => (
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

        {/* ── General Tab ────────────────────────────────────── */}
        {tab === 'general' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Shop Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Restaurant / Shop Name
                  </label>
                  <input
                    type="text"
                    value={form.restaurant_name}
                    onChange={(e) => setForm((f) => ({ ...f, restaurant_name: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="e.g. Cherrys Bakery"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GST Registration Number
                  </label>
                  <input
                    type="text"
                    value={form.gst_number}
                    onChange={(e) => setForm((f) => ({ ...f, gst_number: e.target.value.toUpperCase() }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="e.g. 29AABCC1234Z1Z5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GST Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.gst_percentage}
                    onChange={(e) => setForm((f) => ({ ...f, gst_percentage: e.target.value }))}
                    className="w-32 h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">Common rates: 0%, 5%, 12%, 18%</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-base font-bold text-slate-900 mb-4">Change Admin PIN</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={form.new_pin}
                    onChange={(e) => setForm((f) => ({ ...f, new_pin: e.target.value.replace(/\D/g, '') }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Leave blank to keep current"
                    maxLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={form.confirm_pin}
                    onChange={(e) => setForm((f) => ({ ...f, confirm_pin: e.target.value.replace(/\D/g, '') }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Repeat new PIN"
                    maxLength={8}
                  />
                </div>
              </div>
            </div>

            {/* ── Printer Settings ─────────────────────────── */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-base font-bold text-slate-900 mb-1">Thermal Printer</h3>
              <p className="text-xs text-slate-400 mb-4">
                Sets the paper width for receipt printing. Use monospace layout optimised for thermal rolls.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Printer Width
                </label>
                <div className="flex gap-2">
                  {(['58mm', '80mm'] as PrinterWidth[]).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, printer_width: w }))}
                      className={`flex-1 h-20 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                        form.printer_width === w
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {/* Mini receipt preview */}
                      <span
                        className="font-mono text-xs leading-none tracking-tight px-2 py-1 rounded"
                        style={{
                          background: form.printer_width === w ? '#fff7ed' : '#f8fafc',
                          letterSpacing: '-0.03em',
                          fontSize: w === '58mm' ? '7px' : '9px',
                          lineHeight: 1.3,
                          display: 'block',
                          whiteSpace: 'pre',
                        }}
                      >{w === '58mm'
                        ? '================================\nITEM            QTY       AMT\n--------------------------------'
                        : '================================================\nITEM                  QTY          AMT\n------------------------------------------------'}
                      </span>
                      <span className="text-xs font-bold">{w}</span>
                      {w === '80mm' && <span className="text-[10px] text-slate-400 font-normal">Default</span>}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {form.printer_width === '58mm'
                    ? '58mm roll · 32 chars wide · compact layout'
                    : '80mm roll · 48 chars wide · standard layout'}
                </p>
              </div>
            </div>

            {/* ── Printing Mode ────────────────────────────── */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-base font-bold text-slate-900 mb-1">Printing</h3>
              <p className="text-xs text-slate-400 mb-4">
                Choose how receipts are sent to the printer. TCP mode is for WiFi thermal printers
                (ESC-POS over port 9100). AirPrint uses the device's native print service.
              </p>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                {(['tcp', 'airprint'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPrintMode(mode)}
                    className={`flex-1 h-16 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                      printMode === mode
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{mode === 'tcp' ? '🖨️' : '📡'}</span>
                    <span>{mode === 'tcp' ? 'Network Printer (TCP)' : 'AirPrint / System Print'}</span>
                    {mode === 'tcp' && <span className="text-[10px] text-slate-400 font-normal">Default</span>}
                  </button>
                ))}
              </div>

              {/* TCP-only: IP + Port inputs */}
              {printMode === 'tcp' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Printer IP Address
                    </label>
                    <input
                      id="printer-ip"
                      type="text"
                      inputMode="url"
                      value={printerIp}
                      onChange={(e) => setPrinterIp(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Port
                    </label>
                    <input
                      id="printer-port"
                      type="number"
                      min="1"
                      max="65535"
                      value={printerPort}
                      onChange={(e) => setPrinterPort(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="9100"
                    />
                    <p className="text-xs text-slate-400 mt-1">Default: 9100 (ESC-POS)</p>
                  </div>
                </div>
              )}

              {printMode === 'airprint' && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
                  📡 AirPrint will use your device&apos;s native printer dialog. No IP address needed.
                </div>
              )}

              <button
                type="button"
                onClick={handleSavePrintSettings}
                className="mt-4 px-6 h-10 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors"
              >
                {printSettingsSaved ? '✓ Print Settings Saved!' : 'Save Print Settings'}
              </button>
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button
              onClick={handleSaveGeneral}
              disabled={saving}
              className="px-8 h-11 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-sm rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* ── Categories Tab ──────────────────────────────────── */}
        {tab === 'categories' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Manage Categories</h2>
            <CategoryManager
              categories={categories}
              onCategoriesChange={(next) => {
                setCategories(next);
                router.refresh();
              }}
            />
          </div>
        )}

        {/* ── Products Tab ────────────────────────────────────── */}
        {tab === 'products' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Manage Products</h2>
            <ProductManager
              products={products}
              categories={categories}
              onProductsChange={(next) => {
                setProducts(next);
                router.refresh();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page export: PIN gate wrapping the settings screen ───
interface PageProps {
  initialSettings: Settings;
  initialCategories: Category[];
  initialProducts: Product[];
}

function SettingsPage({ initialSettings, initialCategories, initialProducts }: PageProps) {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <PinGate onSuccess={() => setAuthenticated(true)} title="Settings — Admin PIN" />;
  }

  return (
    <SettingsScreen
      initialSettings={initialSettings}
      initialCategories={initialCategories}
      initialProducts={initialProducts}
    />
  );
}

export default SettingsPage;
