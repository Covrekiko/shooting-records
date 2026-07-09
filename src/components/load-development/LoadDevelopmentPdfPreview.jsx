import { lazy, Suspense } from 'react';

const MobilePdfViewer = lazy(() => import('@/components/MobilePdfViewer'));

export default function LoadDevelopmentPdfPreview({ pdfUrl, onClose }) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <MobilePdfViewer pdfUrl={pdfUrl} onClose={onClose} />
    </Suspense>
  );
}