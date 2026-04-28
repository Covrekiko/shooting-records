/**
 * AppUnifiedSheet — thin wrapper around GlobalSheet for backwards compatibility.
 */
import GlobalSheet from './GlobalSheet.jsx';

export default function AppUnifiedSheet({
  open = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeight = '85vh',
  showClose = true,
  closeOnOutside = true,
  closeOnEscape = true,
  isDraggable = true,
}) {
  return (
    <GlobalSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      showClose={showClose}
      closeOnBackdrop={closeOnOutside}
      closeOnEscape={closeOnEscape}
      isDraggable={isDraggable}
      maxHeight={maxHeight}
      footer={footer}
    >
      {children}
    </GlobalSheet>
  );
}