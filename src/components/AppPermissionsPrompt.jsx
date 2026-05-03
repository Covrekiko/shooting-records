import { useEffect, useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import AppPermissionsPanel from '@/components/AppPermissionsPanel';
import { base44 } from '@/api/base44Client';
import { getStoredPermissionStatus, markPermissionsPromptSeen } from '@/lib/appPermissions';

export default function AppPermissionsPrompt({ user }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const status = getStoredPermissionStatus(user.email);
    const shouldShow = user.permissionsPromptSeen !== true && !status.promptSeen;
    setOpen(shouldShow);
    if (shouldShow) {
      markPermissionsPromptSeen(user.email);
      base44.auth.updateMe({ permissionsPromptSeen: true });
    }
  }, [user?.email, user?.permissionsPromptSeen]);

  const closePrompt = () => {
    markPermissionsPromptSeen(user.email);
    base44.auth.updateMe({ permissionsPromptSeen: true });
    setOpen(false);
  };

  if (!user?.email) return null;

  return (
    <GlobalModal
      open={open}
      onClose={closePrompt}
      title="App Permissions"
      maxWidth="max-w-lg"
      footer={(
        <button
          type="button"
          onClick={closePrompt}
          className="w-full h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-95"
        >
          Not Now
        </button>
      )}
    >
      <AppPermissionsPanel userEmail={user.email} compact onActionComplete={closePrompt} />
    </GlobalModal>
  );
}