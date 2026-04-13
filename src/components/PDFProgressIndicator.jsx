import { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PDFProgressIndicator({ isGenerating, progress = 0, status = 'generating' }) {
  const [displayProgress, setDisplayProgress] = useState(progress);

  useEffect(() => {
    setDisplayProgress(progress);
  }, [progress]);

  if (!isGenerating && status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-card border border-border rounded-lg shadow-lg p-4 min-w-80">
      <div className="flex items-center gap-3 mb-3">
        {status === 'generating' && (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
        {status === 'complete' && (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        )}
        {status === 'error' && (
          <AlertCircle className="w-5 h-5 text-destructive" />
        )}
        
        <span className="font-medium text-sm">
          {status === 'generating' && 'Generating PDF...'}
          {status === 'complete' && 'PDF Ready'}
          {status === 'error' && 'PDF Generation Failed'}
        </span>
      </div>

      {status === 'generating' && (
        <>
          <div className="w-full bg-secondary rounded-full h-2 mb-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(displayProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">{Math.round(displayProgress)}%</p>
        </>
      )}

      {status === 'complete' && (
        <p className="text-xs text-muted-foreground">Your PDF is ready to download</p>
      )}

      {status === 'error' && (
        <p className="text-xs text-destructive">Please try again</p>
      )}
    </div>
  );
}