/**
 * AppFormModal — thin wrapper around GlobalModal for backwards compatibility.
 * All new code should import GlobalModal directly.
 */
import GlobalModal from './GlobalModal.jsx';

export default function AppFormModal({
  open = false,
  onClose,
  onSubmit,
  title,
  subtitle,
  children,
  primaryAction = 'Save',
  secondaryAction = 'Cancel',
  isLoading = false,
  isDangerous = false,
  showClose = true,
  closeOnEscape = true,
  width = '560px',
}) {
  return (
    <GlobalModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title={title}
      subtitle={subtitle}
      showClose={showClose}
      closeOnEscape={closeOnEscape}
      closeOnBackdrop={false}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      isLoading={isLoading}
      isDangerous={isDangerous}
      maxWidth="max-w-xl"
    >
      {children}
    </GlobalModal>
  );
}