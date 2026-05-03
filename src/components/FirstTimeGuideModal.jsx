import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { CheckCircle2 } from 'lucide-react';

export default function FirstTimeGuideModal({ open, title, description, steps = [], onContinue }) {
  return (
    <GlobalModal
      open={open}
      onClose={onContinue}
      title={title}
      subtitle={description}
      primaryAction="Got it"
      secondaryAction="Close"
      maxWidth="max-w-sm"
      footer={(
        <button
          type="button"
          onClick={onContinue}
          className="w-full h-11 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
        >
          Got it
        </button>
      )}
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Step-by-step</p>
          <ol className="space-y-2.5">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-2.5 text-sm text-foreground leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <span>This guide is shown once on this device and won’t interrupt this feature again.</span>
        </div>
      </div>
    </GlobalModal>
  );
}