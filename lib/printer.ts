/**
 * lib/printer.ts
 * ─────────────────────────────────────────────────────────────
 * Dual-mode printing for Cherrys Bakery POS.
 *
 * Two modes (stored in localStorage key "printMode"):
 *   'tcp'      — Raw ESC-POS bytes over TCP port 9100 (default)
 *   'airprint' — Native AirPrint / Android PrintManager via HTML
 *
 * printBill(bill):
 *   1. Saves the bill to Supabase (existing logic, untouched)
 *   2. Prints via the selected mode
 * ─────────────────────────────────────────────────────────────
 */

import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
import type { ReceiptData } from '@/lib/types';

// ─── Capacitor plugin bridge ─────────────────────────────────

interface PrinterPlugin {
  printTCP(options: { printerIp: string; printerPort: number; receiptData: string }): Promise<{ success: boolean }>;
  printSystem(options: { receiptData: string }): Promise<{ success: boolean }>;
}

// Registers the native PrinterPlugin on Android/iOS; returns a no-op stub in browser
const Printer = registerPlugin<PrinterPlugin>('Printer', {
  // Browser web fallback — never called because we gate on Capacitor.isNativePlatform()
  web: {
    printTCP: async () => ({ success: false }),
    printSystem: async () => ({ success: false }),
  },
});

// ─── ESC/POS helpers ─────────────────────────────────────────

const ESC = '\x1B';
const GS  = '\x1D';

/** ESC @ — initialize printer */
const INIT         = `${ESC}@`;
/** ESC E 1 — bold on */
const BOLD_ON      = `${ESC}E\x01`;
/** ESC E 0 — bold off */
const BOLD_OFF     = `${ESC}E\x00`;
/** ESC a 1 — center align */
const ALIGN_CENTER = `${ESC}a\x01`;
/** ESC a 0 — left align */
const ALIGN_LEFT   = `${ESC}a\x00`;
/** GS V 1 — full cut */
const CUT          = `${GS}V\x01`;

function line(text: string): string {
  return text + '\n';
}

function sep(char = '-', width = 48): string {
  return char.repeat(width) + '\n';
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s.slice(-len) : ' '.repeat(len - s.length) + s;
}

// ─── Public: generateESCPOS ───────────────────────────────────

/**
 * Builds a raw ESC/POS command string for a 48-col (80 mm) thermal printer.
 * Returns a string encoded in ISO-8859-1 — the native plugin sends it byte-for-byte.
 */
export function generateESCPOS(bill: ReceiptData): string {
  const cols = 48;
  const nameW = cols - 6 - 10; // qty=6, amt=10

  let cmd = '';

  // Init
  cmd += INIT;

  // ── Header ──────────────────────────────────────────────────
  cmd += ALIGN_CENTER;
  cmd += BOLD_ON;
  cmd += line(bill.restaurantName.toUpperCase());
  cmd += BOLD_OFF;
  if (bill.gstNumber) {
    cmd += line(`GST: ${bill.gstNumber}`);
  }
  cmd += ALIGN_LEFT;
  cmd += sep('=', cols);

  // ── Bill info ────────────────────────────────────────────────
  const ts = new Date(bill.timestamp);
  const dateStr = ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  cmd += line(`Bill#: ${bill.billNumber}`);
  cmd += line(`${padRight(dateStr, cols - timeStr.length)}${timeStr}`);
  cmd += sep('-', cols);

  // ── Column header ────────────────────────────────────────────
  cmd += BOLD_ON;
  cmd += padRight('ITEM', nameW) + padLeft('QTY', 6) + padLeft('AMT', 10) + '\n';
  cmd += BOLD_OFF;
  cmd += sep('-', cols);

  // ── Items ─────────────────────────────────────────────────────
  for (const item of bill.items) {
    const name = padRight(item.product_name, nameW);
    const qty  = padLeft(String(item.quantity), 6);
    const amt  = padLeft(item.line_total.toFixed(2), 10);
    cmd += `${name}${qty}${amt}\n`;
  }

  cmd += sep('=', cols);

  // ── Totals ────────────────────────────────────────────────────
  const totW = cols - 20;
  cmd += padRight('Subtotal', totW) + padLeft(bill.subtotal.toFixed(2), 20) + '\n';
  cmd += padRight(`GST (${bill.gstPercentage}%)`, totW) + padLeft(bill.gstAmount.toFixed(2), 20) + '\n';
  cmd += sep('=', cols);

  // ── Grand total ───────────────────────────────────────────────
  cmd += BOLD_ON;
  cmd += padRight('TOTAL', totW) + padLeft(bill.total.toFixed(2), 20) + '\n';
  cmd += BOLD_OFF;
  cmd += sep('=', cols);

  // ── Payment method ────────────────────────────────────────────
  const methodLabel = { cash: 'CASH', upi: 'UPI', card: 'CARD' }[bill.paymentMethod] ?? bill.paymentMethod.toUpperCase();
  cmd += BOLD_ON;
  cmd += line(`Paid: ${methodLabel}`);
  cmd += BOLD_OFF;
  cmd += sep('=', cols);

  // ── Footer ────────────────────────────────────────────────────
  cmd += ALIGN_CENTER;
  cmd += line('Thank You! Visit Again.');
  cmd += ALIGN_LEFT;

  // Feed + cut
  cmd += '\n\n\n';
  cmd += CUT;

  return cmd;
}

// ─── Public: generatePrintableHTML ───────────────────────────

/**
 * Generates a clean, styled HTML receipt for AirPrint / Android PrintManager.
 * Uses inline styles only — no external resources needed.
 */
export function generatePrintableHTML(bill: ReceiptData): string {
  const ts = new Date(bill.timestamp);
  const dateStr = ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const methodLabel = { cash: 'CASH', upi: 'UPI', card: 'CARD' }[bill.paymentMethod] ?? bill.paymentMethod.toUpperCase();

  const itemRows = bill.items
    .map(
      (item) => `
      <tr>
        <td style="padding:4px 6px;text-align:left;word-break:break-word;">${item.product_name}</td>
        <td style="padding:4px 6px;text-align:center;white-space:nowrap;">${item.quantity}</td>
        <td style="padding:4px 6px;text-align:right;white-space:nowrap;">₹${item.line_total.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:0 6px 4px;font-size:10px;color:#666;">@ ₹${item.unit_price.toFixed(2)} each</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Receipt — ${bill.billNumber}</title>
  <style>
    @media print {
      @page { margin: 10mm; size: 80mm auto; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .receipt {
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
      padding: 8px;
    }
    h1 { text-align: center; font-size: 16px; margin: 0 0 2px; letter-spacing: 1px; }
    .gst { text-align: center; font-size: 11px; margin-bottom: 6px; }
    .sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .sep-solid { border: none; border-top: 2px solid #000; margin: 6px 0; }
    .bill-info { display: flex; justify-content: space-between; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; padding: 4px 6px; border-top: 1px solid #000; border-bottom: 1px solid #000; }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3) { text-align: right; }
    .totals td { padding: 3px 6px; }
    .totals td:first-child { text-align: left; }
    .totals td:last-child { text-align: right; }
    .grand-total td { font-weight: bold; font-size: 14px; border-top: 2px solid #000; }
    .payment { margin-top: 6px; font-weight: bold; }
    .footer { text-align: center; margin-top: 10px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="receipt">
    <h1>${bill.restaurantName.toUpperCase()}</h1>
    ${bill.gstNumber ? `<div class="gst">GST: ${bill.gstNumber}</div>` : ''}

    <hr class="sep-solid"/>

    <div class="bill-info">
      <span><strong>Bill#:</strong> ${bill.billNumber}</span>
    </div>
    <div class="bill-info">
      <span>${dateStr}</span>
      <span>${timeStr}</span>
    </div>

    <hr class="sep"/>

    <table>
      <thead>
        <tr>
          <th style="width:55%">ITEM</th>
          <th style="width:15%">QTY</th>
          <th style="width:30%">AMT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <hr class="sep-solid"/>

    <table class="totals">
      <tr>
        <td>Subtotal</td>
        <td>₹${bill.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td>GST (${bill.gstPercentage}%)</td>
        <td>₹${bill.gstAmount.toFixed(2)}</td>
      </tr>
    </table>

    <table class="totals grand-total">
      <tr>
        <td>TOTAL</td>
        <td>₹${bill.total.toFixed(2)}</td>
      </tr>
    </table>

    <hr class="sep-solid"/>

    <div class="payment">Paid: ${methodLabel}</div>

    <hr class="sep"/>

    <div class="footer">Thank You! Visit Again.</div>
  </div>
</body>
</html>`;
}

// ─── Public: printBill ────────────────────────────────────────

/**
 * Main print entry point. Call this after payment is confirmed.
 *
 * Flow:
 *  1. Saves bill via existing saveBillToSupabase (not modified here — POSScreen handles it)
 *  2. Reads printMode from localStorage ('tcp' | 'airprint', default 'tcp')
 *  3. If native platform → calls TCP or AirPrint native plugin
 *  4. Else → falls back to window.print() (browser/PWA)
 *
 * NOTE: Supabase saving (createSale) continues to live in POSScreen.tsx
 *       to avoid duplicating offline-queue and retry logic. This function
 *       is purely the printing side.
 */
export async function printBill(bill: ReceiptData): Promise<void> {
  const printMode  = (typeof window !== 'undefined' ? localStorage.getItem('printMode') : null) ?? 'tcp';
  const printerIp  = (typeof window !== 'undefined' ? localStorage.getItem('printerIp') : null) ?? '192.168.1.100';
  const printerPort = parseInt(
    (typeof window !== 'undefined' ? localStorage.getItem('printerPort') : null) ?? '9100',
    10
  );

  try {
    if (Capacitor.isNativePlatform()) {
      if (printMode === 'airprint') {
        // AirPrint / Android PrintManager
        const html = generatePrintableHTML(bill);
        await Printer.printSystem({ receiptData: html });
      } else {
        // TCP / ESC-POS (default)
        const escpos = generateESCPOS(bill);
        await Printer.printTCP({ printerIp, printerPort, receiptData: escpos });
      }
    } else {
      // Browser / PWA fallback — trigger window.print()
      window.print();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    alert(`Print failed: ${message}\n\nCheck printer connection and try again.`);
    throw err; // re-throw so caller can handle if needed
  }
}
