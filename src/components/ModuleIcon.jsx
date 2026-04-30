const ICONS_IMAGE_URL = 'https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/6bd803adc_8876AADC-1AA2-456F-93EA-7A4BDF1B531E.png';

const ICON_POSITIONS = {
  target_shooting: '-11px -59px',
  clay_shooting: '-52px -59px',
  deer_management: '-98px -59px',
  stalk_map: '-141px -59px',
  reloading: '-184px -59px',
};

export default function ModuleIcon({ moduleKey, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`block w-10 h-10 rounded-xl bg-no-repeat flex-shrink-0 ${className}`}
      style={{
        backgroundImage: `url(${ICONS_IMAGE_URL})`,
        backgroundPosition: ICON_POSITIONS[moduleKey] || '-11px -59px',
        backgroundSize: '273px auto',
      }}
    />
  );
}