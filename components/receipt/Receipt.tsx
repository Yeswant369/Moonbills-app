import { ReceiptData, PrinterWidth } from '@/lib/types';
import { formatDate, formatTime, formatCurrency, getPaymentLabel } from '@/lib/utils';

interface Props {
  data: ReceiptData | null;
  printerWidth?: PrinterWidth;
}

/**
 * Character widths per paper size (monospace @ ~7px/char for Courier New 10-12px)
 *   58mm ≈ 32 chars   80mm ≈ 48 chars
 */
const COLS: Record<PrinterWidth, number> = { '58mm': 32, '80mm': 48 };

function makeSep(char: string, cols: number) {
  return char.repeat(cols);
}

export function Receipt({ data, printerWidth = '80mm' }: Props) {
  if (!data) return <div id="print-receipt" style={{ display: 'none' }} />;

  const ts = new Date(data.timestamp);
  const cols = COLS[printerWidth];
  const SEP_LONG  = makeSep('=', cols);
  const SEP_SHORT = makeSep('-', cols);

  // Column widths: item name flex, qty fixed, amount fixed
  // 58mm: qty=3, amount=8  →  name fills remainder
  // 80mm: qty=4, amount=10 →  name fills remainder
  const qtyW   = printerWidth === '58mm' ? '24px' : '30px';
  const amtW   = printerWidth === '58mm' ? '62px' : '80px';

  const wrapperClass = `thermal-${printerWidth}`;

  return (
    <div id="print-receipt" className={wrapperClass}>
      <div className="receipt-body">

        {/* ── Shop Header ─────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{ fontSize: 'inherit', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            {data.restaurantName.toUpperCase()}
          </div>
          {data.gstNumber && (
            <div style={{ marginTop: '1px' }}>
              GST: {data.gstNumber}
            </div>
          )}
        </div>

        <div className="sep">{SEP_LONG}</div>

        {/* ── Bill Info ────────────────────────────────── */}
        <div style={{ marginBottom: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Bill#: <strong>{data.billNumber}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{formatDate(ts)}</span>
            <span>{formatTime(ts)}</span>
          </div>
        </div>

        <div className="sep">{SEP_SHORT}</div>

        {/* ── Column Header ────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '1px' }}>
          <span style={{ flex: 1 }}>ITEM</span>
          <span style={{ width: qtyW, textAlign: 'center' }}>QTY</span>
          <span style={{ width: amtW, textAlign: 'right' }}>AMT</span>
        </div>

        <div className="sep">{SEP_SHORT}</div>

        {/* ── Items ────────────────────────────────────── */}
        {data.items.map((item, i) => (
          <div key={i} style={{ marginBottom: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ flex: 1, marginRight: '3px', wordBreak: 'break-word' }}>
                {item.product_name}
              </span>
              <span style={{ width: qtyW, textAlign: 'center', flexShrink: 0 }}>
                {item.quantity}
              </span>
              <span style={{ width: amtW, textAlign: 'right', flexShrink: 0 }}>
                {formatCurrency(item.line_total)}
              </span>
            </div>
            <div style={{ paddingLeft: '2px', opacity: 0.7, fontSize: '0.85em' }}>
              @ {formatCurrency(item.unit_price)} each
            </div>
          </div>
        ))}

        <div className="sep">{SEP_LONG}</div>

        {/* ── Totals ───────────────────────────────────── */}
        <div style={{ marginBottom: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>GST ({data.gstPercentage}%)</span>
            <span>{formatCurrency(data.gstAmount)}</span>
          </div>
        </div>

        <div className="sep">{SEP_LONG}</div>

        {/* ── Grand Total ──────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.15em', marginBottom: '3px' }}>
          <span>TOTAL</span>
          <span>{formatCurrency(data.total)}</span>
        </div>

        <div className="sep">{SEP_LONG}</div>

        {/* ── Payment ──────────────────────────────────── */}
        <div style={{ marginBottom: '3px' }}>
          <strong>Paid: {getPaymentLabel(data.paymentMethod)}</strong>
        </div>

        <div className="sep">{SEP_LONG}</div>

        {/* ── Footer ───────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '4px', lineHeight: '1.6' }}>
          <div>Thank You! Visit Again.</div>
        </div>

      </div>
    </div>
  );
}
