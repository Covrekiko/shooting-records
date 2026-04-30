const ICONS_IMAGE_URL = 'https://media.base44.com/images/public/69dcbc84d3696033c82a02c3/6bd803adc_8876AADC-1AA2-456F-93EA-7A4BDF1B531E.png';

const ICON_POSITIONS = {
  target_shooting: '0% 50%',
  clay_shooting: '20% 50%',
  deer_management: '40% 50%',
  stalk_map: '60% 50%',
  reloading: '80% 50%',
};

export default function ModuleIcon({ moduleKey, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`block w-10 h-10 rounded-xl bg-cover bg-no-repeat flex-shrink-0 ${className}`}
      style={{
        backgroundImage: `url(${ICONS_IMAGE_URL})`,
        backgroundPosition: ICON_POSITIONS[moduleKey] || '50% 50%',
        backgroundSize: '620% auto',
      }}
    />
  );
}