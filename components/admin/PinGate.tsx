'use client';

import { useState, useRef } from 'react';
import { verifyPin } from '@/actions/settings';

interface Props {
  onSuccess: () => void;
  title?: string;
}

export function PinGate({ onSuccess, title = 'Enter Admin PIN' }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDigit = (d: string) => {
    if (pin.length >= 8) return;
    setError('');
    setPin((prev) => prev + d);
  };

  const handleBackspace = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!pin || loading) return;
    setLoading(true);
    try {
      const ok = await verifyPin(pin);
      if (ok) {
        onSuccess();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="safe-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xs">
        {/* Icon + Title */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">Admin access required</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? 'bg-orange-500 border-orange-500'
                  : 'bg-transparent border-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Hidden input for keyboard fallback */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          className="sr-only"
          value={pin}
          onChange={(e) => {
            setError('');
            setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === '⌫') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  className="h-14 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xl font-medium transition-colors flex items-center justify-center"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                className="h-14 rounded-xl bg-slate-100 hover:bg-orange-100 active:bg-orange-200 text-slate-900 text-xl font-semibold transition-colors"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm text-center mb-3 font-medium">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!pin || loading}
          className="w-full h-13 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base transition-colors"
        >
          {loading ? 'Verifying...' : 'Unlock'}
        </button>

        {/* Back to POS */}
        <a
          href="/"
          className="block text-center text-sm text-slate-400 hover:text-slate-600 mt-4 transition-colors"
        >
          ← Back to POS
        </a>
      </div>
    </div>
  );
}
