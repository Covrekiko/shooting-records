import GlobalModal from '@/components/ui/GlobalModal.jsx';
import useFirstTimeGuide from '@/hooks/useFirstTimeGuide';
import { CheckCircle2 } from 'lucide-react';

export default function FirstTimeGuideModal({ guideKey, title, description, steps, onContinue }) {
  const { shouldShow, markSeen } = useFirstTimeGuide(guideKey);

  if (!shouldShow) return null;

  const handleContinue = () => {
    markSeen();
    onContinue?.();
  };

  return (
    <GlobalModal
      open={true}
      onClose={handleContinue}
      title={title}
      subtitle={description}
      showClose={true}
      maxWidth="max-w-sm"
      footer={(
        <button
          type="button"
          onClick={handleContinue}
          className="w-full h-11 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
        >
          Got it
        </button>
      )}
    >
      <div className="space-y-3">
        <div className="mx-auto w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
              <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {index + 1}
              </span>
              <span className="min-w-0">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </GlobalModal>
  );
}