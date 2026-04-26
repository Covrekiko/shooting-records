/**
 * Shared tactical dark theme constants.
 * Import and use in page/component inline styles where Tailwind classes can't reach.
 */
export const T = {
  bg: '#0B0F0E',
  card: '#151A18',
  panel: '#1E2421',
  border: '#2E3732',
  bronze: '#C79A45',
  bronzeDark: '#8A6A35',
  bronzeLight: '#D4AD6A',
  text: '#F2F2EF',
  muted: '#A8ADA7',
  success: '#4CAF50',
  warning: '#D99A32',
  danger: '#B84A3A',
};

export const cardStyle = {
  background: T.card,
  border: `1px solid ${T.border}`,
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
};

export const panelStyle = {
  background: T.panel,
  border: `1px solid ${T.border}`,
};

export const inputStyle = {
  background: T.card,
  border: `1px solid ${T.border}`,
  color: T.text,
  borderRadius: '0.75rem',
  padding: '0.5rem 0.75rem',
  outline: 'none',
  width: '100%',
  fontSize: '0.875rem',
};

export const primaryButtonStyle = {
  background: T.bronze,
  color: T.bg,
  border: 'none',
  borderRadius: '0.75rem',
  padding: '0.6rem 1.25rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
};