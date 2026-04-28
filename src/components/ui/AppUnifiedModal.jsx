/**
 * AppUnifiedModal — thin wrapper around GlobalModal for backwards compatibility.
 */
import GlobalModal from './GlobalModal.jsx';

export default function AppUnifiedModal({
  open = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '420px',
  showClose = true,
  closeOnOutside = true,
  closeOnEscape = true,
}) {
  return (
    <GlobalModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      showClose={showClose}
      closeOnBackdrop={closeOnOutside}
      closeOnEscape={closeOnEscape}
      footer={footer}
      maxWidth="max-w-md"
    >
      {children}
    </GlobalModal>
  );
}