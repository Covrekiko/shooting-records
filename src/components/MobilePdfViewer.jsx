import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function MobilePdfViewer({ pdfUrl, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pageWidth, setPageWidth] = useState(() => Math.min(window.innerWidth - 32, 780));
  const containerRef = useRef(null);
  const touchStartScale = useRef(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Pinch zoom handler
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      touchStartScale.current = { distance, scale };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartScale.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const ratio = distance / touchStartScale.current.distance;
      let newScale = touchStartScale.current.scale * ratio;
      newScale = Math.max(0.8, Math.min(3, newScale));
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    touchStartScale.current = null;
  };

  const nextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(3, prev + 0.2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.8, prev - 0.2));
  };

  useEffect(() => {
    setLoading(true);
    setScale(1);
  }, [pdfUrl]);

  useEffect(() => {
    const updateWidth = () => {
      const available = containerRef.current?.clientWidth || window.innerWidth;
      setPageWidth(Math.max(280, Math.min(available - 24, 780)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 z-50"
      style={{ paddingTop: 'calc(var(--safe-top) + 8px)', paddingBottom: 'calc(var(--safe-bottom) + 8px)' }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-4xl h-full sm:h-[90vh] max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-16px)] flex flex-col min-h-0 shadow-2xl border border-slate-200/70 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">PDF Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* PDF Container */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-slate-50 dark:bg-slate-900 flex items-start justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pinch-zoom' }}
        >
          <div className="w-full flex justify-center px-3 py-3">
            {loading && (
              <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => { console.error('PDF load error:', err); setLoading(false); }}
              loading={<div className="text-center py-8">Loading PDF...</div>}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={pageWidth}
              />
            </Document>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex-shrink-0 p-3 border-t border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>
          {/* Page Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 flex-1">
              {numPages ? `Page ${currentPage} of ${numPages}` : 'Loading...'}
            </div>
            <button
              onClick={nextPage}
              disabled={!numPages || currentPage === numPages}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 w-12 text-center">
              {Math.round(scale * 100)}%
            </div>
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-colors text-sm font-medium active:scale-95"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}