/**
 * Core app pages are never module-blocked.
 * Admin/user access is handled separately by admin-only pages.
 */
export default function ModuleGate({ children }) {
  return children;
}