/**
 * AppModal — thin wrapper around GlobalModal for backwards compatibility.
 * All new code should import GlobalModal directly.
 */
import GlobalModal from './GlobalModal.jsx';

export default function AppModal({
  open = false,
  onClose,
  title,
  children,
  footer,
  width = '420px',
  showClose = true,
  closeOnOutsideClick = true,
  closeOnEscape = true,
}) {
  return (
    <GlobalModal
      open={open}
      onClose={onClose}
      title={title}
      showClose={showClose}
      closeOnBackdrop={closeOnOutsideClick}
      closeOnEscape={closeOnEscape}
      footer={footer}
      maxWidth="max-w-md"
    >
      {children}
    </GlobalModal>
  );
}