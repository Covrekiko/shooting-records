/**
 * ModalShell — now delegates to GlobalSheet for consistent behaviour.
 * Kept as a thin wrapper for backwards compatibility.
 */
import GlobalSheet from '@/components/ui/GlobalSheet.jsx';

export default function ModalShell({ title, onClose, footer, children, maxWidth = 'sm:max-w-md' }) {
  return (
    <GlobalSheet
      open={true}
      onClose={onClose}
      title={title}
      footer={footer}
      isDraggable={true}
    >
      {children}
    </GlobalSheet>
  );
}