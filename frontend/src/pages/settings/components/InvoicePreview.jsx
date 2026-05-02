import { formatCurrency } from '../../../utils/helpers';

// Live, scaled-down replica of the printed receipt. Driven entirely by the
// `store` + `settings` props so changes in the Settings form reflect here
// instantly. Numbers below are dummy data — just enough to show the layout.
//
// Width caps mirror the receiptWidth setting: 58mm/80mm thermal vs A4.
const SAMPLE_ITEMS = [
  { name: 'Panadol Extra 500mg', qty: 2, price: 5,    batch: 'B102', expiry: '06/2027' },
  { name: 'Augmentin 625mg',     qty: 1, price: 25,   batch: 'A88',  expiry: '11/2026' },
  { name: 'Calpol Syrup 60ml',   qty: 1, price: 110,  batch: 'C015', expiry: '03/2027' },
];

const ABSOLUTE = (url) =>
  url && /^https?:\/\//.test(url) ? url : url ? url : '';

export default function InvoicePreview({ store, settings }) {
  if (!store) return null;

  const widthClass =
    settings.receiptWidth === '58mm' ? 'max-w-[240px]' :
    settings.receiptWidth === 'A4'   ? 'max-w-[600px]' :
    /* 80mm default */                 'max-w-[320px]';

  const logoAlign =
    settings.logoPosition === 'left'  ? 'justify-start text-left' :
    settings.logoPosition === 'right' ? 'justify-end   text-right' :
    /* center default */                'justify-center text-center';

  const subtotal = SAMPLE_ITEMS.reduce((s, i) => s + i.qty * i.price, 0);
  const tax      = (settings.defaultTaxRate || 0) * subtotal / 100;
  const total    = subtotal + tax;

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-3">Live preview ({settings.receiptWidth || '80mm'})</p>

      <div className={`mx-auto bg-white text-gray-900 shadow-md rounded-md p-4 font-mono text-[11px] leading-snug ${widthClass}`}>
        {/* ── Logo + header ─────────────────────────────────────────────── */}
        {settings.showLogoOnReceipt !== false && store.logo && (
          <div className={`flex ${logoAlign} mb-2`}>
            <img
              src={ABSOLUTE(store.logo)}
              alt="logo"
              className="h-12 w-auto object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <div className={logoAlign.includes('text-') ? logoAlign : 'text-center'}>
          {settings.receiptHeader && (
            <p className="text-[10px] text-gray-500 mb-0.5">{settings.receiptHeader}</p>
          )}
          <p className="font-bold text-[13px]">{store.storeName}</p>
          {store.address?.street && <p className="text-[10px]">{store.address.street}</p>}
          {store.address?.city   && <p className="text-[10px]">{store.address.city}</p>}
          {store.phone           && <p className="text-[10px]">Tel: {store.phone}</p>}
          {settings.showDLOnReceipt  !== false && store.drugLicenseNumber && <p className="text-[10px]">DL #: {store.drugLicenseNumber}</p>}
          {settings.showGSTOnReceipt !== false && store.gstNumber          && <p className="text-[10px]">GST #: {store.gstNumber}</p>}
        </div>

        <hr className="my-2 border-dashed border-gray-300" />

        {/* ── Meta ──────────────────────────────────────────────────────── */}
        <div className="flex justify-between text-[10px] mb-1">
          <span>Inv: <b>INV-00123</b></span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        <div className="text-[10px] mb-2">Cashier: Demo User</div>

        <hr className="my-2 border-dashed border-gray-300" />

        {/* ── Items ─────────────────────────────────────────────────────── */}
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-dashed border-gray-300">
              <th className="text-left py-1">Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ITEMS.map((it, i) => (
              <tr key={i}>
                <td className="py-1">
                  {it.name}
                  {(settings.showBatchOnReceipt !== false || settings.showExpiryOnReceipt) && (
                    <div className="text-[9px] text-gray-500">
                      {settings.showBatchOnReceipt  !== false && <>B: {it.batch} </>}
                      {settings.showExpiryOnReceipt              && <>· Exp {it.expiry}</>}
                    </div>
                  )}
                </td>
                <td className="text-right">{it.qty}</td>
                <td className="text-right">{it.price}</td>
                <td className="text-right">{(it.qty * it.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="my-2 border-dashed border-gray-300" />

        {/* ── Totals ────────────────────────────────────────────────────── */}
        <div className="space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          {settings.showTaxBreakdown !== false && tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax ({settings.defaultTaxRate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[13px] border-t border-dashed border-gray-300 pt-1 mt-1">
            <span>TOTAL</span><span>{formatCurrency(total)}</span>
          </div>
        </div>

        <hr className="my-2 border-dashed border-gray-300" />

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <p className="text-[9px] text-center text-gray-600">
          {settings.receiptFooter || 'Thank you for your purchase!'}
        </p>
      </div>
    </div>
  );
}
