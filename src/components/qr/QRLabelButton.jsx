import { useMemo, useState } from 'react';
import { QrCode, Printer } from 'lucide-react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';

function getQrUrl(value, size = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(value)}`;
}

export default function QRLabelButton({ itemType, itemId, title, subtitle }) {
  const [open, setOpen] = useState(false);
  const detailUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/qr-item?type=${encodeURIComponent(itemType)}&id=${encodeURIComponent(itemId)}`;
  }, [itemType, itemId]);

  const printLabel = () => {
    const qrUrl = getQrUrl(detailUrl, 320);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Label - ${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .label { width: 260px; border: 1px solid #111; border-radius: 12px; padding: 14px; text-align: center; }
            img { width: 180px; height: 180px; }
            h1 { font-size: 16px; margin: 8px 0 4px; }
            p { font-size: 11px; margin: 3px 0; color: #333; }
            .type { text-transform: uppercase; letter-spacing: 0.08em; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="label">
            <p class="type">${itemType}</p>
            <img src="${qrUrl}" alt="QR code" />
            <h1>${title}</h1>
            <p>${subtitle || ''}</p>
            <p>Scan in Shooting Records</p>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center justify-center gap-1"
        title="QR label"
      >
        <QrCode className="w-4 h-4" />
      </button>

      <GlobalModal
        open={open}
        onClose={() => setOpen(false)}
        title="QR Label"
        subtitle={title}
        footer={(
          <>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Close</button>
            <button type="button" onClick={printLabel} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
          </>
        )}
      >
        <div className="text-center space-y-4">
          <div className="inline-block bg-white p-4 rounded-2xl border border-border">
            <img src={getQrUrl(detailUrl)} alt="QR code" className="w-56 h-56" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <p className="text-xs text-muted-foreground break-all">{detailUrl}</p>
        </div>
      </GlobalModal>
    </>
  );
}