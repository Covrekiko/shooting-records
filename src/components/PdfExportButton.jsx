import { Download, Eye } from 'lucide-react';
import { useState } from 'react';

export default function PdfExportButton({ onClick, variant = 'icon' }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="p-2 hover:bg-primary-soft text-primary-accent rounded transition-colors disabled:opacity-50"
        title="Download PDF"
      >
        <Download className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="px-3 py-1.5 text-sm bg-primary-soft text-primary-accent hover:bg-primary-soft/80 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
    >
      <Download className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      Export PDF
    </button>
  );
}