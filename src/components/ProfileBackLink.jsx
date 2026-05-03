import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ProfileBackLink({ className = '' }) {
  const location = useLocation();

  if (location.state?.from !== 'profile') return null;

  return (
    <Link
      to="/profile"
      className={`inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Profile
    </Link>
  );
}