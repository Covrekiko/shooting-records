/**
 * BaseModal — now delegates to GlobalModal for consistent behaviour.
 */
import GlobalModal from '@/components/ui/GlobalModal.jsx';

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
}) {
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-2xl' };

  // Build footer from actions array (legacy API)
  let footer;
  if (actions && actions.length > 0) {
    footer = (
      <>
        {actions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={action.onClick}
            className={`flex-1 h-11 rounded-xl font-semibold text-sm transition-colors active:scale-95 ${
              action.variant === 'primary'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : action.variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {action.label}
          </button>
        ))}
      </>
    );
  } else {
    footer = null;
  }

  return (
    <GlobalModal
      open={isOpen}
      onClose={onClose}
      title={title}
      showClose={showCloseButton}
      closeOnBackdrop={closeOnBackdropClick}
      maxWidth={sizeMap[size] || 'max-w-md'}
      footer={footer}
    >
      {children}
    </GlobalModal>
  );
}