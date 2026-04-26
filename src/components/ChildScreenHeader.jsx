import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { T } from '@/lib/theme';

export default function ChildScreenHeader({ title }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40" style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg transition-colors"
          style={{ color: T.bronze }}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {title && <h1 className="text-lg font-semibold truncate" style={{ color: T.text }}>{title}</h1>}
      </div>
    </header>
  );
}