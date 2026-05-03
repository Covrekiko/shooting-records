import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ChildScreenHeader({ title }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm safe-area-top">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {title && <h1 className="text-lg font-semibold truncate">{title}</h1>}
      </div>
    </header>
  );
}